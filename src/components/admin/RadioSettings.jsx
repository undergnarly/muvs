import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { MENU_ARTWORK } from '../../data/menuArtwork';
import { RADIO_STATIONS } from '../../data/radio';
import { RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS, upgradeRadioShadowProfiles } from '../../utils/radioShadows';
import { normalizeVisualEffects } from '../../utils/visualEffects';
import Button from '../ui/Button';
import { buildRadioShadowPatch, createRadioShadowDraft, radioShadowProfileEqual, resolveRadioShadowDraftProfiles, validateRadioShadowDraft } from './radioShadowsAdminHelpers';
import { formatVisualNumber } from './visualEffectsAdminHelpers';
import './VisualEffectsSettings.css';
import './RadioSettings.css';

const FIELDS = [
    { key: 'length', label: 'Длина тени', step: .05, unit: '×', hint: '1× — длина, равная высоте приёмника. Диапазон: 0,1–6×.' },
    { key: 'offsetX', label: 'Сдвиг влево / вправо (X)', step: .01, unit: '', hint: 'Минус — влево, плюс — вправо. 0 — без бокового сдвига; диапазон: −6–6 единиц сцены.' },
    { key: 'depthOffset', label: 'Сдвиг ближе / дальше', step: .01, unit: '', hint: 'Плюс — дальше, за приёмник. Минус — ближе к камере. 1 — сдвиг на высоту приёмника; диапазон: −5–5.' },
    { key: 'directionDegrees', label: 'Направление тени', step: 1, unit: '°', hint: 'Поворот тени по полу. Полный круг — 360°.' },
    { key: 'opacity', label: 'Непрозрачность', step: .01, unit: '', hint: '0 — невидимая тень, 1 — максимальная непрозрачность.' },
    { key: 'blur', label: 'Размытие', step: .01, unit: '', hint: '0 — чёткий контур, 1 — самое мягкое размытие.' },
];

function ShadowField({ prefix, target, field, value, error, onChange }) {
    const id = `${prefix}-${target}-${field.key}`;
    const [minimum, maximum] = RADIO_SHADOW_LIMITS[field.key];
    const finiteValue = Number(value);
    const rangeValue = Number.isFinite(finiteValue) ? Math.min(maximum, Math.max(minimum, finiteValue)) : minimum;
    const descriptions = `${id}-hint${error ? ` ${id}-error` : ''}`;
    return <div className="ves-field rs-shadow-field">
        <label htmlFor={id}>{field.label}<span className="ves-unit">{field.unit}</span></label>
        <div className="rs-value-controls">
            <input type="range" min={minimum} max={maximum} step={field.step} value={rangeValue}
                aria-label={`${field.label} — ползунок`} aria-describedby={descriptions}
                aria-valuetext={`${formatVisualNumber(rangeValue)}${field.unit}`}
                onChange={event => onChange(field.key, event.target.valueAsNumber)} />
            <input id={id} data-radio-field={field.key} type="number" inputMode="decimal" min={minimum} max={maximum} step={field.step}
                value={value} required aria-invalid={Boolean(error)} aria-describedby={descriptions}
                onChange={event => onChange(field.key, event.target.value)} />
        </div>
        <small id={`${id}-hint`} className="ves-hint">{field.hint}</small>
        {error && <p id={`${id}-error`} className="ves-field-error">{error}</p>}
    </div>;
}

function RadioShadowEditor({ initialValue, globalShadows, updateSiteSettings }) {
    const [draft, setDraft] = useState(() => createRadioShadowDraft(upgradeRadioShadowProfiles(initialValue)));
    const [saved, setSaved] = useState(() => createRadioShadowDraft(upgradeRadioShadowProfiles(initialValue)));
    const [target, setTarget] = useState('all');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const prefix = useId();
    const formRef = useRef(null);
    const mounted = useRef(false);
    const inFlight = useRef(false);
    const focusField = useRef(null);
    const initialized = useRef(new Set(RADIO_SHADOW_TARGETS.filter(({ id }) => draft[id].custom).map(({ id }) => id)));
    const errors = useMemo(() => validateRadioShadowDraft(draft), [draft]);
    const dirtyTargets = RADIO_SHADOW_TARGETS.filter(({ id }) => !radioShadowProfileEqual(draft[id], saved[id]));
    const dirty = dirtyTargets.length > 0;
    const invalid = Object.keys(errors).length > 0;
    const selected = draft[target];
    const effective = resolveRadioShadowDraftProfiles(draft, globalShadows);
    const station = RADIO_STATIONS.find(item => item.slug === target);
    const artwork = station?.coverImage || MENU_ARTWORK[4];
    const targetLabel = RADIO_SHADOW_TARGETS.find(item => item.id === target).label;
    const displayed = selected.custom ? { ...effective[target], ...selected } : effective[target];
    const common = target === 'all';
    const customReceivers = RADIO_SHADOW_TARGETS.filter(({ id }) => id !== 'all' && draft[id].custom);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    useEffect(() => {
        if (!focusField.current) return;
        formRef.current?.querySelector(`[data-radio-field="${focusField.current}"]`)?.focus();
        focusField.current = null;
    }, [target]);

    const change = (field, value) => {
        setDraft(current => ({ ...current, [target]: { ...current[target], [field]: value } }));
        setFeedback(null);
    };
    const toggleCustom = (custom) => {
        const initialize = custom && !initialized.current.has(target);
        setDraft(current => ({
            ...current,
            [target]: initialize
                ? { ...resolveRadioShadowDraftProfiles(current, globalShadows)[target], custom: true }
                : { ...current[target], custom },
        }));
        if (custom) initialized.current.add(target);
        setFeedback(null);
    };
    const cancel = () => {
        setDraft(createRadioShadowDraft(saved));
        initialized.current = new Set(RADIO_SHADOW_TARGETS.filter(({ id }) => saved[id].custom).map(({ id }) => id));
        setFeedback({ kind: 'note', text: 'Несохранённые изменения отменены.' });
    };
    const save = async event => {
        event.preventDefault();
        if (inFlight.current || !dirty) return;
        if (invalid) {
            const [invalidTarget, invalidField] = Object.keys(errors)[0].split('.');
            const label = RADIO_SHADOW_TARGETS.find(item => item.id === invalidTarget).label;
            setFeedback({ kind: 'error', text: `Исправьте отмеченные значения: ${label}. Изменения пока не сохранены.` });
            if (target === invalidTarget) formRef.current?.querySelector(`[data-radio-field="${invalidField}"]`)?.focus();
            else { focusField.current = invalidField; setTarget(invalidTarget); }
            return;
        }
        const patch = buildRadioShadowPatch(draft, saved);
        const next = createRadioShadowDraft({ ...saved, ...patch });
        inFlight.current = true;
        setSaving(true);
        setFeedback(null);
        try {
            const result = await updateSiteSettings({ radioShadows: patch });
            if (!mounted.current) return;
            const confirmed = result.radioShadows ? createRadioShadowDraft(upgradeRadioShadowProfiles(result.radioShadows)) : next;
            setDraft(confirmed);
            setSaved(confirmed);
            initialized.current = new Set(RADIO_SHADOW_TARGETS.filter(({ id }) => confirmed[id].custom).map(({ id }) => id));
            setFeedback({ kind: 'success', text: 'Настройки теней Radio сохранены. Обновите страницу сайта, чтобы увидеть изменения.' });
        } catch {
            if (mounted.current) setFeedback({ kind: 'error', text: 'Не удалось сохранить настройки. Изменения остались в форме; попробуйте ещё раз.' });
        } finally {
            inFlight.current = false;
            if (mounted.current) setSaving(false);
        }
    };

    return <section className="visual-effects-settings radio-settings" lang="ru" aria-labelledby={`${prefix}-title`} data-dirty={dirty}>
        <header className="ves-header">
            <div><h2 id={`${prefix}-title`}>Radio — тени приёмников</h2><p>Настройте весь раздел сразу или задайте отдельную тень для меню и каждой эпохи.</p></div>
            <Button href={station ? `/radio?item=${station.slug}` : common ? '/radio?item=roots' : '/'} variant="outline" className="ves-site-link"
                aria-label={`Открыть ${station ? station.title : common ? 'раздел Radio' : 'главное меню'} в новой вкладке`}>Открыть на сайте</Button>
        </header>
        <p className="ves-apply-note">После сохранения обновите открытую страницу сайта. Настройки здесь меняют только Radio, а не другие разделы.</p>
        <form ref={formRef} onSubmit={save} noValidate aria-busy={saving} aria-describedby={`${prefix}-save-status`}>
            <fieldset className="rs-target-group" disabled={saving}>
                <legend className="rs-visually-hidden">Выбор области настройки</legend>
                <div className="ves-field rs-target-field">
                    <label htmlFor={`${prefix}-target`}>Область настройки</label>
                    <select id={`${prefix}-target`} value={target} aria-describedby={`${prefix}-target-hint`}
                        onChange={event => setTarget(event.target.value)}>
                        {RADIO_SHADOW_TARGETS.map(item => <option key={item.id} value={item.id}>{item.label}{dirtyTargets.some(changed => changed.id === item.id) ? ' — изменено' : ''}</option>)}
                    </select>
                    <small id={`${prefix}-target-hint`} className="ves-hint">«Весь раздел Radio» — меню и все три эпохи, кроме приёмников со своими настройками. Переключение не сбрасывает изменения.</small>
                </div>
                <img className="rs-receiver-image" src={artwork} width="112" height="112" alt="" />
            </fieldset>
            <fieldset className="ves-group rs-profile-group" disabled={saving}>
                <legend>{targetLabel}</legend>
                <label className="ves-toggle rs-custom-toggle"><input type="checkbox" checked={selected.custom}
                    aria-describedby={`${prefix}-inheritance-help`} onChange={event => toggleCustom(event.target.checked)} />
                    <span>{common ? 'Своя тень для всего раздела Radio' : 'Своя тень для этого приёмника'}</span></label>
                <p id={`${prefix}-inheritance-help`} className="ves-caption-help">{selected.custom
                    ? common ? 'Эти параметры применяются к меню и всем эпохам без своих настроек.' : 'Эти параметры заменяют общие настройки Radio только у выбранного приёмника.'
                    : common ? 'Используются тени из «Настройки → Визуальный стиль». Включите настройку выше, чтобы отдельно оформить весь раздел Radio.' : 'Используются настройки «Весь раздел Radio», а если они не заданы — общие настройки сайта.'}</p>
                {common && customReceivers.length > 0 && <p className="rs-override-note">Своя тень: {customReceivers.map(item => item.label.split(' — ')[0]).join(', ')}. Чтобы применить к ним общую тень Radio, выберите каждый приёмник и выключите «Своя тень».</p>}
                <fieldset className="ves-editor rs-shadow-fields" disabled={!selected.custom || saving}>
                    <legend className="rs-visually-hidden">Параметры тени</legend>
                    <label className="ves-toggle rs-enabled-toggle"><input type="checkbox" data-radio-field="enabled" checked={Boolean(displayed.enabled)}
                        aria-invalid={Boolean(errors[`${target}.enabled`])} aria-describedby={errors[`${target}.enabled`] ? `${prefix}-enabled-error` : undefined}
                        onChange={event => change('enabled', event.target.checked)} /><span>Показывать тень</span></label>
                    {errors[`${target}.enabled`] && <p id={`${prefix}-enabled-error`} className="ves-field-error">{errors[`${target}.enabled`]}</p>}
                    {FIELDS.map(field => <ShadowField key={field.key} prefix={prefix} target={target} field={field}
                        value={displayed[field.key]} error={errors[`${target}.${field.key}`]} onChange={change} />)}
                </fieldset>
            </fieldset>
            <div className="ves-save-area">
                <div id={`${prefix}-save-status`} className={`ves-save-status${feedback ? ` is-${feedback.kind}` : ''}`}
                    role={feedback?.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
                    {saving ? 'Сохраняем настройки…' : feedback?.text || (invalid
                        ? 'Исправьте отмеченные значения. При сохранении откроется первый приёмник с ошибкой.'
                        : dirty ? `Есть несохранённые изменения. Областей: ${dirtyTargets.length}.` : 'Все изменения сохранены.')}
                </div>
                <div className="ves-actions">
                    <Button type="submit" variant="accent" disabled={saving || !dirty} aria-describedby={`${prefix}-save-status`}>{saving ? 'Сохраняем…' : 'Сохранить изменения'}</Button>
                    <Button variant="outline" onClick={cancel} disabled={saving || !dirty}>Отменить изменения</Button>
                </div>
            </div>
        </form>
    </section>;
}

export default function RadioSettings() {
    const { siteSettings, updateSiteSettings, isLoaded, siteSettingsReady } = useData();
    if (!isLoaded) return <section className="visual-effects-settings" lang="ru" aria-busy="true"><h2>Radio — тени приёмников</h2><p role="status">Загружаем сохранённые настройки…</p></section>;
    if (!siteSettingsReady) return <section className="visual-effects-settings" lang="ru"><h2>Radio — тени приёмников</h2><p role="alert">Не удалось загрузить сохранённые настройки. Обновите страницу, чтобы не потерять текущие параметры.</p><Button variant="outline" onClick={() => window.location.reload()}>Загрузить настройки заново</Button></section>;
    return <RadioShadowEditor initialValue={siteSettings?.radioShadows} globalShadows={normalizeVisualEffects(siteSettings?.visualEffects).shadows} updateSiteSettings={updateSiteSettings} />;
}

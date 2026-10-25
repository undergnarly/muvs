import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { MENU_ARTWORK } from '../../data/menuArtwork';
import { RADIO_STATIONS } from '../../data/radio';
import { RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS, normalizeRadioShadowProfiles } from '../../utils/radioShadows';
import { normalizeVisualEffects } from '../../utils/visualEffects';
import Button from '../ui/Button';
import { buildRadioShadowPatch, radioShadowProfileEqual, validateRadioShadowDraft } from './radioShadowsAdminHelpers';
import { formatVisualNumber } from './visualEffectsAdminHelpers';
import './VisualEffectsSettings.css';
import './RadioSettings.css';

const FIELDS = [
    { key: 'length', label: 'Длина тени', step: .05, unit: '×', hint: '1× — длина, равная высоте приёмника. Диапазон: 0,1–3×.' },
    { key: 'offsetX', label: 'Сдвиг влево / вправо (X)', step: .01, unit: '', hint: 'Минус — влево, плюс — вправо. 0 — без бокового сдвига; диапазон: −3–3 единицы сцены.' },
    { key: 'depthOffset', label: 'Сдвиг ближе / дальше', step: .01, unit: '', hint: 'Плюс — дальше, за приёмник. Минус — ближе к камере. 0,1 — сдвиг на 10% высоты приёмника; диапазон: −1–1.' },
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
    const [draft, setDraft] = useState(() => normalizeRadioShadowProfiles(initialValue));
    const [saved, setSaved] = useState(() => normalizeRadioShadowProfiles(initialValue));
    const [target, setTarget] = useState('menu');
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
    const station = RADIO_STATIONS.find(item => item.slug === target);
    const artwork = station?.coverImage || MENU_ARTWORK[4];
    const targetLabel = RADIO_SHADOW_TARGETS.find(item => item.id === target).label;
    const displayed = selected.custom ? selected : { ...globalShadows, offsetX: 0 };

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
                ? { custom: true, length: globalShadows.length, offsetX: 0, depthOffset: globalShadows.depthOffset }
                : { ...current[target], custom },
        }));
        if (custom) initialized.current.add(target);
        setFeedback(null);
    };
    const cancel = () => {
        setDraft(normalizeRadioShadowProfiles(saved));
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
        const next = normalizeRadioShadowProfiles({ ...saved, ...patch });
        inFlight.current = true;
        setSaving(true);
        setFeedback(null);
        try {
            const result = await updateSiteSettings({ radioShadows: patch });
            if (!mounted.current) return;
            const confirmed = result.radioShadows ? normalizeRadioShadowProfiles(result.radioShadows) : next;
            setDraft(confirmed);
            setSaved(confirmed);
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
            <div><h2 id={`${prefix}-title`}>Radio — тени приёмников</h2><p>Настройте длину и положение тени отдельно для главного меню и каждой эпохи.</p></div>
            <Button href={station ? `/radio?item=${station.slug}` : '/'} variant="outline" className="ves-site-link"
                aria-label={`Открыть ${station ? station.title : 'главное меню'} в новой вкладке`}>Открыть на сайте</Button>
        </header>
        <p className="ves-apply-note">После сохранения обновите открытую страницу сайта. Направление, размытие и непрозрачность остаются общими — <Link to="/admin/settings">Настройки → Визуальный стиль</Link>.</p>
        {!globalShadows.enabled && <p className="rs-global-note">Тени сейчас выключены в общих настройках. Включите их в «Визуальном стиле», чтобы увидеть результат.</p>}
        <form ref={formRef} onSubmit={save} noValidate aria-busy={saving} aria-describedby={`${prefix}-save-status`}>
            <fieldset className="rs-target-group" disabled={saving}>
                <legend className="rs-visually-hidden">Выбор приёмника</legend>
                <div className="ves-field rs-target-field">
                    <label htmlFor={`${prefix}-target`}>Приёмник</label>
                    <select id={`${prefix}-target`} value={target} aria-describedby={`${prefix}-target-hint`}
                        onChange={event => setTarget(event.target.value)}>
                        {RADIO_SHADOW_TARGETS.map(item => <option key={item.id} value={item.id}>{item.label}{dirtyTargets.some(changed => changed.id === item.id) ? ' — изменено' : ''}</option>)}
                    </select>
                    <small id={`${prefix}-target-hint`} className="ves-hint">Можно изменить несколько приёмников и сохранить всё одной кнопкой. Переключение не сбрасывает изменения.</small>
                </div>
                <img className="rs-receiver-image" src={artwork} width="112" height="112" alt="" />
            </fieldset>
            <fieldset className="ves-group rs-profile-group" disabled={saving}>
                <legend>{targetLabel}</legend>
                <label className="ves-toggle rs-custom-toggle"><input type="checkbox" checked={selected.custom}
                    aria-describedby={`${prefix}-inheritance-help`} onChange={event => toggleCustom(event.target.checked)} />
                    <span>Своя длина и положение тени</span></label>
                <p id={`${prefix}-inheritance-help`} className="ves-caption-help">{selected.custom
                    ? 'Эти три параметра применяются только к выбранному приёмнику. Выключите настройку, чтобы вернуть общие значения.'
                    : 'Используются общие значения. Включите настройку выше, чтобы отдельно сдвинуть или укоротить тень этого приёмника.'}</p>
                <fieldset className="ves-editor rs-shadow-fields" disabled={!selected.custom || saving}>
                    <legend className="rs-visually-hidden">Длина и положение тени</legend>
                    {FIELDS.map(field => <ShadowField key={field.key} prefix={prefix} target={target} field={field}
                        value={displayed[field.key]} error={errors[`${target}.${field.key}`]} onChange={change} />)}
                </fieldset>
            </fieldset>
            <div className="ves-save-area">
                <div id={`${prefix}-save-status`} className={`ves-save-status${feedback ? ` is-${feedback.kind}` : ''}`}
                    role={feedback?.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
                    {saving ? 'Сохраняем настройки…' : feedback?.text || (invalid
                        ? 'Исправьте отмеченные значения. При сохранении откроется первый приёмник с ошибкой.'
                        : dirty ? `Есть несохранённые изменения. Приёмников: ${dirtyTargets.length}.` : 'Все изменения сохранены.')}
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

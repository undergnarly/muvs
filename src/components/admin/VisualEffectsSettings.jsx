import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from '../../utils/visualEffects';
import Button from '../ui/Button';
import { formatVisualNumber, validateVisualEffectsDraft, visualEffectsDraftEqual } from './visualEffectsAdminHelpers';
import './VisualEffectsSettings.css';

const GROUPS = [
    { key: 'transition', title: 'Переходы', toggle: 'Включить плёнку при переходах', help: 'Плёнка появляется вместе с переходом и остаётся, пока движется камера.' },
    { key: 'lightLeaks', title: 'Световые засветки', toggle: 'Включить световые засветки', help: 'Короткие цветные блики между переходами. Интервал выбирается случайно в заданном диапазоне.' },
    { key: 'filmDust', title: 'Пыль и царапины', toggle: 'Включить пыль и царапины', help: 'Плёночная текстура появляется отдельно от засветок, со своим случайным интервалом.' },
    { key: 'handheld', title: 'Живая камера', toggle: 'Включить живую камеру', help: 'Мягкое движение камеры на 3D-страницах, в том числе когда вы не листаете сайт.' },
];

function NumberField({ prefix, group, field, label, unit, step = .1, hint, draft, errors, onChange }) {
    const id = `${prefix}-${group}-${field}`;
    const [minimum, maximum] = VISUAL_EFFECTS_LIMITS[group][field];
    const error = errors[`${group}.${field}`];
    return <div className="ves-field">
        <label htmlFor={id}>{label}<span className="ves-unit">{unit}</span></label>
        <input id={id} type="number" inputMode={step < 1 ? 'decimal' : 'numeric'} min={minimum} max={maximum} step={step}
            value={draft[group][field]} required aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
            onChange={event => onChange(group, field, event.target.value)} />
        <small id={`${id}-hint`} className="ves-hint">{hint || `От ${formatVisualNumber(minimum)} до ${formatVisualNumber(maximum)} ${unit}.`}</small>
        {error && <p id={`${id}-error`} className="ves-field-error">{error}</p>}
    </div>;
}

function RangeField({ prefix, group, field, label, draft, errors, onChange, percent = false, hint }) {
    const id = `${prefix}-${group}-${field}`;
    const scale = percent ? 100 : 1;
    const [minimum, maximum] = VISUAL_EFFECTS_LIMITS[group][field];
    const value = Number(draft[group][field]);
    const valueText = `${formatVisualNumber(value * scale)}${percent ? '%' : '×'}`;
    const error = errors[`${group}.${field}`];
    return <div className="ves-field ves-range-field">
        <div className="ves-range-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{valueText}</output></div>
        <input id={id} type="range" min={minimum * scale} max={maximum * scale} step={percent ? 1 : .1}
            value={value * scale} aria-valuetext={valueText} aria-invalid={Boolean(error)}
            aria-describedby={hint || error ? `${hint ? `${id}-hint` : ''}${error ? ` ${id}-error` : ''}`.trim() : undefined}
            onChange={event => onChange(group, field, event.target.valueAsNumber / scale)} />
        {hint && <small id={`${id}-hint`} className="ves-hint">{hint}</small>}
        {error && <p id={`${id}-error`} className="ves-field-error">{error}</p>}
    </div>;
}

function VisualEffectsEditor({ initialValue, updateSiteSettings }) {
    const [draft, setDraft] = useState(() => normalizeVisualEffects(initialValue));
    const [saved, setSaved] = useState(() => normalizeVisualEffects(initialValue));
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const formRef = useRef(null);
    const mounted = useRef(false);
    const inFlight = useRef(false);
    const prefix = useId();
    const errors = useMemo(() => validateVisualEffectsDraft(draft), [draft]);
    const invalid = Object.keys(errors).length > 0;
    const dirty = !visualEffectsDraftEqual(draft, saved);
    const atDefaults = visualEffectsDraftEqual(draft, VISUAL_EFFECTS_DEFAULTS);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const change = (group, field, value) => {
        setDraft(current => ({ ...current, [group]: { ...current[group], [field]: value } }));
        setFeedback(null);
    };
    const reset = () => {
        setDraft(normalizeVisualEffects());
        setFeedback({ kind: 'note', text: visualEffectsDraftEqual(VISUAL_EFFECTS_DEFAULTS, saved)
            ? 'Изменения отменены: исходные параметры уже сохранены.'
            : 'Исходные параметры восстановлены в форме. Нажмите «Сохранить изменения», чтобы применить их.' });
    };
    const save = async (event) => {
        event.preventDefault();
        if (inFlight.current || !dirty) return;
        if (invalid) {
            setFeedback({ kind: 'error', text: 'Исправьте отмеченные значения. Изменения пока не сохранены.' });
            formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        const next = normalizeVisualEffects(draft);
        inFlight.current = true;
        setSaving(true);
        setFeedback(null);
        try {
            await updateSiteSettings({ visualEffects: next });
            if (!mounted.current) return;
            setDraft(next);
            setSaved(next);
            setFeedback({ kind: 'success', text: 'Настройки визуального стиля сохранены.' });
        } catch {
            if (mounted.current) setFeedback({ kind: 'error', text: 'Не удалось сохранить настройки. Изменения остались в форме; попробуйте ещё раз.' });
        } finally {
            inFlight.current = false;
            if (mounted.current) setSaving(false);
        }
    };
    const fields = { prefix, draft, errors, onChange: change };

    return <section className="visual-effects-settings" lang="ru" aria-labelledby={`${prefix}-title`} data-dirty={dirty}>
        <header className="ves-header">
            <div><h2 id={`${prefix}-title`}>Визуальный стиль</h2><p>Камера — на 3D-страницах, плёночные эффекты — также в Dubplates. Экономия трафика и уменьшение движения всегда учитываются.</p></div>
            <Button href="/" variant="outline" className="ves-site-link" aria-label="Открыть сайт в новой вкладке">Открыть сайт</Button>
        </header>
        <p className="ves-apply-note">После сохранения обновите открытую страницу сайта. Переходы имеют приоритет: фоновые вставки могут появиться позже заданного интервала.</p>
        <form ref={formRef} onSubmit={save} noValidate aria-busy={saving} aria-describedby={`${prefix}-save-status`}>
            <div className="ves-editor">
                {GROUPS.map(group => <fieldset key={group.key} className="ves-group" disabled={saving}>
                    <legend>{group.title}</legend>
                    <div className="ves-group-top">
                        <p id={`${prefix}-${group.key}-help`}>{group.help}</p>
                        <label className="ves-toggle"><input type="checkbox" checked={draft[group.key].enabled}
                            onChange={event => change(group.key, 'enabled', event.target.checked)}
                            aria-label={group.toggle} aria-describedby={`${prefix}-${group.key}-help`} /><span>Включить</span></label>
                    </div>
                    <div className="ves-fields">
                        {group.key === 'transition' && <>
                            <NumberField {...fields} group="transition" field="durationSeconds" label="Длительность перехода" unit="с" hint="Время движения камеры в 3D: от 0,2 до 3 с." />
                            <RangeField {...fields} group="transition" field="opacity" label="Непрозрачность плёнки" percent />
                            <NumberField {...fields} group="transition" field="fadeOutMs" label="Затухание после остановки" unit="мс" step={10} />
                        </>}
                        {(group.key === 'lightLeaks' || group.key === 'filmDust') && <>
                            <NumberField {...fields} group={group.key} field="durationSeconds" label={group.key === 'lightLeaks' ? 'Длительность засветки' : 'Длительность текстуры'} unit="с" />
                            <RangeField {...fields} group={group.key} field="opacity" label={group.key === 'lightLeaks' ? 'Непрозрачность засветок' : 'Непрозрачность пыли и царапин'} percent />
                            <NumberField {...fields} group={group.key} field="intervalMinSeconds" label="Минимальный интервал" unit="с" step={1} />
                            <NumberField {...fields} group={group.key} field="intervalMaxSeconds" label="Максимальный интервал" unit="с" step={1} />
                        </>}
                        {group.key === 'handheld' && <>
                            <RangeField {...fields} group="handheld" field="strength" label="Сила движения" hint="1× — текущая сила движения; 0× — неподвижная камера." />
                            <NumberField {...fields} group="handheld" field="speed" label="Скорость движения" unit="×" step={.05} hint="1× — текущая скорость. Диапазон: 0,25–3×." />
                        </>}
                    </div>
                </fieldset>)}
            </div>
            <div className="ves-save-area">
                <div id={`${prefix}-save-status`} className={`ves-save-status${feedback ? ` is-${feedback.kind}` : ''}`}
                    role={feedback?.kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
                    {saving ? 'Сохраняем настройки…' : feedback?.text || (invalid ? 'Исправьте отмеченные значения перед сохранением.' : dirty ? 'Есть несохранённые изменения.' : 'Все изменения сохранены.')}
                </div>
                <div className="ves-actions">
                    <Button type="submit" variant="accent" disabled={saving || !dirty || invalid} aria-describedby={`${prefix}-save-status`}>{saving ? 'Сохраняем…' : 'Сохранить изменения'}</Button>
                    <Button variant="outline" onClick={reset} disabled={saving || atDefaults}>Вернуть исходные</Button>
                </div>
            </div>
        </form>
    </section>;
}

export default function VisualEffectsSettings() {
    const { siteSettings, updateSiteSettings, isLoaded, siteSettingsReady } = useData();
    if (!isLoaded) return <section className="visual-effects-settings" lang="ru" aria-busy="true"><h2>Визуальный стиль</h2><p role="status">Загружаем сохранённые настройки…</p></section>;
    if (!siteSettingsReady) return <section className="visual-effects-settings" lang="ru"><h2>Визуальный стиль</h2><p role="alert">Не удалось загрузить сохранённые настройки. Обновите страницу, чтобы не потерять текущие параметры.</p><Button variant="outline" onClick={() => window.location.reload()}>Загрузить настройки заново</Button></section>;
    return <VisualEffectsEditor initialValue={siteSettings?.visualEffects} updateSiteSettings={updateSiteSettings} />;
}

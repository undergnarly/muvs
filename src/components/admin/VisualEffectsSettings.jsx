import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { normalizeMenuCaptionColor, normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from '../../utils/visualEffects';
import Button from '../ui/Button';
import { formatVisualNumber, validateVisualEffectsDraft, visualEffectsDraftEqual } from './visualEffectsAdminHelpers';
import './VisualEffectsSettings.css';

const GROUPS = [
    { key: 'transition', title: 'Переходы', toggle: 'Включить плёнку при переходах', help: 'Плёнка появляется сразу при переходе. Её длительность настраивается отдельно от движения камеры.' },
    { key: 'lightLeaks', title: 'Световые засветки', toggle: 'Включить световые засветки', help: 'Короткие цветные блики между переходами. Интервал выбирается случайно в заданном диапазоне.' },
    { key: 'filmDust', title: 'Пыль и царапины', toggle: 'Включить пыль и царапины', help: 'Плёночная текстура появляется отдельно от засветок, со своим случайным интервалом.' },
    { key: 'handheld', title: 'Живая камера', toggle: 'Включить живую камеру', help: 'Мягкое движение камеры на 3D-страницах, в том числе когда вы не листаете сайт.' },
    { key: 'shadows', title: 'Тени объектов', toggle: 'Включить тени объектов', help: 'Тени изображений и деталей на полу 3D-сцены: чётче у основания, мягче вдали. Парящие элементы Code не отбрасывают тень на пол.' },
];

const SHADOW_DIRECTIONS = [
    { value: 0, label: 'Назад — 0°' },
    { value: 90, label: 'Вправо — 90°' },
    { value: 180, label: 'Вперёд — 180°' },
    { value: 270, label: 'Влево — 270°' },
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

function RangeField({ prefix, group, field, label, draft, errors, onChange, percent = false, hint, step }) {
    const id = `${prefix}-${group}-${field}`;
    const scale = percent ? 100 : 1;
    const [minimum, maximum] = VISUAL_EFFECTS_LIMITS[group][field];
    const value = Number(draft[group][field]);
    const valueText = `${formatVisualNumber(value * scale)}${percent ? '%' : '×'}`;
    const error = errors[`${group}.${field}`];
    return <div className="ves-field ves-range-field">
        <div className="ves-range-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{valueText}</output></div>
        <input id={id} type="range" min={minimum * scale} max={maximum * scale} step={step ?? (percent ? 1 : .1)}
            value={value * scale} aria-valuetext={valueText} aria-invalid={Boolean(error)}
            aria-describedby={hint || error ? `${hint ? `${id}-hint` : ''}${error ? ` ${id}-error` : ''}`.trim() : undefined}
            onChange={event => onChange(group, field, event.target.valueAsNumber / scale)} />
        {hint && <small id={`${id}-hint`} className="ves-hint">{hint}</small>}
        {error && <p id={`${id}-error`} className="ves-field-error">{error}</p>}
    </div>;
}

function ShadowDirectionField({ prefix, draft, onChange }) {
    const id = `${prefix}-shadows-directionPreset`;
    const raw = draft.shadows.directionDegrees;
    const angle = raw === '' ? NaN : Number(raw);
    const preset = SHADOW_DIRECTIONS.find(option => option.value === angle);
    return <div className="ves-field">
        <label htmlFor={id}>Куда падает тень</label>
        <select id={id} value={preset ? String(preset.value) : 'custom'} aria-describedby={`${id}-hint`}
            onChange={event => onChange('shadows', 'directionDegrees', Number(event.target.value))}>
            <option value="custom" disabled>Свой угол{Number.isFinite(angle) ? ` — ${formatVisualNumber(angle)}°` : ''}</option>
            {SHADOW_DIRECTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <small id={`${id}-hint`} className="ves-hint">Выберите направление или задайте точный угол рядом. Свой угол не округляется.</small>
    </div>;
}

function MenuCaptionColorField({ prefix, draft, errors, onChange, disabled }) {
    const id = `${prefix}-menuCaptions-color`;
    const error = errors['menuCaptions.color'];
    const color = normalizeMenuCaptionColor(draft.menuCaptions.color);
    return <fieldset className="ves-group ves-caption-group" disabled={disabled}>
        <legend>Подписи меню</legend>
        <p id={`${id}-help`} className="ves-caption-help">Цвет текста под 3D-объектами главного меню, карточками проектов внутри Code и приёмниками Radio. Заголовки и основной текст не меняются.</p>
        <div className="ves-fields ves-caption-fields">
            <div className="ves-field">
                <label htmlFor={id}>Цвет подписей меню (HEX)</label>
                <div className="ves-color-controls">
                    <input type="color" value={color} aria-label="Выбрать цвет подписей меню"
                        aria-describedby={`${id}-help`}
                        onChange={event => onChange('menuCaptions', 'color', event.target.value)} />
                    <input id={id} type="text" value={draft.menuCaptions.color} maxLength={7}
                        autoComplete="off" autoCapitalize="off" spellCheck={false} required
                        aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                        onChange={event => onChange('menuCaptions', 'color', event.target.value)} />
                </div>
                <small id={`${id}-hint`} className="ves-hint">Выберите цвет или укажите HEX, например #ffffff. По умолчанию — белый. Проверьте читаемость на светлом фоне сайта.</small>
                {error && <p id={`${id}-error`} className="ves-field-error">{error}</p>}
            </div>
            <div className="ves-caption-preview" aria-label="Предпросмотр цвета подписей">
                <small>Предпросмотр</small>
                <p style={{ color }}>Listen, support the journey.<br />Enjoy &amp; stay tuned.</p>
            </div>
        </div>
    </fieldset>;
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
                <MenuCaptionColorField {...fields} disabled={saving} />
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
                            <NumberField {...fields} group="transition" field="effectDurationSeconds" label="Длительность анимации плёнки" unit="с" hint="0 — до конца перехода. Например, 0,5 с — вместе с затуханием. При остановке камеры эффект завершается раньше." />
                            <RangeField {...fields} group="transition" field="opacity" label="Непрозрачность плёнки" percent />
                            <NumberField {...fields} group="transition" field="fadeOutMs" label="Время затухания плёнки" unit="мс" step={10} />
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
                        {group.key === 'shadows' && <>
                            <ShadowDirectionField {...fields} />
                            <NumberField {...fields} group="shadows" field="directionDegrees" label="Точный угол тени" unit="°" step={1} hint="0° — назад, 90° — вправо, 180° — вперёд, 270° — влево." />
                            <RangeField {...fields} group="shadows" field="length" label="Длина тени" step={.05} hint="Длина относительно высоты объекта: 1× равен его высоте." />
                            <RangeField {...fields} group="shadows" field="depthOffset" label="Сдвиг тени по глубине" percent hint="Плюс — дальше, за объект. Минус — ближе к камере. 0% — без сдвига; процент от высоты объекта." />
                            <RangeField {...fields} group="shadows" field="blur" label="Размытие тени" percent />
                            <RangeField {...fields} group="shadows" field="opacity" label="Непрозрачность тени" percent />
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

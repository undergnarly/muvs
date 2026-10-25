export const MENU_SOUND_NAVIGATION_EVENT = 'muvs:menu-sound-navigation';
export const MENU_SOUND_STORAGE_KEY = 'muvs:menu-sound:v1';
const SECTIONS = new Set(['music', 'mixes', 'code', 'about', 'radio']);

export function dispatchMenuSoundNavigation({ id, section, direction = 0 } = {}, target = globalThis.window) {
    if (!Number.isFinite(id) || !SECTIONS.has(section) || !target?.dispatchEvent || !target.CustomEvent) return false;
    target.dispatchEvent(new target.CustomEvent(MENU_SOUND_NAVIGATION_EVENT, {
        detail: { id, section, direction: Math.sign(Number(direction) || 0) },
    }));
    return true;
}

export function readMenuSoundPreference(storage) {
    try { return (storage === undefined ? globalThis.localStorage : storage)?.getItem(MENU_SOUND_STORAGE_KEY) === 'on'; } catch { return false; }
}

export function saveMenuSoundPreference(enabled, storage) {
    try { (storage === undefined ? globalThis.localStorage : storage)?.setItem(MENU_SOUND_STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* Private storage is optional. */ }
}

export function menuSoundControlState(snapshot = {}, remembered = false) {
    if (snapshot.status === 'on') return { text: 'Sound on', label: 'Mute menu sound', pressed: true, message: '' };
    if (snapshot.status === 'loading') return { text: 'Loading…', label: 'Cancel sound loading', pressed: true, message: 'Loading menu sound. Activate again to cancel.' };
    if (snapshot.status === 'error') return { text: 'Retry sound', label: 'Retry loading menu sound', pressed: false, message: 'Sound could not load. Activate to try again.' };
    if (snapshot.status === 'unsupported') return { text: 'No sound', label: 'Menu sound is unavailable in this browser', pressed: false, message: 'This browser cannot play the menu sound.' };
    if (snapshot.status === 'blocked' || snapshot.status === 'paused') return { text: 'Enable sound', label: 'Resume menu sound', pressed: false, message: 'Activate to resume menu sound.' };
    return { text: remembered ? 'Enable sound' : 'Sound off', label: 'Enable menu sound', pressed: false, message: '' };
}

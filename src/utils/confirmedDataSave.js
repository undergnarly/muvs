const ARRAY_KEYS = new Set(['releases', 'mixes', 'projects', 'news', 'messages']);
const OBJECT_KEYS = new Set(['about', 'newsSettings']);

/** Merge an acknowledged settings patch without dropping independently edited Radio profiles. */
export function mergeConfirmedSiteSettings(previous, submitted, result = {}) {
    const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
    const next = { ...object(previous), ...object(submitted) };
    if (own(object(submitted), 'radioShadows')) {
        const confirmed = own(object(result), 'radioShadows') ? object(result.radioShadows) : object(submitted.radioShadows);
        // A full confirmation can arrive late with stale values for another
        // target. Only this request's submitted targets may replace local ones.
        next.radioShadows = { ...confirmed, ...object(previous?.radioShadows) };
        for (const target of Object.keys(object(submitted.radioShadows))) {
            next.radioShadows[target] = own(confirmed, target) ? confirmed[target] : submitted.radioShadows[target];
        }
    }
    return next;
}

/** Settings use the same bounded, acknowledged-save contract as content writes. */
export async function saveConfirmedSiteSettings(settings, { fetchImpl = (...args) => fetch(...args), timeoutMs = 20000 } = {}) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Invalid settings. Nothing was saved.');
    const body = JSON.stringify({ key: 'siteSettings', value: settings });
    const submitted = JSON.parse(body).value;
    const controller = new AbortController();
    let timeout;
    try {
        const request = async () => {
            const response = await fetchImpl('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal });
            if (!response.ok) {
                if (response.status === 401) throw new Error('Your admin session has expired. Sign in again, then retry. Your draft is still here.');
                if (response.status === 403) throw new Error('The server blocked this save. Reload and sign in again if needed, then retry. Your draft is still here.');
                throw new Error(`The server could not save these settings (${response.status}). Please retry. Your draft is still here.`);
            }
            const result = await response.json();
            if (result?.success !== true) throw new Error('The server did not confirm the save. Please retry. Your draft is still here.');
            return result;
        };
        const deadline = new Promise((_, reject) => {
            timeout = setTimeout(() => {
                controller.abort();
                reject(new Error('The save timed out without confirmation. Check your connection and retry. Your draft is still here.'));
            }, timeoutMs);
        });
        const result = await Promise.race([request(), deadline]);
        return { result, submitted };
    } catch (error) {
        if (error?.name === 'AbortError') throw new Error('The save timed out without confirmation. Check your connection and retry. Your draft is still here.');
        if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('Could not confirm the save. Check your connection and retry. Your draft is still here.');
        throw error;
    } finally { clearTimeout(timeout); }
}

export function validateDataSave(key, value) {
    if (!ARRAY_KEYS.has(key) && !OBJECT_KEYS.has(key)) throw new Error('Unsupported content type. Nothing was saved.');
    if (ARRAY_KEYS.has(key) ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Invalid content. Nothing was saved.');
    }
}

export function createConfirmedDataWriter({ fetchImpl = (...args) => fetch(...args), onCommit = () => {}, timeoutMs = 20000 } = {}) {
    const pending = new Set();
    return async (key, value) => {
        validateDataSave(key, value);
        if (pending.has(key)) throw new Error('A save is already in progress. Please wait and try again.');
        const body = JSON.stringify({ key, value });
        const snapshot = JSON.parse(body).value;
        pending.add(key);
        const controller = new AbortController();
        let timeout;
        try {
            const request = async () => {
                const response = await fetchImpl('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal });
                if (!response.ok) {
                    if (response.status === 401) throw new Error('Your admin session has expired. Sign in again, then retry. Your draft is still here.');
                    if (response.status === 403) throw new Error('The server blocked this save. Reload and sign in again if needed, then retry. Your draft is still here.');
                    throw new Error(`The server could not save this change (${response.status}). Please retry. Your draft is still here.`);
                }
                const result = await response.json();
                if (result?.success !== true) throw new Error('The server did not confirm the save. Please retry. Your draft is still here.');
                return result;
            };
            const deadline = new Promise((_, reject) => {
                timeout = setTimeout(() => {
                    controller.abort();
                    reject(new Error('The save timed out without confirmation. Check your connection and retry. Your draft is still here.'));
                }, timeoutMs);
            });
            const result = await Promise.race([request(), deadline]);
            onCommit(key, snapshot);
            return result;
        } catch (error) {
            if (error?.name === 'AbortError') throw new Error('The save timed out without confirmation. Check your connection and retry. Your draft is still here.');
            if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('Could not confirm the save. Check your connection and retry. Your draft is still here.');
            throw error;
        } finally { clearTimeout(timeout); pending.delete(key); }
    };
}

const CHANNELS = Object.freeze([
    ['telegram', 'Telegram'], ['instagram', 'Instagram'], ['soundcloud', 'SoundCloud'], ['bandcamp', 'Bandcamp'],
]);

export function configuredContactLinks(settings) {
    const links = [];
    for (const [key, label] of CHANNELS) {
        const value = settings?.socialLinks?.[key];
        if (typeof value !== 'string') continue;
        const href = value.trim();
        if ([...href].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) continue;
        try {
            const url = new URL(href);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
            links.push({ key, label, href: url.href });
        } catch { /* Only configured absolute public links are usable contact channels. */ }
    }
    return links;
}

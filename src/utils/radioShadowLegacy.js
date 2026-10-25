const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

/** A pre-section menu-only owner preset was intended for Radio as a whole. Read it virtually. */
export function upgradeRadioShadowProfiles(raw) {
    const profiles = object(raw);
    const menu = object(own(profiles, 'menu') ? profiles.menu : undefined);
    const hasEraOverride = ['roots', 'y2k', 'new-era'].some(target => (
        own(profiles, target) && object(profiles[target]).custom === true
    ));
    if (own(profiles, 'all') || menu.custom !== true || hasEraOverride) return { ...profiles };
    return { ...profiles, all: { ...menu }, menu: { ...menu, custom: false } };
}

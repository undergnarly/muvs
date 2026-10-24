// A logical item has three world copies. Animate only the current physical
// copy; camera wrap switches it synchronously without a second particle loop.
export function menuParticleVisible(index, state, preferences, revealed) {
    return Boolean(revealed && preferences === 0 && state?.phase === 'menu' && state.menuIndex === index);
}

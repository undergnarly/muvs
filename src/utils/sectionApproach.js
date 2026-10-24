// Only a cold menu/foreign return may omit hidden section details. Direct
// section links and non-hub reading pages must render their first view normally.
export function initialSectionApproached({ hub = false, phase = 'section' } = {}) {
    return !hub || phase === 'section' || phase === 'travel';
}

// A one-way latch: returning to the menu must not dispose/recreate photos,
// reset their poses or make the next dive rebuild the same hidden objects.
export function sectionApproachReducer(approached, event) {
    return approached || event === 'enter';
}

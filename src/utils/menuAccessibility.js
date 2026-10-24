export function isPlainMenuClick(event) {
    return !event.defaultPrevented && (event.button === undefined || event.button === 0)
        && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function menuFocusables(root) {
    if (!root) return [];
    return [...root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
        .filter(element => !element.disabled && element.tabIndex >= 0
            && !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.getClientRects().length > 0);
}

export function menuTabTarget(elements, active, backwards) {
    if (!elements.length) return null;
    const first = elements[0], last = elements[elements.length - 1];
    if (!elements.includes(active)) return backwards ? last : first;
    if (backwards && active === first) return last;
    if (!backwards && active === last) return first;
    return null;
}

function projectedWidth(halfWidth, halfHeight, modelView, projectionX, depth, originalScale, scale) {
    let left = Infinity, right = -Infinity;
    for (let corner = 0; corner < 4; corner++) {
        const x = corner & 1 ? halfWidth : -halfWidth;
        const y = corner & 2 ? halfHeight : -halfHeight;
        const viewX = (modelView[0] * x + modelView[4] * y) / originalScale;
        const viewZ = (modelView[2] * x + modelView[6] * y) / originalScale;
        const distance = depth - scale * viewZ;
        if (distance <= .001) return Infinity;
        const projected = projectionX * scale * viewX / distance;
        left = Math.min(left, projected); right = Math.max(right, projected);
    }
    return right - left;
}

// Fit the measured local rectangle to a phone's nominal centered framing.
// Horizontal item/camera translations intentionally do not affect this cap:
// an offscreen sibling must not shrink while the user switches projects.
export function phoneTextFitScale(bounds, modelView, projectionX, depth, viewportWidth, currentScale = 1, gutter = 16) {
    if (!bounds || !modelView || !Number.isFinite(depth) || depth <= .01
        || !Number.isFinite(projectionX) || projectionX <= 0 || viewportWidth <= gutter * 2) return 1;
    if (!bounds.every(Number.isFinite)) return 1;
    const originalScale = Number.isFinite(currentScale) && currentScale > 0 ? currentScale : 1;
    const halfWidth = Math.abs(bounds[2] - bounds[0]) / 2;
    const halfHeight = Math.abs(bounds[3] - bounds[1]) / 2;
    const limit = 2 * (viewportWidth - 2 * gutter) / viewportWidth;
    if (projectedWidth(halfWidth, halfHeight, modelView, projectionX, depth, originalScale, 1) <= limit) return 1;
    let lower = 0, upper = 1;
    for (let iteration = 0; iteration < 14; iteration++) {
        const middle = (lower + upper) / 2;
        if (projectedWidth(halfWidth, halfHeight, modelView, projectionX, depth, originalScale, middle) <= limit) lower = middle;
        else upper = middle;
    }
    return Math.max(.001, lower);
}

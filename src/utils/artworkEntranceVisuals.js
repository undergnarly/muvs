export const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp01(value); return t * t * (3 - 2 * t); };

export function sampleEntranceVisuals(kind, elapsed, out) {
    const t = Math.max(0, elapsed);
    out.offset = 0;
    out.opacity = 1;
    out.glow = 0;
    out.dustTime = -1;
    out.lid = 1;
    if (kind === 'music') {
        const impact = 0.56;
        const drop = clamp01(t / impact);
        const settle = Math.max(0, t - impact);
        out.offset = t < impact ? 0.105 * (1 - drop * drop)
            : Math.max(0, 0.013 * Math.exp(-13 * settle) * Math.sin(24 * settle));
        out.opacity = smooth(t / 0.16);
        out.dustTime = t - impact;
    } else if (kind === 'mixes') {
        out.opacity = 0.72 + 0.28 * smooth(t / 0.22);
        out.glow = (0.8 + 0.2 * smooth(t / 0.2)) * (1 - smooth((t - 0.2) / 2.1));
    } else if (kind === 'code') {
        out.lid = smooth((t - 0.12) / 1.9);
    }
    return out;
}

export function writeLidPositions(positions, bounds, hinge, width, height, progress, sourceSize = 1024) {
    const { left, top, width: boxWidth, height: boxHeight } = bounds;
    const right = left + boxWidth;
    const bottom = top + boxHeight;
    const [[hx, hy], [ex, ey]] = hinge;
    const ax = ex - hx;
    const ay = ey - hy;
    const vx = 66;
    const vy = -150;
    const openAngle = 1.7;
    const angle = openAngle * clamp01(progress);
    const closedX = -128;
    const closedY = -9;
    const depthX = (vx - closedX * Math.cos(openAngle)) / Math.sin(openAngle);
    const depthY = (vy - closedY * Math.cos(openAngle)) / Math.sin(openAngle);
    const dx = closedX * Math.cos(angle) + depthX * Math.sin(angle) - vx;
    const dy = closedY * Math.cos(angle) + depthY * Math.sin(angle) - vy;
    const determinant = vx * ay - vy * ax;
    for (let i = 0; i < 4; i += 1) {
        const x = i % 2 ? right : left;
        const y = i < 2 ? top : bottom;
        const distance = ((x - hx) * ay - (y - hy) * ax) / determinant;
        positions[i * 3] = ((x + distance * dx) / sourceSize - 0.5) * width;
        positions[i * 3 + 1] = (0.5 - (y + distance * dy) / sourceSize) * height;
        positions[i * 3 + 2] = 0.004;
    }
    return positions;
}

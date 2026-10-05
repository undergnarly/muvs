export function applyStartupDivePose(position, look, progress = 1) {
    const amount = Number.isFinite(progress) ? 1 - Math.max(0, Math.min(1, progress)) : 0;
    if (!amount) return position;
    const x = position.x - look.x;
    const z = position.z - look.z;
    const zoom = 1 + 0.2 * amount;
    position.x = look.x + x / zoom;
    position.z = look.z + z / zoom;
    position.y += Math.hypot(x, z) * 0.2 * amount;
    return position;
}

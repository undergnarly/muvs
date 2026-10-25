const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

export function sampleSceneCameraStops(stops, progress) {
    if (stops.length === 1) return { pos: { ...stops[0].pos }, look: { ...stops[0].look }, fov: stops[0].fov };
    const segCount = stops.length - 1;
    const pc = Math.max(0, Math.min(1, progress));
    const segFloat = pc * segCount;
    const segIdx = Math.min(Math.floor(segFloat), segCount - 1);
    const lt = segFloat - segIdx;
    const e = lt * lt * (3 - 2 * lt);
    const a = stops[segIdx];
    const b = stops[segIdx + 1];
    return {
        pos: lerpVec(a.pos, b.pos, e),
        look: lerpVec(a.look, b.look, e),
        fov: lerp(a.fov, b.fov, e),
    };
}

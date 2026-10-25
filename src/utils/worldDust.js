export const WORLD_DUST_CELL_SIZE = 8;
export const WORLD_DUST_CELL_RADIUS = 2;
export const WORLD_DUST_PER_CELL = 12;
export const WORLD_DUST_WRAP_X = 56;
export const WORLD_DUST_COUNT = (WORLD_DUST_CELL_RADIUS * 2 + 1) ** 3 * WORLD_DUST_PER_CELL;
export const WORLD_DUST_REVEAL_SECONDS = 0.8;

const mod = (value, length) => ((value % length) + length) % length;
const finite = (value) => Number.isFinite(value) ? value : 0;
const smoothstep = (low, high, value) => {
    const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
    return t * t * (3 - 2 * t);
};

export const createWorldDustRebaseFrame = () => ({ offsetX: 0, camera: { x: 0, y: 0, z: 0 } });

export function sampleWorldDustRebase(frame, camera, rebaseX = 0) {
    frame.offsetX = mod(finite(rebaseX), WORLD_DUST_WRAP_X);
    frame.camera.x = finite(camera?.x) - frame.offsetX;
    frame.camera.y = finite(camera?.y);
    frame.camera.z = finite(camera?.z);
    return frame;
}

function random(cellX, cellY, cellZ, index, channel) {
    let value = (Math.imul(mod(cellX, WORLD_DUST_WRAP_X / WORLD_DUST_CELL_SIZE) + 31, 374761393)
        ^ Math.imul(cellY + 113, 668265263) ^ Math.imul(cellZ + 7919, 2147483647)
        ^ Math.imul(index + 7, 1274126177) ^ Math.imul(channel + 1, 2246822519)) >>> 0;
    value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function createWorldDustField() {
    return {
        anchors: new Float32Array(WORLD_DUST_COUNT * 3),
        motion: new Float32Array(WORLD_DUST_COUNT * 4),
        style: new Float32Array(WORLD_DUST_COUNT * 2),
        rise: new Float32Array(WORLD_DUST_COUNT),
        keys: [],
        cellX: null, cellY: null, cellZ: null,
    };
}

export function updateWorldDustField(field, camera) {
    const cx = Math.floor(finite(camera.x) / WORLD_DUST_CELL_SIZE);
    const cy = Math.floor(finite(camera.y) / WORLD_DUST_CELL_SIZE);
    const cz = Math.floor(finite(camera.z) / WORLD_DUST_CELL_SIZE);
    if (field.cellX === cx && field.cellY === cy && field.cellZ === cz) return false;
    const previous = new Map();
    for (let i = 0; i < field.keys.length; i++) previous.set(field.keys[i], field.rise[i]);
    field.cellX = cx; field.cellY = cy; field.cellZ = cz;
    let particle = 0;
    for (let x = cx - WORLD_DUST_CELL_RADIUS; x <= cx + WORLD_DUST_CELL_RADIUS; x++) {
        for (let y = cy - WORLD_DUST_CELL_RADIUS; y <= cy + WORLD_DUST_CELL_RADIUS; y++) {
            for (let z = cz - WORLD_DUST_CELL_RADIUS; z <= cz + WORLD_DUST_CELL_RADIUS; z++) {
                for (let i = 0; i < WORLD_DUST_PER_CELL; i++, particle++) {
                    const key = `${mod(x, WORLD_DUST_WRAP_X / WORLD_DUST_CELL_SIZE)},${y},${z},${i}`;
                    const a = particle * 3;
                    const m = particle * 4;
                    const s = particle * 2;
                    field.anchors[a] = x * WORLD_DUST_CELL_SIZE + random(x, y, z, i, 0) * WORLD_DUST_CELL_SIZE;
                    field.anchors[a + 1] = y * WORLD_DUST_CELL_SIZE;
                    field.anchors[a + 2] = z * WORLD_DUST_CELL_SIZE + random(x, y, z, i, 1) * WORLD_DUST_CELL_SIZE;
                    field.motion[m] = random(x, y, z, i, 2) * WORLD_DUST_CELL_SIZE;
                    field.rise[particle] = previous.get(key) ?? field.motion[m];
                    field.keys[particle] = key;
                    field.motion[m + 1] = 0.045 + random(x, y, z, i, 3) * 0.055;
                    field.motion[m + 2] = random(x, y, z, i, 4) * Math.PI * 2;
                    field.motion[m + 3] = 0.12 + random(x, y, z, i, 5) * 0.2;
                    field.style[s] = 0.10 + random(x, y, z, i, 6) * 0.24;
                    field.style[s + 1] = 0.24 + random(x, y, z, i, 7) * 0.10;
                }
            }
        }
    }
    return true;
}

export function worldDustRiseGain(distanceSquared) {
    return 0.55 + 1.45 * (1 - smoothstep(25, 196, finite(distanceSquared)));
}

export function advanceWorldDustField(field, camera, delta) {
    const dt = Math.max(0, Math.min(0.1, finite(delta)));
    for (let i = 0; i < WORLD_DUST_COUNT; i++) {
        const a = i * 3;
        const dx = field.anchors[a] - camera.x;
        const dy = field.anchors[a + 1] + field.rise[i] - camera.y;
        const dz = field.anchors[a + 2] - camera.z;
        const speed = field.motion[i * 4 + 1] * worldDustRiseGain(dx * dx + dy * dy + dz * dz);
        field.rise[i] = mod(field.rise[i] + dt * speed, WORLD_DUST_CELL_SIZE);
    }
}

export function sampleWorldDust(field, index, time, out = {}) {
    const m = index * 4;
    const elapsed = finite(time);
    const rise = mod(field.motion[m] + elapsed * field.motion[m + 1], WORLD_DUST_CELL_SIZE);
    return writeWorldDustSample(field, index, elapsed, rise, ZERO_WIND, out);
}

const ZERO_WIND = { x: 0, y: 0, z: 0 };

export function sampleWorldDustFrame(field, index, time, wind = ZERO_WIND, out = {}) {
    const mass = 0.8 + 0.2 * Math.sin(field.motion[index * 4 + 2]);
    const rise = mod(field.rise[index] + wind.y * mass, WORLD_DUST_CELL_SIZE);
    return writeWorldDustSample(field, index, finite(time), rise, wind, out);
}

function writeWorldDustSample(field, index, elapsed, rise, wind, out) {
    const a = index * 3;
    const m = index * 4;
    const s = index * 2;
    const phase = field.motion[m + 2];
    const mass = 0.8 + 0.2 * Math.sin(phase);
    out.x = field.anchors[a] + (Math.sin(elapsed * 0.21 + phase)
        + Math.sin(elapsed * 0.47 + phase * 1.7) * 0.28) * field.motion[m + 3] + wind.x * mass;
    out.y = field.anchors[a + 1] + rise;
    out.z = field.anchors[a + 2] + Math.cos(elapsed * 0.13 + phase) * 0.16 + wind.z * mass;
    out.radius = field.style[s];
    out.opacity = field.style[s + 1] * smoothstep(0, 0.8, rise)
        * (1 - smoothstep(7.2, 8, rise)) * smoothstep(0.08, 0.8, out.y);
    return out;
}

export function worldDustDistanceOpacity(distance) {
    return smoothstep(3, 5, distance) * (1 - smoothstep(12, 15, distance));
}

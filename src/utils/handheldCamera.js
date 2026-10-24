import { Euler, Quaternion, Vector3 } from 'three';
import { VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from './visualEffects.js';

const TAU = Math.PI * 2;
const PHASE_SECONDS = 100;
const FADE_SECONDS = 0.85;
const MAX_VISIBLE_DELTA = 0.25;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const [MIN_STRENGTH, MAX_STRENGTH] = VISUAL_EFFECTS_LIMITS.handheld.strength;
const [MIN_SPEED, MAX_SPEED] = VISUAL_EFFECTS_LIMITS.handheld.speed;

export function createHandheldCamera() {
    const basePosition = new Vector3();
    const baseQuaternion = new Quaternion();
    const appliedPosition = new Vector3();
    const appliedQuaternion = new Quaternion();
    const localOffset = new Vector3();
    const rotation = new Euler(0, 0, 0, 'YXZ');
    const rotationOffset = new Quaternion();
    let lastCamera = null;
    let elapsed = 0;
    let fadeElapsed = 0;
    let strengthGain = VISUAL_EFFECTS_DEFAULTS.handheld.strength;

    function restoreBase(camera) {
        if (camera !== lastCamera) return;
        if (camera.position.equals(appliedPosition)) camera.position.copy(basePosition);
        if (camera.quaternion.equals(appliedQuaternion)) camera.quaternion.copy(baseQuaternion);
    }

    function apply(camera, delta, enabled, focusDistance = 1, viewportHeight = 844, config) {
        if (!camera?.position || !camera?.quaternion) return camera;
        restoreBase(camera);
        basePosition.copy(camera.position);
        baseQuaternion.copy(camera.quaternion);
        lastCamera = camera;

        const visibleStep = Number.isFinite(delta) && delta >= 0 && delta <= MAX_VISIBLE_DELTA;
        const targetStrength = Number.isFinite(config?.strength)
            ? clamp(config.strength, MIN_STRENGTH, MAX_STRENGTH)
            : VISUAL_EFFECTS_DEFAULTS.handheld.strength;
        const speed = Number.isFinite(config?.speed)
            ? clamp(config.speed, MIN_SPEED, MAX_SPEED)
            : VISUAL_EFFECTS_DEFAULTS.handheld.speed;
        if (!enabled || config?.enabled === false || !targetStrength || !visibleStep) {
            fadeElapsed = 0;
            strengthGain = targetStrength;
            appliedPosition.copy(camera.position);
            appliedQuaternion.copy(camera.quaternion);
            return camera;
        }

        elapsed = (elapsed + delta * speed) % PHASE_SECONDS;
        fadeElapsed = Math.min(FADE_SECONDS, fadeElapsed + delta);
        const fade = fadeElapsed / FADE_SECONDS;
        strengthGain += (targetStrength - strengthGain) * -Math.expm1(-8 * delta);
        const strength = fade * fade * (3 - 2 * fade) * strengthGain;
        const height = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 844;
        const distance = Number.isFinite(focusDistance) && focusDistance > 0 ? clamp(focusDistance, 0.001, 1e6) : 1;
        const fov = Number.isFinite(camera.fov) ? clamp(camera.fov, 1, 179) : 50;
        const zoom = Number.isFinite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
        const pixelAngle = 2 * Math.tan(fov * Math.PI / 360) / (height * zoom);
        const worldPixel = pixelAngle * distance;
        const t = elapsed * TAU;

        const x = 0.30 * Math.sin(t * 0.17) + 0.16 * Math.sin(t * 0.37 + 0.9);
        const y = 0.23 * Math.sin(t * 0.13 + 0.5) + 0.12 * Math.sin(t * 0.29 + 1.7);
        const pitch = 0.21 * Math.sin(t * 0.19 + 1.2) + 0.12 * Math.sin(t * 0.41 + 0.3);
        const yaw = 0.24 * Math.sin(t * 0.11 + 2.0) + 0.12 * Math.sin(t * 0.31 + 1.1);
        const roll = 0.00016 * Math.sin(t * 0.11) + 0.00010 * Math.sin(t * 0.23 + 0.8);

        localOffset.set(x * worldPixel * strength, y * worldPixel * strength, 0).applyQuaternion(baseQuaternion);
        camera.position.add(localOffset);
        rotation.set(pitch * pixelAngle * strength, yaw * pixelAngle * strength, roll * strength, 'YXZ');
        rotationOffset.setFromEuler(rotation);
        camera.quaternion.multiply(rotationOffset);
        appliedPosition.copy(camera.position);
        appliedQuaternion.copy(camera.quaternion);
        return camera;
    }

    function reset() {
        if (lastCamera) restoreBase(lastCamera);
        lastCamera = null;
        elapsed = 0;
        fadeElapsed = 0;
        strengthGain = VISUAL_EFFECTS_DEFAULTS.handheld.strength;
    }

    return { apply, reset };
}

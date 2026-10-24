const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value) => Number.isFinite(value) ? value : 0;

export function createDustWind() {
    return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
}

export function resetDustWind(state) {
    state.x = state.y = state.z = state.vx = state.vy = state.vz = 0;
}

// x points right and y up in the gesture's view. Capture that basis at impulse
// time: an existing gust must not turn just because the camera subsequently does.
export function impulseDustWind(state, x, y, rightX = 1, rightY = 0, rightZ = 0) {
    const side = clamp(finite(x), -0.3, 0.3) * 2.5;
    const lift = clamp(finite(y), -0.3, 0.3) * 2.5;
    state.vx = clamp(state.vx + side * rightX, -1.1, 1.1);
    state.vy = clamp(state.vy + side * rightY + lift, -1.1, 1.1);
    state.vz = clamp(state.vz + side * rightZ, -1.1, 1.1);
}

export function stepDustWind(state, delta) {
    const dt = clamp(finite(delta), 0, 0.1);
    const drag = Math.exp(-3.6 * dt);
    const settle = Math.exp(-0.65 * dt);
    const travel = (settle - drag) / (3.6 - 0.65);
    // Analytic overdamped integration, independent of the display frame rate.
    state.x = clamp(state.x * settle + state.vx * travel, -0.55, 0.55);
    state.y = clamp(state.y * settle + state.vy * travel, -0.55, 0.55);
    state.z = clamp(state.z * settle + state.vz * travel, -0.55, 0.55);
    state.vx *= drag; state.vy *= drag; state.vz *= drag;
    return state;
}

const CONTROL = 'button,a,input,select,textarea,summary,[contenteditable="true"],[role="slider"],[role="dialog"],dialog,.dp-toolbar,.dp-player,.dp-track-wave,.dbg-panel,header,nav';

// This observer never owns navigation: passive bubble listeners, no cancellation,
// no scroll-position reads, and no frame loop. Consumers own the motion clock.
export function observeDustGestures(onImpulse, { target = window, doc = document } = {}) {
    let touch = null;
    const excluded = (event) => Boolean(doc.getElementById('splash-screen')) || Boolean(event.target?.closest?.(CONTROL));
    const clear = () => { touch = null; };
    const start = (event) => {
        clear();
        if (excluded(event) || event.touches?.length !== 1) return;
        touch = { id: event.touches[0].identifier, x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const move = (event) => {
        if (!touch || event.touches?.length !== 1 || excluded(event)) { clear(); return; }
        const next = event.touches[0];
        if (next.identifier !== touch.id) { clear(); return; }
        const dx = next.clientX - touch.x;
        const dy = next.clientY - touch.y;
        touch.x = next.clientX; touch.y = next.clientY;
        onImpulse(clamp(dx / Math.max(1, target.innerWidth), -0.2, 0.2), clamp(-dy / Math.max(1, target.innerHeight), -0.2, 0.2));
    };
    const wheel = (event) => {
        if (excluded(event) || event.ctrlKey) return;
        const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.innerHeight : 1;
        onImpulse(clamp(-finite(event.deltaX) * units / Math.max(1, target.innerWidth), -0.2, 0.2),
            clamp(finite(event.deltaY) * units / Math.max(1, target.innerHeight), -0.2, 0.2));
    };
    target.addEventListener('touchstart', start, { passive: true });
    target.addEventListener('touchmove', move, { passive: true });
    target.addEventListener('touchend', clear, { passive: true });
    target.addEventListener('touchcancel', clear, { passive: true });
    target.addEventListener('wheel', wheel, { passive: true });
    target.addEventListener('blur', clear);
    doc.addEventListener('visibilitychange', clear);
    return () => {
        target.removeEventListener('touchstart', start); target.removeEventListener('touchmove', move);
        target.removeEventListener('touchend', clear); target.removeEventListener('touchcancel', clear);
        target.removeEventListener('wheel', wheel); target.removeEventListener('blur', clear);
        doc.removeEventListener('visibilitychange', clear); clear();
    };
}

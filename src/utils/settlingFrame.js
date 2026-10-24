// A short DOM-side interpolation loop, not another permanent scene renderer.
// Retarget by disposing/recreating it; read values from refs on every frame.
export function startSettlingFrame({ read, target, write, alpha, epsilon,
    request = requestAnimationFrame, cancel = cancelAnimationFrame,
    clock = () => performance.now(), visibility = document }) {
    let frame = null;
    let previous = clock();
    let disposed = false;
    const pending = () => Math.abs(target() - read()) > 0;
    const schedule = () => {
        if (!disposed && frame === null && !visibility.hidden && pending()) frame = request(tick);
    };
    const tick = now => {
        frame = null;
        if (disposed || visibility.hidden) return;
        const delta = (now - previous) / 1000;
        previous = now;
        const goal = target();
        const value = read();
        const next = value + (goal - value) * alpha(delta);
        write(Math.abs(goal - next) < epsilon ? goal : next);
        schedule();
    };
    const onVisibility = () => {
        if (frame !== null) cancel(frame);
        frame = null;
        previous = clock();
        schedule();
    };
    visibility.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
        disposed = true;
        if (frame !== null) cancel(frame);
        visibility.removeEventListener('visibilitychange', onVisibility);
    };
}

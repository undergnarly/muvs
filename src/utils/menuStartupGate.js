// Optional network media must not block an otherwise usable static scene.
// Required inline fallback/render promises deliberately do not use this timeout.
export function settleWithin(promise, timeout = 8000, schedule = setTimeout, cancel = clearTimeout) {
    if (!Number.isFinite(timeout) || timeout < 0) throw new RangeError('Startup timeout must be finite and non-negative.');
    return new Promise((resolve) => {
        let settled = false;
        let timer;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            cancel(timer);
            resolve(value);
        };
        timer = schedule(() => finish(false), timeout);
        Promise.resolve(promise).then(finish, () => finish(false));
    });
}

export function createStartupGate({ prepare, waitForRender }) {
    if (typeof prepare !== 'function' || typeof waitForRender !== 'function') {
        throw new TypeError('Startup requires preparation and first-render callbacks.');
    }
    let preparation;
    let rendering;
    let startup;
    const prepareOnce = () => {
        preparation ||= Promise.resolve().then(prepare);
        return preparation;
    };
    return {
        prepare: prepareOnce,
        start() {
            // Both waits begin together. The caller retains its first-render
            // promise so a frame arriving before start is not a lost event.
            rendering ||= Promise.resolve().then(waitForRender);
            startup ||= Promise.all([prepareOnce(), rendering]).then(() => undefined);
            return startup;
        },
    };
}

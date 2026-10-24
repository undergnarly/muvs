// The eager warmup and React.lazy must share one module load. Attach a rejection
// handler immediately: failure may precede React consuming the lazy component.
export function createCachedStartupImport(load) {
    let pending;
    return () => {
        if (!pending) {
            try { pending = Promise.resolve(load()); }
            catch (error) { pending = Promise.reject(error); }
            pending.catch(() => {});
        }
        return pending;
    };
}

export function startAfterLoaderPaint(painted, { isLibrary = false, loadApp, mount }) {
    return Promise.resolve(painted).then(() => {
        if (!isLibrary) loadApp();
        return mount();
    });
}

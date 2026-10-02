import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getObjectLoop } from '../data/objectLoops';
import { EMPTY_OBJECT_VIDEO } from '../utils/objectVideoCache';
import { getArtworkMotionSnapshot, objectVideoCache, subscribeArtworkMotion } from '../utils/objectVideoRuntime';

const canvasObservers = new WeakMap();
function observeCanvas(canvas, context, listener) {
    let record = canvasObservers.get(canvas);
    if (!record) {
        const observers = new Set();
        record = { observers, intersects: typeof IntersectionObserver === 'undefined', lost: context.isContextLost() };
        record.notify = () => observers.forEach((notify) => notify(record.intersects && !record.lost));
        record.onLost = () => { record.lost = true; record.notify(); };
        record.onRestored = () => { record.lost = false; record.notify(); };
        canvas.addEventListener('webglcontextlost', record.onLost);
        canvas.addEventListener('webglcontextrestored', record.onRestored);
        if (typeof IntersectionObserver !== 'undefined') {
            record.observer = new IntersectionObserver(([entry]) => {
                record.intersects = entry.isIntersecting && entry.intersectionRatio > 0;
                record.notify();
            });
            record.observer.observe(canvas);
        }
        canvasObservers.set(canvas, record);
    }
    record.observers.add(listener);
    listener(record.intersects && !record.lost);
    return () => {
        record.observers.delete(listener);
        if (!record.observers.size) {
            record.observer?.disconnect();
            canvas.removeEventListener('webglcontextlost', record.onLost);
            canvas.removeEventListener('webglcontextrestored', record.onRestored);
            canvasObservers.delete(canvas);
        }
    };
}

export function useObjectVideoTexture(poster, meshRef, { posterReady, enabled, isSettled } = {}) {
    const spec = getObjectLoop(poster);
    const leaseRef = useRef(null);
    const canvasVisible = useRef(typeof IntersectionObserver === 'undefined');
    const gl = useThree((state) => state.gl);
    const canvas = gl.domElement;
    const frustum = useMemo(() => new THREE.Frustum(), []);
    const projection = useMemo(() => new THREE.Matrix4(), []);
    const playbackState = useRef({ prepare: false, active: false });
    const preferences = useSyncExternalStore(subscribeArtworkMotion, getArtworkMotionSnapshot, () => 4);

    const subscribe = useCallback((listener) => {
        if (!spec) return () => {};
        const lease = objectVideoCache.acquire(spec, listener);
        leaseRef.current = lease;
        return () => {
            lease.release();
            if (leaseRef.current === lease) leaseRef.current = null;
        };
    }, [spec]);
    const snapshot = useSyncExternalStore(subscribe, useCallback(
        () => leaseRef.current?.getSnapshot() || EMPTY_OBJECT_VIDEO, [],
    ), () => EMPTY_OBJECT_VIDEO);

    useEffect(() => observeCanvas(canvas, gl.getContext(), (visible) => {
        canvasVisible.current = visible;
        if (!visible) leaseRef.current?.setPlayback({});
    }), [canvas, gl]);

    useEffect(() => {
        if (!enabled || !posterReady || preferences) leaseRef.current?.setPlayback({});
    }, [enabled, posterReady, preferences]);

    useFrame(({ camera }) => {
        const lease = leaseRef.current;
        if (!lease) return;
        const mesh = meshRef.current;
        let visible = Boolean(enabled && posterReady && mesh && canvasVisible.current && !preferences);
        if (visible) {
            for (let object = mesh; object; object = object.parent) {
                if (!object.visible) { visible = false; break; }
            }
        }
        if (visible) {
            mesh.updateWorldMatrix(true, false);
            projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(projection);
            visible = frustum.intersectsObject(mesh);
        }
        // No separate RAF and no React work per frame: leases notify only when
        // selected/visible status changes. Existing camera transforms are read only.
        // Prepare only the selected object once it enters the viewport, without
        // waiting for the camera to stop. Continuous playback waits for settle.
        playbackState.current.prepare = visible;
        playbackState.current.active = visible && (!isSettled || isSettled());
        lease.setPlayback(playbackState.current);
    });

    return spec && snapshot.active && snapshot.status === 'ready' && !preferences
        ? { texture: snapshot.texture, alphaMap: snapshot.alphaMap }
        : null;
}

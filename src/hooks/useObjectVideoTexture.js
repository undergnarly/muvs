import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getObjectLoop } from '../data/objectLoops';
import { EMPTY_OBJECT_VIDEO } from '../utils/objectVideoCache';
import { getArtworkMotionSnapshot, objectVideoCache, subscribeArtworkMotion } from '../utils/objectVideoRuntime';
import { getObjectEntranceKind } from '../utils/objectEntranceTimeline';

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

export function useObjectVideoTexture(poster, meshRef, { posterReady, enabled, isSettled, entranceTimeline, entranceKey } = {}) {
    const spec = getObjectLoop(poster);
    const leaseRef = useRef(null);
    const canvasVisible = useRef(typeof IntersectionObserver === 'undefined');
    const gl = useThree((state) => state.gl);
    const canvas = gl.domElement;
    const frustum = useMemo(() => new THREE.Frustum(), []);
    const projection = useMemo(() => new THREE.Matrix4(), []);
    const playbackState = useRef({ prepare: false, active: false });
    const entranceFrame = useRef({ frame: 0, delta: 0, eligible: false, skip: false, mediaStatus: 'ready' });
    const entranceRef = useRef({
        kind: null, elapsed: 0, duration: 2.4, phase: 'cancelled', selectionToken: null, allowed: false,
        assetsReady: getObjectEntranceKind(poster) !== 'code',
        mediaStatus: getObjectEntranceKind(poster) === 'code' ? 'loading' : 'ready',
    });
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
        if (!visible) {
            entranceRef.current.allowed = false;
            leaseRef.current?.setPlayback({});
        }
    }), [canvas, gl]);

    useEffect(() => {
        if (!enabled || !posterReady || preferences) {
            entranceRef.current.allowed = false;
            leaseRef.current?.setPlayback({});
        }
    }, [enabled, posterReady, preferences]);

    useFrame(({ camera, clock }, delta) => {
        const lease = leaseRef.current;
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
        const settled = !isSettled || isSettled();
        const entrance = entranceRef.current;
        if (entranceTimeline && entranceKey) {
            const frame = entranceFrame.current;
            frame.frame = clock.elapsedTime;
            frame.delta = delta;
            frame.eligible = visible && settled;
            frame.skip = Boolean(preferences & 12);
            frame.mediaStatus = entrance.mediaStatus === 'error' ? 'error' : entrance.assetsReady ? 'ready' : 'loading';
            entranceTimeline.advance(entranceKey, frame);
            entranceTimeline.sample(entranceKey, entrance);
        }
        entrance.allowed = visible && entrance.selectionToken !== null;
        if (!lease) return;
        // No separate RAF and no React work per frame: leases notify only when
        // selected/visible status changes. Existing camera transforms are read only.
        // Prepare only the selected object once it enters the viewport, without
        // waiting for the camera to stop. Continuous playback waits for settle.
        playbackState.current.prepare = visible;
        playbackState.current.active = visible && settled && (!entrance.kind || entrance.phase === 'complete');
        playbackState.current.restartToken = entrance.kind ? entrance.selectionToken : null;
        lease.setPlayback(playbackState.current);
    });

    const video = spec && snapshot.active && snapshot.status === 'ready' && !preferences
        ? { texture: snapshot.texture, alphaMap: snapshot.alphaMap }
        : null;
    return { video, entranceRef };
}

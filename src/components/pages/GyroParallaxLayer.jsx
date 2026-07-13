import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const GyroParallaxLayer = ({ tiltRef, layerKey, children }) => {
    const groupRef = useRef(null);
    const vectors = useMemo(() => ({
        right: new THREE.Vector3(),
        up: new THREE.Vector3(),
        target: new THREE.Vector3(),
        parentQuaternion: new THREE.Quaternion(),
    }), []);

    useFrame(({ camera }) => {
        const group = groupRef.current;
        const tilt = tiltRef?.current;
        const config = tilt?.config;
        if (!group || !tilt || !config?.enabled) {
            group?.position.set(0, 0, 0);
            return;
        }

        const strength = Number(config.layers?.[layerKey]) || 0;
        const travel = Number(config.layerTravel) || 0;
        const horizontalDirection = config.invertHorizontal ? -1 : 1;
        const verticalDirection = config.invertVertical ? 1 : -1;
        const dx = -tilt.x * travel * strength * horizontalDirection;
        const dy = -tilt.y * travel * strength * verticalDirection;

        vectors.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        vectors.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        if (group.parent) {
            group.parent.getWorldQuaternion(vectors.parentQuaternion).invert();
            vectors.right.applyQuaternion(vectors.parentQuaternion);
            vectors.up.applyQuaternion(vectors.parentQuaternion);
        }
        vectors.target.copy(vectors.right).multiplyScalar(dx).addScaledVector(vectors.up, dy);
        group.position.copy(vectors.target);
    });

    return <group ref={groupRef}>{children}</group>;
};

export default GyroParallaxLayer;

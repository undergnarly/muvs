import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { FONT_BOLD } from '../../data/menuFonts';
import {
    applyTitleGlyphStretch, measureTitleGlyphs, MENU_TITLE_VIEWPORT_FRACTION,
    titleStretchStrength, warpTitleCoordinate,
} from '../../utils/menuTitleStretch';

export default function MenuTitle({ label, logicalIndex, timeline, onAfterRender }) {
    const meshRef = useRef(null);
    const glyphs = useRef(null);
    const applied = useRef(0);
    const projected = useMemo(() => ({ center: new THREE.Vector3(), unit: new THREE.Vector3() }), []);
    const onSync = useCallback((mesh) => {
        const attribute = mesh.geometry.getAttribute('aTroikaGlyphBounds');
        const metrics = measureTitleGlyphs(mesh.textRenderInfo?.glyphBounds, mesh.textRenderInfo?.visibleBounds);
        if (!attribute || !metrics) { glyphs.current = null; return; }
        attribute.array = metrics.source.slice();
        attribute.setUsage(THREE.DynamicDrawUsage);
        attribute.needsUpdate = true;
        glyphs.current = metrics;
        applied.current = 0;
    }, []);

    useFrame(({ camera }) => {
        const mesh = meshRef.current;
        const metrics = glyphs.current;
        if (!mesh || !metrics) return;
        const current = timeline.current;
        if (!current.visible) return;
        let strength = 0;
        if (current.index === logicalIndex && current.progress > 0) {
            camera.updateMatrixWorld();
            mesh.updateWorldMatrix(true, false);
            projected.center.set(metrics.center, 0, 0).applyMatrix4(mesh.matrixWorld).project(camera);
            projected.unit.set(metrics.center + 1, 0, 0).applyMatrix4(mesh.matrixWorld).project(camera);
            const unitWidth = Math.abs(projected.unit.x - projected.center.x);
            if (unitWidth > 0.00001) {
                strength = titleStretchStrength(metrics, 2 * MENU_TITLE_VIEWPORT_FRACTION / unitWidth, current.progress);
            }
        }
        if (Math.abs(applied.current - strength) < 0.00001) return;
        const attribute = mesh.geometry.getAttribute('aTroikaGlyphBounds');
        applyTitleGlyphStretch(attribute.array, metrics, strength);
        attribute.needsUpdate = true;
        const box = mesh.geometry.boundingBox;
        box.min.x = warpTitleCoordinate(metrics.minX, metrics.center, metrics.halfWidth, strength);
        box.max.x = warpTitleCoordinate(metrics.maxX, metrics.center, metrics.halfWidth, strength);
        box.getBoundingSphere(mesh.geometry.boundingSphere);
        applied.current = strength;
    });

    return (
        <Text
            ref={meshRef}
            name={`menu-title-${label.toLowerCase()}`}
            onSync={onSync}
            onAfterRender={onAfterRender}
            position={[0, 2.25, -1.2]}
            fontSize={0.92}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={-0.02}
            font={FONT_BOLD}
            material-side={THREE.FrontSide}
        >
            {label}
        </Text>
    );
}

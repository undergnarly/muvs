import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { FONT_MENU_TITLE } from '../../data/menuFonts';
import {
    applyTitleGlyphStretch, measureTitleGlyphs, menuTitleTargetWidth,
    titleStretchStrength, warpTitleCoordinate,
} from '../../utils/menuTitleStretch';

export default function MenuTitle({ label, logicalIndex, timeline, hub, onAfterRender }) {
    const meshRef = useRef(null);
    const glyphs = useRef(null);
    const applied = useRef(0);
    const width = useThree((state) => state.size.width);
    const height = useThree((state) => state.size.height);
    const targetWidth = useMemo(() => menuTitleTargetWidth(hub, width / Math.max(1, height)), [hub, width, height]);
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

    useFrame(() => {
        const mesh = meshRef.current;
        const metrics = glyphs.current;
        if (!mesh || !metrics) return;
        const current = timeline.current;
        if (!current.visible) return;
        const strength = titleStretchStrength(metrics, targetWidth, current.progressFor(logicalIndex));
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
            font={FONT_MENU_TITLE}
            material-side={THREE.FrontSide}
        >
            {label}
        </Text>
    );
}

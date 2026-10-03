import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

export default function ArtworkMaterial({ posterTexture, video }) {
    const gl = useThree((state) => state.gl);
    const hasVideo = Boolean(video?.texture && video?.alphaMap);
    const map = hasVideo ? video.texture : posterTexture || null;
    const alphaMap = hasVideo ? video.alphaMap : null;
    useLayoutEffect(() => {
        if (map?.image) gl.initTexture(map);
        if (alphaMap?.image) gl.initTexture(alphaMap);
    }, [gl, map, alphaMap]);

    return <meshBasicMaterial key={`${map?.uuid || 'empty'}:${alphaMap?.uuid || 'rgba'}`}
        map={map} alphaMap={alphaMap} color="#ffffff" transparent opacity={map ? 1 : 0} toneMapped={false} />;
}

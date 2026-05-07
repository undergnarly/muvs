import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'mix-placeholder-1',
        title: 'GUNFINGERS DEMO',
        artists: 'MUVS',
        description: 'Placeholder mix — replace with a real one in the admin.',
        releaseDate: '',
        coverImage: '',
        youtubeUrl: '',
    },
];

const MixesPage3D = () => {
    const { mixes } = useData();
    const items = (mixes && mixes.length > 0) ? mixes : FALLBACK;
    return (
        <Scene3DShell
            items={items}
            simple
            cfgStorageKey="muvs:scene3d:mixes:v1"
            serverCfgKey="mixesConfig"
            stopCount={4}
            showDebug
            tvMixes={items}
        />
    );
};

export default MixesPage3D;

import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'mix-placeholder-1',
        title: 'GUNFINGERS TEST',
        artists: 'MUVS',
        description: 'Placeholder mix — replace with a real one in the admin.',
        releaseDate: '',
        coverImage: '',
        youtubeUrl: 'https://www.youtube.com/watch?v=gcqrg86VVeQ',
    },
];

const ensureYoutube = (m) => (m?.youtubeUrl ? m : { ...m, youtubeUrl: 'https://www.youtube.com/watch?v=gcqrg86VVeQ' });

const MixesPage3D = () => {
    const { mixes } = useData();
    const source = (mixes && mixes.length > 0) ? mixes : FALLBACK;
    const items = source.map(ensureYoutube);
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

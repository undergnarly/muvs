import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'mix-placeholder-1',
        title: 'MIX ONE',
        artists: 'MUVS',
        description: 'Placeholder mix — replace with real data.',
        releaseDate: '',
        coverImage: '',
    },
    {
        id: 'mix-placeholder-2',
        title: 'MIX TWO',
        artists: 'MUVS',
        description: 'Placeholder mix two.',
        releaseDate: '',
        coverImage: '',
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
        />
    );
};

export default MixesPage3D;

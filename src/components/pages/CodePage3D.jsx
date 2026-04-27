import React from 'react';
import { useData } from '../../context/DataContext';
import { Scene3DShell } from './HomeNewPage';

const FALLBACK = [
    {
        id: 'code-placeholder-1',
        title: 'PROJECT ONE',
        artists: 'MUVS',
        description: 'Placeholder code project.',
        releaseDate: '',
        coverImage: '',
    },
    {
        id: 'code-placeholder-2',
        title: 'PROJECT TWO',
        artists: 'MUVS',
        description: 'Another placeholder project.',
        releaseDate: '',
        coverImage: '',
    },
];

const CodePage3D = () => {
    const { projects } = useData();
    const items = (projects && projects.length > 0) ? projects : FALLBACK;
    return (
        <Scene3DShell
            items={items}
            simple
            cfgStorageKey="muvs:scene3d:code:v1"
        />
    );
};

export default CodePage3D;

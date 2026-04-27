import React from 'react';
import { Scene3DShell } from './HomeNewPage';

const ITEMS = [
    {
        id: 'lecture-1',
        title: 'LECTURE',
        artists: 'GUEST SPEAKER',
        description: 'Placeholder lecture intro — replace with real content.',
        releaseDate: '',
        coverImage: '',
    },
];

const LecturePage3D = () => (
    <Scene3DShell
        items={ITEMS}
        simple
        cfgStorageKey="muvs:scene3d:lecture:v1"
    />
);

export default LecturePage3D;

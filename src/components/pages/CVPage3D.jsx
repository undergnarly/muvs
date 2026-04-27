import React from 'react';
import { Scene3DShell } from './HomeNewPage';

const ITEMS = [
    {
        id: 'cv-1',
        title: 'CURRICULUM VITAE',
        artists: 'NIKITA ANTIMONOV',
        description: 'Placeholder CV body — replace with experience, skills, education.',
        releaseDate: '',
        coverImage: '',
    },
];

const CVPage3D = () => (
    <Scene3DShell
        items={ITEMS}
        simple
        cfgStorageKey="muvs:scene3d:cv:v1"
    />
);

export default CVPage3D;

import React from 'react';
import { Scene3DShell } from './HomeNewPage';

const ITEMS = [
    {
        id: 'about-1',
        title: 'ABOUT',
        artists: 'MUVS',
        description: 'Placeholder copy. Replace with the about-page intro once ready.',
        releaseDate: '',
        coverImage: '',
    },
];

const AboutPage3D = () => (
    <Scene3DShell
        items={ITEMS}
        simple
        cfgStorageKey="muvs:scene3d:about:v1"
    />
);

export default AboutPage3D;

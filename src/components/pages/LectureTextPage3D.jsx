import React from 'react';
import { Scene3DShell } from './HomeNewPage';

const ITEMS = [
    {
        id: 'lecture-text-1',
        title: 'LECTURE TEXT',
        artists: 'TRANSCRIPT',
        description: 'Placeholder lecture transcript — replace with the long-form text.',
        releaseDate: '',
        coverImage: '',
    },
];

const LectureTextPage3D = () => (
    <Scene3DShell
        items={ITEMS}
        simple
        cfgStorageKey="muvs:scene3d:lecture-text:v1"
    />
);

export default LectureTextPage3D;

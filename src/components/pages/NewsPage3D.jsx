import React from 'react';
import { Scene3DShell } from './HomeNewPage';

const ITEMS = [
    {
        id: 'news-1',
        title: 'NEWS ITEM ONE',
        artists: 'MUVS',
        description: 'Placeholder news entry — replace with real content.',
        releaseDate: '',
        coverImage: '',
    },
    {
        id: 'news-2',
        title: 'NEWS ITEM TWO',
        artists: 'MUVS',
        description: 'Another placeholder news entry.',
        releaseDate: '',
        coverImage: '',
    },
];

const NewsPage3D = () => (
    <Scene3DShell
        items={ITEMS}
        simple
        cfgStorageKey="muvs:scene3d:news:v1"
    />
);

export default NewsPage3D;

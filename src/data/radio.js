// Curated radio identities. Streams are deliberately unconfigured until launch.
export const RADIO_MENU_CAPTION = 'Three eras. One frequency.<br />Coming soon.';

const station = (value) => Object.freeze({
    ...value,
    genres: Object.freeze(value.genres),
    active: true,
    status: 'coming-soon',
    streamUrl: null,
    tracks: Object.freeze([]),
});

export const RADIO_STATIONS = Object.freeze([
    station({
        id: 'radio-roots', slug: 'roots', title: 'ROOTS',
        artists: '1970s–1980s', era: '1970s–1980s',
        genres: ['Roots reggae', 'Dub'],
        description: 'Roots reggae and dub from the foundations of sound-system culture.<br />Coming soon.',
        coverImage: '/images/radio/radio-oldschool-v1.webp', order: 0,
    }),
    station({
        id: 'radio-y2k', slug: 'y2k', title: 'Y2K RADIO',
        artists: '1990s–2000s', era: '1990s–2000s',
        genres: ['Dancehall', 'Old-school jungle'],
        description: 'Dancehall pressure and old-school jungle from the 1990s–2000s.<br />Coming soon.',
        coverImage: '/images/radio/radio-y2k-v1.webp', order: 1,
    }),
    station({
        id: 'radio-new-era', slug: 'new-era', title: 'NEW ERA',
        artists: '2015–NOW', era: '2015–NOW',
        genres: ['Modern bass', 'Future dub', 'Fresh releases'],
        description: 'Modern bass, future dub and fresh releases. Music from 2015 to now.<br />Coming soon.',
        coverImage: '/images/radio/radio-modern-v2.webp', order: 2,
    }),
]);

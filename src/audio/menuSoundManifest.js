export const MENU_SOUND_MANIFEST = Object.freeze({
    masterGain: 0.7,
    ambient: Object.freeze({ url: '/audio/menu/menu-pad.mp3', gain: 0.3, loopStart: 0, loopEnd: 24 }),
    sfx: Object.freeze({
        music: Object.freeze({ url: '/audio/menu/music-transition.mp3', gain: 0.4 }),
        mixes: Object.freeze({ url: '/audio/menu/mixes-transition.mp3', gain: 0.38 }),
        code: Object.freeze({ url: '/audio/menu/code-transition.mp3', gain: 0.34 }),
        about: Object.freeze({ url: '/audio/menu/about-transition.mp3', gain: 0.4 }),
    }),
});

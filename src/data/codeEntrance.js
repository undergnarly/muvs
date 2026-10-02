// Entrance layers are pixel-aligned to the unchanged 1024-square code2.webp.
// Coordinates are image pixels (x right, y down), not normalized Three UVs.
export const CODE_ENTRANCE = Object.freeze({
    baseSrc: '/videos/objects/code-entrance-base.webp',
    lidSrc: '/videos/objects/code-entrance-lid.webp',
    foregroundSrc: '/videos/objects/code-entrance-foreground.webp',
    sourceSize: 1024,
    duration: 2.4,
    lidQuad: Object.freeze([[656, 295], [783, 308], [718, 443], [590, 445]]),
    hinge: Object.freeze([[590, 445], [718, 443]]),
    // Includes source antialiasing/rounded corners, which remain in the texture.
    lidBounds: Object.freeze({ left: 584, top: 291, width: 204, height: 160 }),
});

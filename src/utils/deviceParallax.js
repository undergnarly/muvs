export const DEVICE_TILT_LAYER_DEFAULTS = {
    menuImage: 0,
    menuHeading: 0.35,
    menuCaption: 1,
    menuParticles: 0.65,
    sectionImage: 0,
    sectionHeading: 0.3,
    sectionFloorText: 1,
    sectionPhotos: 0.8,
    sectionSupport: 1.15,
    sectionPortfolio: 0.65,
};

export const DEVICE_TILT_DEFAULTS = {
    enabled: true,
    maxTiltDeg: 18,
    smoothing: 7,
    invertHorizontal: true,
    invertVertical: true,
    yawDeg: 5,
    pitchDeg: 3.5,
    layerTravel: 0.55,
    layers: DEVICE_TILT_LAYER_DEFAULTS,
};

export const mergeDeviceTiltSettings = (settings) => ({
    ...DEVICE_TILT_DEFAULTS,
    ...(settings || {}),
    layers: {
        ...DEVICE_TILT_LAYER_DEFAULTS,
        ...(settings?.layers || {}),
    },
});

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
    horizontalStrength: 0.22,
    verticalStrength: 0.14,
    maxTiltDeg: 18,
    smoothing: 7,
    invertHorizontal: true,
    invertVertical: true,
    focalLock: 1,
    yawDeg: 0.8,
    pitchDeg: 0.5,
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

export const createCenteredCameraFrame = () => ({
    originX: 0,
    pose: {
        pos: { x: 0, y: 0, z: 0 },
        look: { x: 0, y: 0, z: 0 },
        fov: 0,
    },
});

const writeFrame = (frame, local, offset, x, z, direction, lookLift) => {
    frame.originX = x - direction * (offset + local.pos.x);
    frame.pose.pos.x = x;
    frame.pose.pos.y = local.pos.y;
    frame.pose.pos.z = z + direction * local.pos.z;
    frame.pose.look.x = x + direction * (local.look.x - local.pos.x);
    frame.pose.look.y = local.look.y + lookLift;
    frame.pose.look.z = z + direction * local.look.z;
    frame.pose.fov = local.fov;
    return frame;
};

export const sampleCenteredHubFrame = (frame, local, menuX, sectionDistance, itemOffset) => (
    writeFrame(frame, local, itemOffset, menuX, -sectionDistance, -1, .22)
);

export const sampleCenteredFlatFrame = (frame, local, itemOffset) => (
    writeFrame(frame, local, itemOffset, 0, 0, 1, 0)
);

export const captureHubTravelLane = (state) => {
    state.travelAnchorX = state.angle + (state.menuOffset || 0);
    return state.travelAnchorX;
};

export const hubCameraLane = (state) => (
    state.phase === 'menu' || !Number.isFinite(state.travelAnchorX)
        ? state.angle + (state.menuOffset || 0)
        : state.travelAnchorX
);

export function rebaseHiddenHubLane(state, spacing) {
    if (state.phase !== 'section' && !(state.phase === 'travel' && state.tt > .55)) return false;
    const anchor = hubCameraLane(state);
    state.angle = state.menuIndex * spacing;
    state.menuOffset = anchor - state.angle;
    return true;
}

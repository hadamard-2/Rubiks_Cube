const RED = [0.72, 0.13, 0.24];
const ORANGE = [0.94, 0.35, 0.12];
const WHITE = [0.87, 0.87, 0.87];
const YELLOW = [0.97, 0.81, 0.18];
const BLUE = [0.13, 0.32, 0.71];
const GREEN = [0.16, 0.48, 0.29];

export const CUBE_VERTICES = new Float32Array([
    // Front
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,

    // Back
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top
    -1.0, 1.0, -1.0,
    -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, -1.0,

    // Bottom
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0, 1.0,

    // Right
    1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0, 1.0,

    // Left
    -1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0,
]);

export const CUBE_COLORS = new Float32Array([
    // Front
    ...RED,
    ...RED,
    ...RED,
    ...RED,

    // Back
    ...ORANGE,
    ...ORANGE,
    ...ORANGE,
    ...ORANGE,

    // Top
    ...WHITE,
    ...WHITE,
    ...WHITE,
    ...WHITE,

    // Bottom
    ...YELLOW,
    ...YELLOW,
    ...YELLOW,
    ...YELLOW,

    // Right
    ...BLUE,
    ...BLUE,
    ...BLUE,
    ...BLUE,

    // Left
    ...GREEN,
    ...GREEN,
    ...GREEN,
    ...GREEN,
]);

export const CUBE_INDICES = new Uint16Array([
    // Front
    0, 1, 2,
    0, 2, 3,

    // Back
    4, 5, 6,
    4, 6, 7,

    // Top
    8, 9, 10,
    8, 10, 11,

    // Bottom
    12, 13, 14,
    12, 14, 15,

    // Right
    16, 17, 18,
    16, 18, 19,

    // Left
    20, 21, 22,
    20, 22, 23,
]);
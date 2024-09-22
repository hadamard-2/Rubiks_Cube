import { CUBE_COLORS, RED, ORANGE, YELLOW, GREEN, BLUE, WHITE } from "./geometry";

export function showError(errorText: string): void {
    // console.error(errorText);
    const errorBoxDiv = document.getElementById('error-box');
    if (!errorBoxDiv) return; // Simplified null check
    const errorElement = document.createElement('p');
    errorElement.innerText = errorText;
    errorBoxDiv.appendChild(errorElement);
}

export function createStaticBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer): WebGLBuffer | null {
    const buffer = gl.createBuffer();
    if (!buffer) return showErrorAndReturnNull('Failed to allocate vertex buffer');

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind buffer after use for safety

    return buffer;
}

export function createStaticIndexBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer): WebGLBuffer | null {
    const buffer = gl.createBuffer();
    if (!buffer) return showErrorAndReturnNull('Failed to allocate index buffer');

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null); // Unbind for consistency

    return buffer;
}

export function create3dPosColorVAO(
    gl: WebGL2RenderingContext,
    vertexBuffer: WebGLBuffer,
    colorBuffer: WebGLBuffer,
    indexBuffer: WebGLBuffer,
    posAttrib: number, colorAttrib: number
) {
    const vao = gl.createVertexArray();
    if (!vao) {
        showError('Failed to create VAO');
        return null;
    }

    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(posAttrib);
    gl.enableVertexAttribArray(colorAttrib);

    // Vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.bindVertexArray(null);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return vao;
}

export function createProgram(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string
): WebGLProgram | null {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return showErrorAndReturnNull('Failed to create GPU program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const errorMessage = gl.getProgramInfoLog(program);
        showError(`Failed to link GPU program: ${errorMessage}`);
        gl.deleteProgram(program);
        return null;
    }

    // Clean up shaders after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return showErrorAndReturnNull(`Failed to create shader of type: ${type}`);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const errorMessage = gl.getShaderInfoLog(shader);
        showError(`Failed to compile shader: ${errorMessage}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        const webgl1Supported = !!document.createElement('canvas').getContext('webgl');
        const message = webgl1Supported
            ? 'WebGL 1 is supported, but not WebGL 2. Try using a different device or browser.'
            : 'WebGL is not supported on this device. Try using a different device or browser.';
        showError(message);
        return null;
    }
    return gl;
}

// Helper function to show error and return null
function showErrorAndReturnNull(message: string): null {
    showError(message);
    return null;
}

export function createCustomCubieSideColors(cubieLocation: string[]): Float32Array {
    const irrelevantInfo = ["standing", "equator", "middle"];
    cubieLocation = cubieLocation.filter(elem => !irrelevantInfo.includes(elem));
    showError(`${cubieLocation}`);

    const sides: Record<string, number[]> = {
        front: RED,
        back: ORANGE,
        top: WHITE,
        bottom: YELLOW,
        right: BLUE,
        left: GREEN
    };

    let sideColors = new Float32Array(CUBE_COLORS);
    const DARK_GREY = [0.01, 0.01, 0.01];
    const STRIDE = 12;

    const nonVisibleSides = Object.keys(sides).filter(side => !cubieLocation.includes(side));
    let index;
    nonVisibleSides.forEach((side) => {
        index = Object.keys(sides).indexOf(side);
        sideColors = new Float32Array([
            ...sideColors.slice(0, index * STRIDE),
            ...DARK_GREY, ...DARK_GREY, ...DARK_GREY, ...DARK_GREY,
            ...sideColors.slice((index + 1) * STRIDE)
        ]);
    });

    return sideColors;
}

// function formatArray(arr: any[]) {
//     const sides = ["FRONT", "BACK", "TOP", "BOTTOM", "RIGHT", "LEFT"];
//     const formatted = arr.map(num => num.toFixed(2));
//     const lines = [];
//     for (let i = 0; i < formatted.length; i += 12) {
//         lines.push(sides[i / 12] + ": " + formatted.slice(i, i + 12).join(", "));
//     }
//     return lines.join("\n");
// }

// const testCases = [
//     { location: ["left", "bottom", "back"], label: "Test Case 1" },
//     { location: ["top", "front", "middle"], label: "Test Case 2" },
//     { location: ["top", "front", "right"], label: "Test Case 3" },
//     { location: ["bottom", "right", "standing"], label: "Test Case 4" },
//     { location: ["equator", "left", "standing"], label: "Test Case 5" },
// ];

// testCases.forEach(({ location, label }) => {
//     const result = createCustomCubieSideColors(location);
//     showError(`${label}:\n${formatArray(Array.from(result))}`);
// });
export function showError(errorText: string): void {
    // console.error(errorText);
    const errorBoxDiv = document.getElementById('error-box');
    if (!errorBoxDiv) return; // Simplified null check
    const errorElement = document.createElement('p');
    errorElement.innerText = errorText;
    errorBoxDiv.appendChild(errorElement);
}

export function createStaticVertexBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer): WebGLBuffer | null {
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

export function create3dPosColorInterleavedVao(
    gl: WebGL2RenderingContext,
    vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer,
    posAttrib: number, colorAttrib: number
): WebGLVertexArrayObject | null {
    const vao = gl.createVertexArray();
    if (!vao) return showErrorAndReturnNull('Failed to create VAO');

    gl.bindVertexArray(vao);

    // Enable vertex attributes for position and color
    gl.enableVertexAttribArray(posAttrib);
    gl.enableVertexAttribArray(colorAttrib);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Setup interleaved vertex attribute pointers: position and color
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bindVertexArray(null); // Unbind VAO

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

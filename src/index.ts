import { CUBE_COLORS, CUBE_INDICES, CUBE_VERTICES } from "./geometry";
import { create3dPosColorVAO, createProgram, createStaticIndexBuffer, createStaticBuffer, getContext, showError } from "./gl-utils";
import { glMatrix, mat4, vec3, quat } from "gl-matrix";

const vertexShaderSourceCode = `#version 300 es
precision mediump float;

in vec3 vertexPosition;
in vec3 vertexColor;

out vec3 fragmentColor;

uniform mat4 matWorld;
uniform mat4 matProjView;

void main() {
  fragmentColor = vertexColor;

  gl_Position = matProjView * matWorld * vec4(vertexPosition, 1.0);
}`;

const fragmentShaderSourceCode = `#version 300 es
precision mediump float;

in vec3 fragmentColor;
out vec4 outputColor;

void main() {
  outputColor = vec4(fragmentColor, 1.0);
}`;

class Cube {
    static vao: WebGLVertexArrayObject;
    private worldMatrix: mat4 = mat4.create();
    private positionVec: vec3;
    private scaleVec: vec3 = vec3.fromValues(1, 1, 1);
    private rotationQuat: quat = quat.create();

    constructor(posX: number, posY: number, posZ: number) {
        this.positionVec = vec3.fromValues(posX, posY, posZ);

        quat.setAxisAngle(
            this.rotationQuat,
            vec3.fromValues(1, 0, 0),
            glMatrix.toRadian(0)
        );

        this.worldMatrix = mat4.create();
    }

    draw(
        gl: WebGL2RenderingContext,
        matWorldUniform: WebGLUniformLocation,
        rotationAngle = 0,
        rotationAxis: vec3 = vec3.fromValues(1, 0, 0)
    ) {
        // Apply Transformations
        mat4.fromRotationTranslationScale(
            this.worldMatrix,
            this.rotationQuat,
            this.positionVec,
            this.scaleVec
        );

        if (rotationAngle !== 0) {
            const tempRotationMatrix = mat4.create();
            mat4.fromRotation(tempRotationMatrix, glMatrix.toRadian(rotationAngle), rotationAxis);
            mat4.multiply(this.worldMatrix, tempRotationMatrix, this.worldMatrix);
        }

        gl.uniformMatrix4fv(matWorldUniform, false, this.worldMatrix);
        gl.bindVertexArray(Cube.vao);
        gl.drawElements(gl.TRIANGLES, CUBE_INDICES.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    applyRotation(worldRotationAngle: number, rotationAxis: vec3) {
        const incrementalQuat = quat.create();
        quat.setAxisAngle(incrementalQuat, rotationAxis, glMatrix.toRadian(worldRotationAngle));
        quat.multiply(this.rotationQuat, incrementalQuat, this.rotationQuat);
    }

    toString() {
        return `x: ${this.positionVec[0]},
            y: ${this.positionVec[1]},
            z: ${this.positionVec[2]}`;
    }
}

let sideToRotate: string;
let turns = 0;

function initializeGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    const gl = getContext(canvas);
    if (!gl) {
        showError("WebGL not supported in this browser.");
        return null;
    }
    return gl;
}

function initializeProgram(gl: WebGL2RenderingContext) {
    const program = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
    if (!program) {
        showError("Failed to create WebGL program.");
        return null;
    }
    return program;
}

function initializeBuffers(gl: WebGL2RenderingContext) {
    const vertexBuffer = createStaticBuffer(gl, CUBE_VERTICES);
    const colorBuffer = createStaticBuffer(gl, CUBE_COLORS);
    const indexBuffer = createStaticIndexBuffer(gl, CUBE_INDICES);
    if (!vertexBuffer || !colorBuffer || !indexBuffer) {
        showError("Error creating vertex or index buffers.");
        return null;
    }
    return { vertexBuffer, colorBuffer, indexBuffer };
}

function initializeVAO(gl: WebGL2RenderingContext, program: WebGLProgram, buffers: { vertexBuffer: WebGLBuffer, colorBuffer: WebGLBuffer, indexBuffer: WebGLBuffer }) {
    const posAttrib = gl.getAttribLocation(program, "vertexPosition");
    const colorAttrib = gl.getAttribLocation(program, "vertexColor");

    if (posAttrib < 0 || colorAttrib < 0) {
        showError("Failed to get attribute locations.");
        return null;
    }

    const vao = create3dPosColorVAO(gl, buffers.vertexBuffer, buffers.colorBuffer, buffers.indexBuffer, posAttrib, colorAttrib);
    if (!vao) {
        showError("Failed to create VAO.");
        return null;
    }
    Cube.vao = vao;
    return vao;
}

function loadScene() {
    const canvas = document.querySelector("#demo-canvas") as HTMLCanvasElement;
    if (!canvas) {
        showError("Canvas not found.");
        return;
    }

    const gl = initializeGLContext(canvas);
    if (!gl) return;

    const program = initializeProgram(gl);
    if (!program) return;

    const buffers = initializeBuffers(gl);
    if (!buffers) return;

    const vao = initializeVAO(gl, program, buffers);
    if (!vao) return;

    const matProjViewUniform = gl.getUniformLocation(program, "matProjView");
    const matWorldUniform = gl.getUniformLocation(program, "matWorld");

    if (!matProjViewUniform || !matWorldUniform) {
        showError("Failed to get uniform locations.");
        return;
    }

    const matView = mat4.create();
    const matProj = mat4.create();

    const cubies = createCubies();
    const sideIndices = getSideIndices();
    const sideRotationAxes = getSideRotationAxes();

    let angle = 0;
    const speed = 1.5;
    let cubiesToRotate: number[] = [];
    let axisOfRotation: vec3;

    const renderScene = () => {
        // Check for ongoing rotation
        if (turns !== 0) {
            angle += speed;
        }

        setupCanvas(gl, canvas);

        gl.useProgram(program);

        mat4.lookAt(matView, vec3.fromValues(24, 24, 24), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
        mat4.perspective(matProj, glMatrix.toRadian(30), canvas.width / canvas.height, 0.1, 100.0);

        const matProjView = mat4.create();
        mat4.multiply(matProjView, matProj, matView);
        gl.uniformMatrix4fv(matProjViewUniform, false, matProjView);

        for (let i = 0; i < cubies.length; i++) {
            if (turns === 0) {
                cubies[i].draw(gl, matWorldUniform);
            } else {
                cubiesToRotate = sideIndices[sideToRotate];
                axisOfRotation = sideRotationAxes[sideToRotate];

                if (cubiesToRotate.includes(i)) {
                    cubies[i].draw(gl, matWorldUniform, turns * angle, axisOfRotation);
                } else {
                    cubies[i].draw(gl, matWorldUniform);
                }
            }
        }

        if (angle >= 90) {
            cubiesToRotate.forEach(index => cubies[index].applyRotation(turns * 90, axisOfRotation));
            angle = 0;
            turns = 0;
        }

        requestAnimationFrame(renderScene);
    }

    requestAnimationFrame(renderScene);
}

function setupCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
}

function handleRotation(key: string, side: string) {
    turns = key === key.toLowerCase() ? -1 : 1;
    sideToRotate = side;
}

window.addEventListener("keydown", (event) => {
    const keyMap: Record<string, string> = {
        "f": "front",
        "s": "standing",
        "k": "back",
        "t": "top",
        "e": "equator",
        "b": "bottom",
        "r": "right",
        "m": "middle",
        "l": "left"
    };

    const side = keyMap[event.key.toLowerCase()];
    if (side) {
        handleRotation(event.key, side);
    }
});

function createCubies(): Cube[] {
    // const cubies: Cube[] = [];
    // for (let x = -1; x <= 1; x++) {
    //     for (let y = -1; y <= 1; y++) {
    //         for (let z = -1; z <= 1; z++) {
    //             cubies.push(new Cube(x * 2, y * 2, z * 2));
    //         }
    //     }
    // }

    // const cubies = [];
    // const coordinates = [-2.25, 0, 2.25];

    // for (let y of coordinates) {
    //     for (let x of coordinates) {
    //         for (let z of coordinates) {
    //             if (x !== 0 || y !== 0 || z !== 0) {
    //                 cubies.push(new Cube(x, y, z));
    //             }
    //         }
    //     }
    // }

    // cubies.forEach((cubie) => showError(cubie.toString()));

    const cubies = [
        // Top Layer (horizontal)
        new Cube(2.25, 2.25, 0), // right 1
        new Cube(-2.25, 2.25, 0), // left 1
        new Cube(0, 2.25, 2.25), // front 1
        new Cube(0, 2.25, -2.25), // back 1
        new Cube(0, 2.25, 0),
        new Cube(2.25, 2.25, 2.25), // right 0, front 2
        new Cube(2.25, 2.25, -2.25), // right 2, back 0
        new Cube(-2.25, 2.25, 2.25), // front 0, left 2
        new Cube(-2.25, 2.25, -2.25), // back 2, left 0

        // Equator Layer (horizontal)
        new Cube(2.25, 0, 0), // right 4
        new Cube(-2.25, 0, 0), // left 4
        new Cube(0, 0, 2.25), // front 4
        new Cube(0, 0, -2.25), // back 4
        new Cube(0, 0, 0), // core
        new Cube(2.25, 0, 2.25), // right 3, front 5
        new Cube(2.25, 0, -2.25), // right 5, back 3
        new Cube(-2.25, 0, 2.25), // front 3, left 5
        new Cube(-2.25, 0, -2.25), // back 5, left 3

        // Bottom Layer (horizontal)
        new Cube(2.25, -2.25, 0), // right 7
        new Cube(-2.25, -2.25, 0), // left 7
        new Cube(0, -2.25, 2.25), // front 7
        new Cube(0, -2.25, -2.25), // back 7
        new Cube(0, -2.25, 0),
        new Cube(2.25, -2.25, 2.25), // right 6, front 8
        new Cube(2.25, -2.25, -2.25), // right 8, back 6
        new Cube(-2.25, -2.25, 2.25), // front 6, left 8
        new Cube(-2.25, -2.25, -2.25), // back 8, left 6
    ];

    return cubies;
}

function getSideIndices(): Record<string, number[]> {
    // return {
    //     front: [6, 7, 8, 15, 16, 17, 24, 25, 26],
    //     standing: [3, 4, 5, 12, 13, 14, 21, 22, 23],
    //     back: [0, 1, 2, 9, 10, 11, 18, 19, 20],
    //     top: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    //     equator: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    //     bottom: [18, 19, 20, 21, 22, 23, 24, 25, 26],
    //     right: [2, 5, 8, 11, 14, 17, 20, 23, 26],
    //     middle: [1, 4, 7, 10, 13, 16, 19, 22, 25],
    //     left: [0, 3, 6, 9, 12, 15, 18, 21, 24]
    // };

    return {
        "front": [2, 5, 7, 11, 14, 16, 20, 23, 25],
        "back": [3, 6, 8, 12, 15, 17, 21, 24, 26],
        "top": [0, 1, 2, 3, 4, 5, 6, 7, 8],
        "bottom": [18, 19, 20, 21, 22, 23, 24, 25, 26],
        "left": [1, 7, 8, 10, 16, 17, 19, 25, 26],
        "right": [0, 5, 6, 9, 14, 15, 18, 23, 24],
        "equator": [9, 10, 11, 12, 13, 14, 15, 16, 17],
        "middle": [2, 3, 4, 11, 12, 13, 20, 21, 22],
        "standing": [0, 1, 4, 9, 10, 13, 18, 19, 22],
    };
}

function getSideRotationAxes(): Record<string, vec3> {
    return {
        front: vec3.fromValues(0, 0, 1),
        standing: vec3.fromValues(0, 0, 1),
        back: vec3.fromValues(0, 0, 1),
        top: vec3.fromValues(0, 1, 0),
        equator: vec3.fromValues(0, 1, 0),
        bottom: vec3.fromValues(0, 1, 0),
        right: vec3.fromValues(1, 0, 0),
        middle: vec3.fromValues(1, 0, 0),
        left: vec3.fromValues(1, 0, 0)
    };
}

document.addEventListener("DOMContentLoaded", loadScene);
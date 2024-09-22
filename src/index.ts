import { CUBE_COLORS, CUBE_INDICES, CUBE_VERTICES } from "./geometry";
import { create3dPosColorVAO, createProgram, createStaticIndexBuffer, createStaticBuffer, getContext, showError, createCustomCubieSideColors } from "./gl-utils";
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

class Cubie {
    static vao: WebGLVertexArrayObject;
    private worldMatrix: mat4 = mat4.create();
    private positionVec: vec3;
    private scaleVec: vec3 = vec3.fromValues(1, 1, 1);
    private rotationQuat: quat = quat.create();

    public readonly location: string[];
    

    constructor(posX: number, posY: number, posZ: number, location: string[]) {
        this.positionVec = vec3.fromValues(posX, posY, posZ);
        this.location = location;
        quat.setAxisAngle(
            this.rotationQuat,
            vec3.fromValues(1, 0, 0),
            glMatrix.toRadian(0)
        );
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
        gl.bindVertexArray(Cubie.vao);
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
    Cubie.vao = vao;

    return vao;
}

let sideToRotate: string;
let turns = 0;

// NOTE - testing
// sideToRotate = "back";
// turns = 1;

function loadScene() {
    const canvas = document.querySelector("#demo-canvas") as HTMLCanvasElement;
    if (!canvas) {
        showError("Canvas not found.");
        return;
    }

    const { cubies, sideIndices } = createCubies();
    const sideRotationAxes = getSideRotationAxes();

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

    let angle = 0;
    const speed = 1.5;
    let cubiesToRotate: number[] = [];
    let axisOfRotation: vec3;

    // NOTE - testing
    // showError(`${sideIndices[sideToRotate]}`);

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


function createCubies() {
    const COORDINATES = [-2.25, 0, 2.25]; // Positions for x, y, and z coordinates
    const cubies: Cubie[] = [];

    const sideIndices: Record<string, number[]> = {
        // x
        "left": [], "middle": [], "right": [],
        // y
        "bottom": [], "equator": [], "top": [],
        // z
        "back": [], "standing": [], "front": [],
    };

    // Populate side indices for a given cubie index
    function populateSideIndices(index: number) {
        const cubieLocation: string[] = [];

        // x axis (index determines left, middle, right)
        if (index < 9) {
            sideIndices["left"].push(index);
            cubieLocation.push("left");
        } else if (index < 18) {
            sideIndices["middle"].push(index);
            cubieLocation.push("middle");
        } else {
            sideIndices["right"].push(index);
            cubieLocation.push("right");
        }

        // y axis (determines bottom, equator, top)
        if (index % 9 < 3) {
            sideIndices["bottom"].push(index);
            cubieLocation.push("bottom");
        } else if (index % 9 < 6) {
            sideIndices["equator"].push(index);
            cubieLocation.push("equator");
        } else {
            sideIndices["top"].push(index);
            cubieLocation.push("top");
        }

        // z axis (determines back, standing, front)
        if (index % 3 === 0) {
            sideIndices["back"].push(index);
            cubieLocation.push("back");
        } else if (index % 3 === 1) {
            sideIndices["standing"].push(index);
            cubieLocation.push("standing");
        } else {
            sideIndices["front"].push(index);
            cubieLocation.push("front");
        }

        // showError(`cubie ${index}: ${cubieLocation}`);

        return cubieLocation;
    }

    // Main loop to create cubies based on coordinates and index positions
    let index = 0;
    for (let x of COORDINATES) {
        for (let y of COORDINATES) {
            for (let z of COORDINATES) {
                const cubieLocation = populateSideIndices(index);
                cubies.push(new Cubie(x, y, z, cubieLocation));
                index++;
            }
        }
    }

    return { cubies, sideIndices };
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

import { CUBE_INDICES, CUBE_VERTICES } from "./geometry";
import { create3dPosColorInterleavedVao, createProgram, createStaticIndexBuffer, createStaticVertexBuffer, getContext, showError } from "./gl-utils";
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

// worldRotation - rotation in world space

class Cube {
    private worldMatrix: mat4;
    private scaleVec: vec3;
    private rotationQuat: quat;

    constructor(private positionVec: vec3, public readonly vao: WebGLVertexArrayObject) {
        // Position (Translation)
        // the programmer sets the position vector during object instantiation

        // Scale
        this.scaleVec = vec3.fromValues(1, 1, 1);

        // Rotation
        this.rotationQuat = quat.create();
        const rotationAngle = 0;
        const rotationAxis = vec3.fromValues(1, 0, 0);
        quat.setAxisAngle(
            this.rotationQuat,
            rotationAxis,
            glMatrix.toRadian(rotationAngle)
        );

        // World Matrix
        this.worldMatrix = mat4.create();
    }

    draw(
        gl: WebGL2RenderingContext,
        matWorldUniform: WebGLUniformLocation,
        worldRotationAngle: number,
        rotationAxis: vec3 = vec3.fromValues(1, 0, 0)
    ) {
        mat4.fromRotationTranslationScale(
            this.worldMatrix,
            this.rotationQuat,
            this.positionVec,
            this.scaleVec
        )

        // create a rotation matrix
        const worldRotationMatrix = mat4.create();
        mat4.fromRotation(worldRotationMatrix, glMatrix.toRadian(worldRotationAngle), rotationAxis);
        mat4.multiply(this.worldMatrix, worldRotationMatrix, this.worldMatrix);

        gl.uniformMatrix4fv(matWorldUniform, false, this.worldMatrix);

        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, CUBE_INDICES.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}

let sideToRotate: string, turns = 0;

function loadScene() {
    const canvas = document.querySelector("#demo-canvas");
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        showError("Encountered an error finding the canvas element");
        return;
    }
    const gl = getContext(canvas);

    const program = createProgram(gl, vertexShaderSourceCode, fragmentShaderSourceCode);
    if (!program) {
        showError("Encountered an error creating program");
        return;
    }

    // get position & color attribute location
    const posAttrib = gl.getAttribLocation(program, "vertexPosition");
    const colorAttrib = gl.getAttribLocation(program, "vertexColor");
    const matWorldUniform = gl.getUniformLocation(program, "matWorld");
    const matProjViewUniform = gl.getUniformLocation(program, "matProjView");

    if (posAttrib < 0 || colorAttrib < 0 || !matWorldUniform || !matProjViewUniform) {
        showError(`Could not find attribs/uniforms:
            posAttrib = ${posAttrib}
            colorAttrib = ${colorAttrib}
            matWorldUniform = ${matWorldUniform}
            matProjViewUniform = ${matProjViewUniform}`)
        return;
    }

    // create vertex buffer (vertex + color info)
    const vertexBuffer = createStaticVertexBuffer(gl, CUBE_VERTICES);
    if (!vertexBuffer) {
        showError("Encountered an error creating vertex buffer");
        return;
    }
    // create index buffer
    const indexBuffer = createStaticIndexBuffer(gl, CUBE_INDICES);
    if (!indexBuffer) {
        showError("Encountered an error creating index buffer");
        return;
    }

    // create and bind vao
    const vao = create3dPosColorInterleavedVao(gl, vertexBuffer, indexBuffer, posAttrib, colorAttrib);
    if (!vao) {
        showError(`Failed to create VAO:
            vao = ${vao}`);
        return;
    }

    const matView = mat4.create();
    const matProj = mat4.create();

    const cubies = [
        // Top Layer (horizontal)
        new Cube(vec3.fromValues(2.25, 2.25, 0), vao), // right 1
        new Cube(vec3.fromValues(-2.25, 2.25, 0), vao), // left 1
        new Cube(vec3.fromValues(0, 2.25, 2.25), vao), // front 1
        new Cube(vec3.fromValues(0, 2.25, -2.25), vao), // back 1
        new Cube(vec3.fromValues(0, 2.25, 0), vao),
        new Cube(vec3.fromValues(2.25, 2.25, 2.25), vao), // right 0, front 2
        new Cube(vec3.fromValues(2.25, 2.25, -2.25), vao), // right 2, back 0
        new Cube(vec3.fromValues(-2.25, 2.25, 2.25), vao), // front 0, left 2
        new Cube(vec3.fromValues(-2.25, 2.25, -2.25), vao), // back 2, left 0

        // Middle Layer (horizontal)
        new Cube(vec3.fromValues(2.25, 0, 0), vao), // right 4
        new Cube(vec3.fromValues(-2.25, 0, 0), vao), // left 4
        new Cube(vec3.fromValues(0, 0, 2.25), vao), // front 4
        new Cube(vec3.fromValues(0, 0, -2.25), vao), // back 4
        new Cube(vec3.fromValues(0, 0, 0), vao), // core
        new Cube(vec3.fromValues(2.25, 0, 2.25), vao), // right 3, front 5
        new Cube(vec3.fromValues(2.25, 0, -2.25), vao), // right 5, back 3
        new Cube(vec3.fromValues(-2.25, 0, 2.25), vao), // front 3, left 5
        new Cube(vec3.fromValues(-2.25, 0, -2.25), vao), // back 5, left 3

        // Bottom Layer (horizontal)
        new Cube(vec3.fromValues(2.25, -2.25, 0), vao), // right 7
        new Cube(vec3.fromValues(-2.25, -2.25, 0), vao), // left 7
        new Cube(vec3.fromValues(0, -2.25, 2.25), vao), // front 7
        new Cube(vec3.fromValues(0, -2.25, -2.25), vao), // back 7
        new Cube(vec3.fromValues(0, -2.25, 0), vao),
        new Cube(vec3.fromValues(2.25, -2.25, 2.25), vao), // right 6, front 8
        new Cube(vec3.fromValues(2.25, -2.25, -2.25), vao), // right 8, back 6
        new Cube(vec3.fromValues(-2.25, -2.25, 2.25), vao), // front 6, left 8
        new Cube(vec3.fromValues(-2.25, -2.25, -2.25), vao), // back 8, left 6
    ]

    const sideIndices: Record<string, number[]> = {
        "front": [
            2, 5, 7,
            11, 14, 16,
            20, 23, 25,
        ],
        "back": [
            3, 6, 8,
            12, 15, 17,
            21, 24, 26,
        ],
        "top": [
            0, 1, 2,
            3, 4, 5,
            6, 7, 8
        ],
        "bottom": [
            18, 19, 20,
            21, 22, 23,
            24, 25, 26,
        ],
        "left": [
            1, 7, 8,
            10, 16, 17,
            19, 25, 26,
        ],
        "right": [
            0, 5, 6,
            9, 14, 15,
            18, 23, 24,
        ]
    };

    const sideRotationAxes: Record<string, vec3> = {
        "front": vec3.fromValues(0, 0, 1),
        "back": vec3.fromValues(0, 0, -1),
        "top": vec3.fromValues(0, 1, 0),
        "bottom": vec3.fromValues(0, -1, 0),
        "right": vec3.fromValues(1, 0, 0),
        "left": vec3.fromValues(-1, 0, 0)
    };

    let angle = 0, speed = 1;
    let cubiesToRotate: number[], axisOfRotation: vec3;

    const frame = () => {
        // turning in progress
        if (turns != 0) {
            angle += speed;
        }

        // Render
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);

        gl.useProgram(program);

        mat4.lookAt(
            matView,
            vec3.fromValues(24, 24, 24),
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0),
        );

        mat4.perspective(
            matProj,
            glMatrix.toRadian(30),
            canvas.width / canvas.height,
            0.1,
            100.0,
        );

        const matProjView = mat4.create();
        mat4.multiply(matProjView, matProj, matView);

        gl.uniformMatrix4fv(matProjViewUniform, false, matProjView);

        // cubies.forEach((shape) => shape.draw(gl, matWorldUniform, 0));
        for (let i = 0; i < cubies.length; i++) {
            if (turns == 0) {
                cubies[i].draw(gl, matWorldUniform, 0);
            } else {
                cubiesToRotate = sideIndices[sideToRotate];
                axisOfRotation = sideRotationAxes[sideToRotate];

                console.log(cubiesToRotate)

                if (cubiesToRotate.includes(i)) {
                    cubies[i].draw(gl, matWorldUniform, turns * angle, axisOfRotation);
                }
                else {
                    cubies[i].draw(gl, matWorldUniform, 0);
                }
            }
        }

        // turning - completed
        if (angle == 90) {
            angle = 0;
            turns = 0;
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

try {
    loadScene();
} catch (e) {
    showError("You did sth wrong!");
}


function handleRotation(key: string, side: string) {
    showError(`You pressed ${key}`);
    turns = key === key.toLowerCase() ? -1 : 1;
    sideToRotate = side;
}

window.addEventListener("keydown", (event) => {
    if (event.key == "Shift") return;

    switch (event.key.toLowerCase()) {
        case "r":
            handleRotation(event.key, "right");
            break;
        case "l":
            handleRotation(event.key, "left");
            break;
        case "t":
            handleRotation(event.key, "top");
            break;
        case "b":
            handleRotation(event.key, "bottom");
            break;
        case "f":
            handleRotation(event.key, "front");
            break;
        case "k":
            handleRotation(event.key, "back");
            break;
    }

});
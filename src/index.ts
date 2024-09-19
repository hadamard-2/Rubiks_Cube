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
uniform mat4 worldRotation;

void main() {
  fragmentColor = vertexColor;

  gl_Position = matProjView * worldRotation * matWorld * vec4(vertexPosition, 1.0);
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
    private matWorld = mat4.create();
    private scaleVec = vec3.create();
    private rotation = quat.create();

    private numIndices = CUBE_INDICES.length;

    constructor(
        private position: vec3,
        public readonly vao: WebGLVertexArrayObject,
        private rotationAngle: number = 0,
        private rotationAxis: vec3 = vec3.fromValues(1, 0, 0),
        private scale: number = 1
    ) { }

    draw(gl: WebGL2RenderingContext, matWorldUniform: WebGLUniformLocation, worldRotationUniform: WebGLUniformLocation, theta: number, rotAxis: vec3 = vec3.fromValues(1, 0, 0)) {
        vec3.set(this.scaleVec, this.scale, this.scale, this.scale);
        quat.setAxisAngle(
            this.rotation,
            this.rotationAxis,
            glMatrix.toRadian(this.rotationAngle)
        );

        mat4.fromRotationTranslationScale(
            this.matWorld,
            this.rotation,
            this.position,
            this.scaleVec
        )

        // create a rotation matrix
        const worldRotationMatrix = mat4.create();
        mat4.fromRotation(worldRotationMatrix, glMatrix.toRadian(theta), rotAxis);

        gl.uniformMatrix4fv(matWorldUniform, false, this.matWorld);
        gl.uniformMatrix4fv(worldRotationUniform, false, worldRotationMatrix);

        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}

let globalTheta = 0, sideToRotate: string, performRotation = false;

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
    const worldRotationUniform = gl.getUniformLocation(program, "worldRotation");

    if (posAttrib < 0 || colorAttrib < 0 || !matWorldUniform || !matProjViewUniform || !worldRotationUniform) {
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

    let lastFrameTime = performance.now();
    let currentFrameTime, dt, localTheta = 0, cubiesToRotate, axisOfRotation;
    const frame = () => {
        currentFrameTime = performance.now();
        dt = (currentFrameTime - lastFrameTime) / 1000;
        lastFrameTime = currentFrameTime;

        const cubies = [
            // Top Layer (horizontal)
            new Cube(vec3.fromValues(2.25, 2.25, 0), vao), // left 1
            new Cube(vec3.fromValues(-2.25, 2.25, 0), vao),
            new Cube(vec3.fromValues(0, 2.25, 2.25), vao), // front 1
            new Cube(vec3.fromValues(0, 2.25, -2.25), vao),
            new Cube(vec3.fromValues(0, 2.25, 0), vao),
            new Cube(vec3.fromValues(2.25, 2.25, 2.25), vao), // left 0, front 2
            new Cube(vec3.fromValues(2.25, 2.25, -2.25), vao), // left 2
            new Cube(vec3.fromValues(-2.25, 2.25, 2.25), vao), // front 0
            new Cube(vec3.fromValues(-2.25, 2.25, -2.25), vao),

            // Middle Layer (horizontal)
            new Cube(vec3.fromValues(2.25, 0, 0), vao), // left 4
            new Cube(vec3.fromValues(-2.25, 0, 0), vao),
            new Cube(vec3.fromValues(0, 0, 2.25), vao), // front 4
            new Cube(vec3.fromValues(0, 0, -2.25), vao),
            new Cube(vec3.fromValues(0, 0, 0), vao), // core
            new Cube(vec3.fromValues(2.25, 0, 2.25), vao), // left 3, front 5
            new Cube(vec3.fromValues(2.25, 0, -2.25), vao), // left 5
            new Cube(vec3.fromValues(-2.25, 0, 2.25), vao), // front 3
            new Cube(vec3.fromValues(-2.25, 0, -2.25), vao),

            // Bottom Layer (horizontal)
            new Cube(vec3.fromValues(2.25, -2.25, 0), vao), // left 7
            new Cube(vec3.fromValues(-2.25, -2.25, 0), vao),
            new Cube(vec3.fromValues(0, -2.25, 2.25), vao), // front 7
            new Cube(vec3.fromValues(0, -2.25, -2.25), vao),
            new Cube(vec3.fromValues(0, -2.25, 0), vao),
            new Cube(vec3.fromValues(2.25, -2.25, 2.25), vao), // left 6, front 8
            new Cube(vec3.fromValues(2.25, -2.25, -2.25), vao), // left 8
            new Cube(vec3.fromValues(-2.25, -2.25, 2.25), vao), // front 6
            new Cube(vec3.fromValues(-2.25, -2.25, -2.25), vao),
        ]

        const sideIndices: Record<string, number[]> = {
            "front": [
                2, 5, 7,
                11, 14, 16,
                20, 23, 25,
            ],
            "back": [],
            "top": [],
            "bottom": [],
            "left": [
                0, 5, 6,
                9, 14, 15,
                18, 23, 24,
            ],
            "right": []
        };

        const sideRotAxes: Record<string, vec3> = {
            "front": vec3.fromValues(0, 0, 1),
            "back": vec3.fromValues(0, 0, -1),
            "top": vec3.fromValues(0, 1, 0),
            "bottom": vec3.fromValues(0, -1, 0),
            "left": vec3.fromValues(1, 0, 0),
            "right": vec3.fromValues(1, 0, 0)
        };

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

        if (performRotation && (Math.abs(localTheta) <= Math.abs(globalTheta))) {
            localTheta += dt * 200;
        }
        for (let i = 0; i < cubies.length; i++) {
            // on a normal day, this should apply 0 rotation to all cubies
            // when performRotation is set to true, it rotates sideToRotate by the given angle
            // actually rotation is done incremental starting from 0 until it reaches the angle specified in global theta
            if (!performRotation) {
                cubies[i].draw(gl, matWorldUniform, worldRotationUniform, 0);
            } else {
                // perform rotation
                cubiesToRotate = sideIndices[sideToRotate];
                axisOfRotation = sideRotAxes[sideToRotate];

                if (cubiesToRotate.includes(i)) {
                    cubies[i].draw(gl, matWorldUniform, worldRotationUniform, localTheta, axisOfRotation);
                } else {
                    cubies[i].draw(gl, matWorldUniform, worldRotationUniform, 0);
                }
            }
        }

        // if (localTheta > globalTheta) {
        //     localTheta = 0;
        //     cubiesToRotate = [];
        //     performRotation = false;
        // }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

try {
    loadScene();
} catch (e) {
    showError("You did sth wrong!");
}



window.addEventListener("keydown", (event) => {
    if (event.key == "Shift") return;

    if (event.key == "l") { // L
        showError("NotAnError: you just pressed: " + event.key)
        // tell the world to perform a -90 degree rotation of the left side
        performRotation = true;
        sideToRotate = "left";
        globalTheta = -90;
    } else if (event.key == "L") { // L'
        showError("NotAnError: you just pressed: " + event.key)
        // tell the world to perform a 90 degree rotation of the left side
        performRotation = true;
        sideToRotate = "left";
        globalTheta = 90;
    } else if (event.key == "f") { // F
        showError("NotAnError: you just pressed: " + event.key)
        // tell the world to perform a -90 degree rotation of the left side
        performRotation = true;
        sideToRotate = "front";
        globalTheta = -90;
    } else if (event.key == "F") { // F'
        showError("NotAnError: you just pressed: " + event.key)
        // tell the world to perform a 90 degree rotation of the left side
        performRotation = true;
        sideToRotate = "front";
        globalTheta = 90;
    }
});
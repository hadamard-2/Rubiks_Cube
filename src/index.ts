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

    draw(gl: WebGL2RenderingContext, matWorldUniform: WebGLUniformLocation) {
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

        // perform rotation

        gl.uniformMatrix4fv(matWorldUniform, false, this.matWorld);

        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}

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

    let lastFrameTime = performance.now();
    let currentFrameTime, dt, theta = 0;
    const frame = () => {
        currentFrameTime = performance.now();
        dt = (currentFrameTime - lastFrameTime) / 1000;
        lastFrameTime = currentFrameTime;

        // theta += dt * 200;
        // Update
        const cubies = [
            // Top Layer (horizontal)
            new Cube(vec3.fromValues(2.25, 2.25, 0), vao), // left 1
            new Cube(vec3.fromValues(-2.25, 2.25, 0), vao),
            new Cube(vec3.fromValues(0, 2.25, 2.25), vao),
            new Cube(vec3.fromValues(0, 2.25, -2.25), vao),
            new Cube(vec3.fromValues(0, 2.25, 0), vao),
            new Cube(vec3.fromValues(2.25, 2.25, 2.25), vao), // left 0
            new Cube(vec3.fromValues(2.25, 2.25, -2.25), vao), // left 2
            new Cube(vec3.fromValues(-2.25, 2.25, 2.25), vao),
            new Cube(vec3.fromValues(-2.25, 2.25, -2.25), vao),

            // Middle Layer (horizontal)
            new Cube(vec3.fromValues(2.25, 0, 0), vao), // left 4
            new Cube(vec3.fromValues(-2.25, 0, 0), vao),
            new Cube(vec3.fromValues(0, 0, 2.25), vao),
            new Cube(vec3.fromValues(0, 0, -2.25), vao),
            new Cube(vec3.fromValues(0, 0, 0), vao), // core
            new Cube(vec3.fromValues(2.25, 0, 2.25), vao), // left 3
            new Cube(vec3.fromValues(2.25, 0, -2.25), vao), // left 5
            new Cube(vec3.fromValues(-2.25, 0, 2.25), vao),
            new Cube(vec3.fromValues(-2.25, 0, -2.25), vao),

            // Bottom Layer (horizontal)
            new Cube(vec3.fromValues(2.25, -2.25, 0), vao), // left 7
            new Cube(vec3.fromValues(-2.25, -2.25, 0), vao),
            new Cube(vec3.fromValues(0, -2.25, 2.25), vao),
            new Cube(vec3.fromValues(0, -2.25, -2.25), vao),
            new Cube(vec3.fromValues(0, -2.25, 0), vao),
            new Cube(vec3.fromValues(2.25, -2.25, 2.25), vao), // left 6
            new Cube(vec3.fromValues(2.25, -2.25, -2.25), vao), // left 8
            new Cube(vec3.fromValues(-2.25, -2.25, 2.25), vao),
            new Cube(vec3.fromValues(-2.25, -2.25, -2.25), vao),
        ]


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

        cubies.forEach((cubie) => cubie.draw(gl, matWorldUniform));

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

try {
    loadScene();
} catch (e) {
    showError("You did sth wrong!");
}
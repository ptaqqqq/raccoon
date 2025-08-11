<script lang="ts">
  import vsSource from '$lib/assets/shaders/mandelbrot.vert?raw';
  import fsSource from '$lib/assets/shaders/mandelbrot.frag?raw';
    import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;
  let gl: WebGL2RenderingContext, program: WebGLProgram, vao: WebGLVertexArrayObject;
  let uResolution: WebGLUniformLocation, uCenter: WebGLUniformLocation, uZoom: WebGLUniformLocation;

  let center = $state([0.2979207, 0.02111325]);
  let zoom = $state(1.0);

  function createShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('Failed to create shader');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('error compiling shader');
    }
    return sh;
  }

  function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('error linking program');
    }
    return p;
  }

  function initGL() {
    gl = canvas.getContext('webgl2')!;
    if (!gl) throw new Error('WebGL2 required');

    const quad = new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]);
    vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    program = createProgram(gl, vsSource, fsSource);
    uResolution = gl.getUniformLocation(program, 'uResolution')!;
    uCenter     = gl.getUniformLocation(program, 'uCenter')!;
    uZoom       = gl.getUniformLocation(program, 'uZoom')!;

  }

  function render() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(uCenter, center[0], center[1]);
    gl.uniform1f(uZoom, zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  $effect(() => {
    if (!canvas) return;
    initGL();
    requestAnimationFrame(render);

    // ---------- DPR-aware resize ----------
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width  * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    resize();
  });
</script>

<!-- svelte-ignore element_invalid_self_closing_tag -->
<canvas id="shader-canvas" bind:this={canvas} />

<style>
  #shader-canvas {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
</style>

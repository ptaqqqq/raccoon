<script>
  import vsSource from '$lib/assets/shaders/mandelbrot.vert?raw';
  import fsSource from '$lib/assets/shaders/mandelbrot.frag?raw';

  let canvas;
  let gl, program, vao;
  let uResolution, uCenter, uZoom;

  let center = $state([0.2979207, 0.02111325]);
  let zoom = $state(1.0);

  function createShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  function initGL() {
    gl = canvas.getContext('webgl2');
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
    uResolution = gl.getUniformLocation(program, 'uResolution');
    uCenter     = gl.getUniformLocation(program, 'uCenter');
    uZoom       = gl.getUniformLocation(program, 'uZoom');
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
  });
</script>

<canvas bind:this={canvas} width="800" height="600" />

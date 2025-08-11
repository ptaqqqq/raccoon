<script lang="ts">
  import vsSource from '$lib/assets/shaders/mandelbrot.vert?raw';
  import fsSource from '$lib/assets/shaders/mandelbrot.frag?raw';
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;
  let gl: WebGL2RenderingContext, program: WebGLProgram, vao: WebGLVertexArrayObject;
  let uResolution: WebGLUniformLocation, uCenter: WebGLUniformLocation, uZoom: WebGLUniformLocation, uHueShift: WebGLUniformLocation, uSaturation: WebGLUniformLocation, uTime: WebGLUniformLocation;

  let center = $state([0.2979207, 0.02111325]);
  // let center = $state([0.298, 0.02121325]); // find better center coords
  // let center = $state([0.0, 0.0]);
  let intgrlScroll = $state(0.0);
  let zoom = $derived(Math.exp(intgrlScroll));
  let saturation = $state(1.0);

  // --- Minimal audio autostart (no controls) ---
  let audio: HTMLAudioElement | null = null;
  let audioStarted = false;
  

  function ensureAudio() {
    if (audioStarted) return;
    if (!audio) audio = new Audio();
    audio.src = "$lib/assets/fractal_entry.mp3";
    audio.loop = true; // optional; remove if not desired
    audio.play().then(() => { audioStarted = true; }).catch(() => {
      // Autoplay blocked until gesture; we'll retry on next interaction
    });
  }

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
    uHueShift       = gl.getUniformLocation(program, 'uHueShift')!;
    uSaturation = gl.getUniformLocation(program, 'uSaturation')!;
    uTime       = gl.getUniformLocation(program, 'uTime')!;
  }

  let t0 = 0; // ms
  function render() {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(uCenter, center[0], center[1]);
    gl.uniform1f(uZoom, zoom);
    gl.uniform1f(uSaturation, saturation);
    gl.uniform1f(uHueShift, performance.now() % 3000.0/ 3000.0);
    const tSec = (performance.now() - t0) / 1000;
    gl.uniform1f(uTime, tSec);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
    zoom *= 1.009
  }

  $effect(() => {
    if (!canvas) return;
  initGL();
  t0 = performance.now();
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


  function handleWheel(e: WheelEvent) {
  ensureAudio();
    intgrlScroll -= 0.0015 * e.deltaY;
  }

  onMount(() => {
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => {
			window.removeEventListener('wheel', handleWheel);
		};
	});

  // the vector you want to accumulate into:
  let v = $state<[number, number]>([0, 0]);

  let dragging = false;
  let lastX = 0, lastY = 0;

  // pixels → your units (1 = raw pixels)
  let scaleX = 1;
  let scaleY = 1;

  function down(e: PointerEvent) {
  ensureAudio();
    dragging = true;
    canvas.setPointerCapture(e.pointerId); // keep moves on this element
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function move(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    const r = canvas.getBoundingClientRect();
    const sx = 1 / r.width;
    const sy = -1 / r.height; // flip y to typical math/webgl coords
    const invZoom = 1.0 / zoom;

    v = [v[0] - dx * sx * invZoom, v[1] - dy * sy * invZoom];
    center = v;
  }

  function up(e: PointerEvent) {
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
  }
</script>

<!-- svelte-ignore element_invalid_self_closing_tag -->
<canvas id="shader-canvas" bind:this={canvas} 
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  style="touch-action:none; user-select:none;"
/>

<style>
  #shader-canvas {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
  }
</style>

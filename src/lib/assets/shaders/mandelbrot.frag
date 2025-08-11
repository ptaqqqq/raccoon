#version 300 es
precision highp float;

uniform vec2  uResolution;   // px
uniform vec2  uCenter;       // reference center c0
uniform float uZoom;         // 1.0 => ~[-2,2] span horizontally
uniform float uHueShift;
uniform float uSaturation;
uniform float uTime;         // seconds since start (for intro grayscale)

out vec4 outColor;

const int   ITERATIONS = 1024;
const float BAILOUT2   = 4.0;

vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

// --- utils ---
vec2 cplxSq(vec2 z) { return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y); }

float aspectCorrectSpanY(float spanX, vec2 res) {
    return spanX * (res.y / res.x);
}

// Smooth palette (IQ-style)
vec3 iqPalette(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return hsv2rgb(rgb2hsv(a + b * cos(6.28318530718 * (c * t + d))) * vec3(1.0, uSaturation, 1.0) + vec3(uHueShift, 0.0, 0.0));
}

// Cardioid/bulb interior test (early black)
bool inMainBulbs(vec2 c){
    float x = c.x, y = c.y;
    // main cardioid
    float xq = x - 0.25;
    float q = xq*xq + y*y;
    if (q * (q + xq) < 0.25 * y*y) return true;
    // period-2 bulb
    float dx = x + 1.0;
    if (dx*dx + y*y < 0.0625) return true;
    return false;
}

void main(){
    // --- pixel -> complex delta relative to center ---
    float spanX = 4.0 / max(uZoom, 1e-6);              // horizontal span in complex plane
    float spanY = aspectCorrectSpanY(spanX, uResolution);
    vec2 dC = vec2(
        (gl_FragCoord.x - 0.5 * uResolution.x) * (spanX / uResolution.x),
        (gl_FragCoord.y - 0.5 * uResolution.y) * (spanY / uResolution.y)
    );

    vec2 c0 = uCenter;
    vec2 c  = c0 + dC;

    // Early interior fill: avoids useless iteration in big bulbs
    if (inMainBulbs(c)) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // --- perturbation iteration ---
    // z_ref_{0}=0, δz_{0}=0; then
    // δz_{n+1} = 2*z_ref_n*δz_n + (δz_n)^2 + δc
    // z_{n+1}  = z_ref_{n+1} + δz_{n+1}
    vec2 zref = vec2(0.0);
    vec2 dz   = vec2(0.0);

    float escIter = float(ITERATIONS);
    float lastMag = 0.0;

    for (int i = 0; i < ITERATIONS; ++i) {
        // δz_{n+1} from current (zref_n, dz_n)
        vec2 dz2    = cplxSq(dz);
        vec2 two_zd = vec2(
            2.0*(zref.x * dz.x - zref.y * dz.y),
            2.0*(zref.x * dz.y + zref.y * dz.x)
        );
        vec2 dzNext = two_zd + dz2 + dC;

        // z_ref_{n+1}
        vec2 zrefNext = cplxSq(zref) + c0;

        // z_{n+1} = zrefNext + dzNext
        vec2 z = zrefNext + dzNext;
        float m2 = dot(z, z);
        lastMag = sqrt(m2);

        if (m2 > BAILOUT2) {
            escIter = float(i + 1);
            break;
        }

        // advance
        dz   = dzNext;
        zref = zrefNext;

        // Optional safety: if |dz| gets very large, perturbation loses accuracy.
        // if (dot(dz, dz) > 1e8) break;
    }

    // Smooth (continuous) coloring
    if (escIter < float(ITERATIONS)) {
        // μ = i + 1 - log2(log|z|)
        float mu = escIter + 1.0 - log2(max(log(max(lastMag, 1e-38)), 1e-38)); // prob the color
        float t  = clamp(mu / float(ITERATIONS), 0.0, 1.0);
        vec3 col = iqPalette(t);
    // Intro: grayscale for the first ~5s, then smoothly blend to color
    float k = smoothstep(4.0, 5.0, uTime); // 0->1 around 4..5s
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 finalCol = mix(vec3(gray), col, k);
        outColor = vec4(finalCol, 1.0);
    } else {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}

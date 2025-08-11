#version 300 es
precision highp float;

uniform vec2  uResolution;   // px
uniform vec2  uCenter;       // complex-plane center, e.g. vec2(0.2979207, 0.02111325)
uniform float uZoom;         // 1.0 = full [-2,2] span; higher = zoom in

out vec4 outColor;

const int ITERATIONS = 1024;

vec3 hsv2rgb(in vec3 c){
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 boundColor() { 
    return vec4(0.0, 0.0, 0.0, 1.0); 
}

vec4 unboundColor(in int iterations){
    return vec4(hsv2rgb(vec3(float(iterations)/float(ITERATIONS), 1.0, 1.0)), 1.0);
}

vec2 complexSquare(in vec2 z){
    return vec2((z.x - z.y) * (z.x + z.y), 2.0 * z.x * z.y);
}

void main(){
    vec2 fragCoord = gl_FragCoord.xy;

    vec2 span = vec2(4.0, 4.0) / max(uZoom, 1e-6); // guard div by 0
    float aspect = uResolution.x / uResolution.y;
    vec2 aspectMul = vec2(1.0, 1.0 / aspect);

    vec2 uv = fragCoord / uResolution.x;
    vec2 c  = (uv - 0.5 * aspectMul) * span + uCenter;   

    vec2 z = vec2(0.0);
    for (int i = 0; i < ITERATIONS; ++i){
        z = complexSquare(z) + c;
        if (dot(z, z) > 4.0){ // |z|^2 > 4 => escaped
            outColor = unboundColor(i);
            return;
        }
    }
    outColor = boundColor();
}

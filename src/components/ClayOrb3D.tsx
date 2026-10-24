'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ClayOrb3DProps {
  className?: string;
  onMouseMoveCoords?: (coords: { x: number; y: number; normX: number; normY: number }) => void;
}

export function ClayOrb3D({ className = '', onMouseMoveCoords }: ClayOrb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse coordinates with smoothing (lerp)
  const targetMouse = useRef({ x: 0, y: 0 });
  const currentMouse = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  // WebGL context and program refs
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uniformsRef = useRef<{
    u_resolution: WebGLUniformLocation | null;
    u_time: WebGLUniformLocation | null;
    u_mouse: WebGLUniformLocation | null;
    u_hover: WebGLUniformLocation | null;
  } | null>(null);

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS rendering');
      return;
    }

    glRef.current = gl;

    // Vertex Shader
    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment Shader: Raymarched organic clay metaballs with dynamic mouse look & specular lighting
    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_hover;

      // Smooth minimum for organic clay metaball blending
      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      // 3D rotation matrices
      mat3 rotateY(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat3(
          c, 0.0, s,
          0.0, 1.0, 0.0,
          -s, 0.0, c
        );
      }

      mat3 rotateX(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat3(
          1.0, 0.0, 0.0,
          0.0, c, -s,
          0.0, s, c
        );
      }

      mat3 rotateZ(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat3(
          c, -s, 0.0,
          s, c, 0.0,
          0.0, 0.0, 1.0
        );
      }

      // Signed distance function for the clay metaball sculpture
      float map(vec3 p) {
        // Apply interactive mouse rotation + slow ambient floating
        float rotX = u_mouse.y * 0.75 + sin(u_time * 0.45) * 0.06;
        float rotY = u_mouse.x * 1.05 + u_time * 0.1;
        float rotZ = -0.22 + sin(u_time * 0.35) * 0.04;

        mat3 rot = rotateZ(rotZ) * rotateX(rotX) * rotateY(rotY);
        vec3 q = rot * p;

        // Subtle organic breathing deformation
        float breath = 1.0 + sin(u_time * 1.1) * 0.02;

        // Sphere 1: Primary central clay form
        float d1 = length(q - vec3(0.0, -0.02, 0.0)) - (0.68 * breath);

        // Sphere 2: Top-right bulbous clay mass (matches user reference video/screenshot)
        vec3 p2 = vec3(0.48, 0.50, -0.16) * breath;
        float d2 = length(q - p2) - 0.44;

        // Sphere 3: Bottom-left organic node
        vec3 p3 = vec3(-0.45, -0.38, 0.15) * breath;
        float d3 = length(q - p3) - 0.35;

        // Sphere 4: Side accent node for liquid clay curvature
        vec3 p4 = vec3(0.40, -0.26, 0.24) * breath;
        float d4 = length(q - p4) - 0.28;

        // Smooth blend the metaball primitives
        float blend1 = smin(d1, d2, 0.30);
        float blend2 = smin(blend1, d3, 0.26);
        float finalShape = smin(blend2, d4, 0.24);

        return finalShape;
      }

      // Surface normal estimation
      vec3 calcNormal(vec3 p) {
        const float eps = 0.002;
        const vec2 h = vec2(eps, 0.0);
        return normalize(vec3(
          map(p + h.xyy) - map(p - h.xyy),
          map(p + h.yxy) - map(p - h.yxy),
          map(p + h.yyx) - map(p - h.yyx)
        ));
      }

      void main() {
        // Centered coordinate system tailored for the center-right hero stage
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

        // Camera setup
        vec3 ro = vec3(0.0, 0.0, 2.85); // Ray origin
        vec3 rd = normalize(vec3(uv, -1.65)); // Ray direction

        // Bounding sphere acceleration
        float bDist = length(cross(ro, rd));
        if (bDist > 1.4) {
          gl_FragColor = vec4(0.0);
          return;
        }

        // Raymarching loop
        float t = 1.0;
        float hit = 0.0;
        for (int i = 0; i < 50; i++) {
          vec3 p = ro + rd * t;
          float d = map(p);
          if (d < 0.001) {
            hit = 1.0;
            break;
          }
          t += d * 0.85;
          if (t > 4.4) break;
        }

        if (hit > 0.5) {
          vec3 p = ro + rd * t;
          vec3 n = calcNormal(p);
          vec3 v = -rd;

          // Light positions that react to mouse position
          vec3 lightPos1 = normalize(vec3(-0.45 + u_mouse.x * 0.35, 0.65 - u_mouse.y * 0.25, 1.1));
          vec3 lightPos2 = normalize(vec3(0.85, -0.65, 0.4));

          // Diffuse terms with smooth wrap for satin clay
          float diff1 = max(dot(n, lightPos1), 0.0);
          float diff2 = max(dot(n, lightPos2), 0.0);

          // Subsurface scattering approximation (warm peach-copper wrap)
          float sss = pow(clamp(dot(v, -lightPos1) * 0.5 + 0.5, 0.0, 1.0), 2.2);

          // Soft satin Blinn-Phong specular (luxurious matte finish, no harsh white flare)
          vec3 h1 = normalize(lightPos1 + v);
          float specSatin = pow(max(dot(n, h1), 0.0), 16.0) * 0.32;
          float specGlint = pow(max(dot(n, h1), 0.0), 38.0) * 0.25;

          // Fresnel / rim lighting for 3D depth separation
          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.6);

          // Palette tuned to Joseph Akinwole's terracotta/peach-clay brand:
          vec3 deepShadow = vec3(0.24, 0.11, 0.08);
          vec3 midTone    = vec3(0.86, 0.48, 0.34);
          vec3 warmPeach  = vec3(0.96, 0.66, 0.52);
          vec3 softSheen  = vec3(1.0, 0.88, 0.78);
          vec3 rimColor   = vec3(1.0, 0.78, 0.62);

          // Gradient color assembly
          vec3 col = mix(deepShadow, midTone, diff1 * 0.75 + 0.25);
          col = mix(col, warmPeach, pow(diff1, 1.3) * 0.65);
          col += sss * vec3(0.88, 0.38, 0.22) * 0.35;
          col += diff2 * vec3(0.35, 0.18, 0.12) * 0.25;
          col += fresnel * rimColor * 0.45;
          col += (specSatin * warmPeach + specGlint * softSheen);

          // Subtle ambient warmth
          col += vec3(0.03, 0.015, 0.01);

          // Edge anti-aliasing falloff
          float edgeAlpha = smoothstep(4.3, 4.0, t);

          gl_FragColor = vec4(col, edgeAlpha);
        } else {
          // Soft radial ambient warmth in background
          float dCenter = length(uv);
          float glow = exp(-dCenter * 3.4) * 0.12;
          vec3 glowCol = vec3(0.92, 0.45, 0.26) * glow;
          gl_FragColor = vec4(glowCol, glow * 0.6);
        }
      }
    `;

    // Compile shader helper
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
      u_hover: gl.getUniformLocation(program, 'u_hover'),
    };
  }, []);

  // Handle resizing and WebGL render loop
  useEffect(() => {
    initWebGL();

    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const gl = glRef.current;
        if (gl) {
          gl.viewport(0, 0, width, height);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const startTime = performance.now();

    const render = () => {
      const gl = glRef.current;
      const uniforms = uniformsRef.current;
      const canvas = canvasRef.current;

      if (gl && uniforms && canvas) {
        // Smooth mouse lerping
        currentMouse.current.x += (targetMouse.current.x - currentMouse.current.x) * 0.08;
        currentMouse.current.y += (targetMouse.current.y - currentMouse.current.y) * 0.08;

        const elapsedTime = (performance.now() - startTime) * 0.001;

        gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.u_time, elapsedTime);
        gl.uniform2f(uniforms.u_mouse, currentMouse.current.x, currentMouse.current.y);
        gl.uniform1f(uniforms.u_hover, isHovered ? 1.0 : 0.0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [initWebGL, isHovered]);

  // Window-wide mouse tracking for interactive 3D mouse look
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const normX = (clientX / window.innerWidth) * 2 - 1; // -1 to 1
      const normY = (clientY / window.innerHeight) * 2 - 1;

      targetMouse.current = {
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, -normY)),
      };

      if (onMouseMoveCoords) {
        onMouseMoveCoords({
          x: clientX,
          y: clientY,
          normX,
          normY,
        });
      }

      // Update CSS variables on document for multi-element 3D parallax
      if (containerRef.current) {
        containerRef.current.style.setProperty('--m-x', normX.toFixed(3));
        containerRef.current.style.setProperty('--m-y', normY.toFixed(3));
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [onMouseMoveCoords]);

  return (
    <div
      ref={containerRef}
      className={`clay-orb-viewport ${className}`.trim()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        perspective: '1200px',
      }}
    >
      {/* 3D WebGL Canvas for Procedural Clay Metaballs */}
      <canvas
        ref={canvasRef}
        className="clay-orb-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 20px 48px rgba(243, 109, 69, 0.16))',
        }}
      />

      {/* 3D Multi-Layered Orbital Rings that tilt with mouse look */}
      <div className="clay-orb-orbital-system" aria-hidden="true">
        <div className="orbital-ring orbital-ring--primary" />
        <div className="orbital-ring orbital-ring--secondary" />
        <div className="orbital-ring orbital-ring--tertiary" />
        <div className="orbital-ring orbital-ring--equatorial" />

        {/* Orbiting ember sparks */}
        <div className="orbital-ember orbital-ember--1"><span /><i /></div>
        <div className="orbital-ember orbital-ember--2"><span /><i /></div>
        <div className="orbital-ember orbital-ember--3"><span /><i /></div>
        <div className="orbital-ember orbital-ember--4"><span /><i /></div>
      </div>

      {/* Atmospheric ambient warm glow backdrop */}
      <div className="clay-orb-ambient-glow" aria-hidden="true" />
    </div>
  );
}

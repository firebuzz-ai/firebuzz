"use client";

import { shaderMaterial, useTrailTexture } from "@react-three/drei";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { useTheme } from "next-themes"; // lub twój provider
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const DotMaterial = shaderMaterial(
  {
    time: 0,
    resolution: new THREE.Vector2(),
    dotColor: new THREE.Color("#FFFFFF"),
    bgColor: new THREE.Color("#121212"),
    mouseTrail: null,
    render: 0,
    rotation: 0,
    gridSize: 50,
    dotOpacity: 0.05,
  },
  /* glsl */ `
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform int render;
    uniform vec2 resolution;
    uniform vec3 dotColor;
    uniform vec3 bgColor;
    uniform sampler2D mouseTrail;
    uniform float rotation;
    uniform float gridSize;
    uniform float dotOpacity;

    vec2 rotate(vec2 uv, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotationMatrix = mat2(c, -s, s, c);
        return rotationMatrix * (uv - 0.5) + 0.5;
    }

    vec2 coverUv(vec2 uv) {
      vec2 s = resolution.xy / max(resolution.x, resolution.y);
      vec2 newUv = (uv - 0.5) * s + 0.5;
      return clamp(newUv, 0.0, 1.0);
    }

    float sdfCircle(vec2 p, float r) {
        return length(p - 0.5) - r;
    }

    // Signed distance to an axis-aligned box centered at 0.5 with half-size b
    float sdfBox(vec2 p, vec2 b) {
        vec2 d = abs(p - 0.5) - b;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    void main() {
      vec2 screenUv = gl_FragCoord.xy / resolution;
      vec2 uv = coverUv(screenUv);

      vec2 rotatedUv = rotate(uv, rotation);

      // Create a grid
      vec2 gridUv = fract(rotatedUv * gridSize);
      vec2 gridUvCenterInScreenCoords = rotate((floor(rotatedUv * gridSize) + 0.5) / gridSize, -rotation);

      // No screen mask; reveal only via cursor trail

      // Mouse trail effect
      float mouseInfluence = texture2D(mouseTrail, gridUvCenterInScreenCoords).r;
      
      float scaleInfluence = mouseInfluence;

      // Create squares that grow slightly with mouse influence
      float dotSize = 0.18;

      float sdfDot = sdfBox(gridUv, vec2(dotSize * (1.0 + scaleInfluence * 0.6)));

      float smoothDot = smoothstep(0.05, 0.0, sdfDot);

      // Visibility driven only by the cursor trail; no ambient visibility
      float visibility = clamp(smoothDot * dotOpacity * (mouseInfluence * 5.0), 0.0, 1.0);

      // Mix background color with dot color based purely on cursor-driven visibility
      vec3 composition = mix(bgColor, dotColor, visibility);

      gl_FragColor = vec4(composition, 1.0);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
);

function Scene() {
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const { theme } = useTheme();

  const rotation = 0;
  const gridSize = 100;

  // no helper needed; will inline in effect

  const [trail, onMove] = useTrailTexture({
    size: 128,
    radius: 0.1,
    maxAge: 200,
    interpolate: 1,
    ease: function easeInOutCirc(x) {
      return x < 0.5
        ? (1 - Math.sqrt(1 - (2 * x) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * x + 2) ** 2) + 1) / 2;
    },
  });

  const dotMaterial = useMemo(() => {
    return new DotMaterial();
  }, []);

  useEffect(() => {
    const isDark = theme === "dark";
    const bgColor = isDark ? "#0A0A0A" : "#FFFFFF";
    const dotColor = "#f97f27";
    const dotOpacity = isDark ? 0.025 : 0.15;

    dotMaterial.uniforms.bgColor.value.setHex(bgColor.replace("#", "0x"));
    dotMaterial.uniforms.dotColor.value.setHex(dotColor.replace("#", "0x"));
    dotMaterial.uniforms.dotOpacity.value = dotOpacity;
  }, [dotMaterial, theme]);

  useFrame((state) => {
    dotMaterial.uniforms.time.value = state.clock.elapsedTime;
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    onMove(e);
  };

  const scale = Math.max(viewport.width, viewport.height) / 2;

  return (
    <mesh scale={[scale, scale, 1]} onPointerMove={handlePointerMove}>
      <planeGeometry args={[2, 2]} />
      <primitive
        object={dotMaterial}
        resolution={[size.width * viewport.dpr, size.height * viewport.dpr]}
        rotation={rotation}
        gridSize={gridSize}
        mouseTrail={trail}
        render={0}
      />
    </mesh>
  );
}

export const DotScreenShader = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        gl={{
          antialias: true,
          powerPreference: "low-power",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

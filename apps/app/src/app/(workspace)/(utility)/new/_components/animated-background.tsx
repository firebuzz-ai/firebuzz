"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useMemo, useRef } from "react";
import * as THREE from "three";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: {
    [key: string]: {
      value: number[] | number[][] | number;
      type: string;
    };
  };
}

interface AnimatedBackgroundProps {
  className?: string;
}

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  reverse?: boolean;
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="w-full h-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={
            opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]
          }
          shader={`
            ${reverse ? "u_reverse_active" : "false"}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
          center={["x", "y"]}
          reverse={reverse}
        />
      </div>
    </div>
  );
};

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
  reverse?: boolean;
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
  reverse,
}) => {
  const uniforms = React.useMemo(() => {
    let colorsArray = [
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
      colors[0],
    ];
    if (colors.length === 2) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[1],
      ];
    } else if (colors.length === 3) {
      colorsArray = [
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[2],
        colors[2],
      ];
    }

    // Parse animation speed from shader string
    const speedMatch = shader.match(/animation_speed_factor_([\d.]+)_/);
    const animationSpeed = speedMatch
      ? Number.parseFloat(speedMatch[1]) * 0.1
      : 0.05;

    return {
      u_colors: {
        value: colorsArray.map((color) => [
          color[0] / 255,
          color[1] / 255,
          color[2] / 255,
        ]),
        type: "uniform3fv",
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv",
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f",
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f",
      },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i",
      },
      u_animation_speed: {
        value: animationSpeed,
        type: "uniform1f",
      },
      u_transition_progress: {
        value: 0,
        type: "uniform1f",
      },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;
        uniform float u_animation_speed;
        uniform float u_transition_progress;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${
              center.includes("x")
                ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }
            ${
              center.includes("y")
                ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            // Add center fade for better readability
            vec2 center_pixel = u_resolution / 2.0;
            float pixel_dist_from_center = distance(fragCoord.xy, center_pixel);
            float max_pixel_dist = length(u_resolution / 2.0);
            float center_fade = smoothstep(0.0, 0.8, pixel_dist_from_center / max_pixel_dist);
            center_fade = mix(0.1, 1.0, center_fade); // Minimum 10% opacity at center, full at edges
            opacity *= center_fade;

            // Add edge fade for vignette effect
            float edge_fade = smoothstep(0.5, 1.0, pixel_dist_from_center / max_pixel_dist);
            edge_fade = mix(1.0, 0.2, edge_fade); // Full opacity at 50% distance, 20% at edges
            opacity *= edge_fade;

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            // Use smooth transition instead of hard switch to prevent flicker
            float forward_opacity = step(timing_offset_intro, u_time * u_animation_speed);
            forward_opacity *= clamp((1.0 - step(timing_offset_intro + 0.1, u_time * u_animation_speed)) * 1.25, 1.0, 1.25);
            
            float reverse_opacity = 1.0 - step(timing_offset_outro, u_time * u_animation_speed);
            reverse_opacity *= clamp((step(timing_offset_outro + 0.1, u_time * u_animation_speed)) * 1.25, 1.0, 1.25);
            
            // Smooth blend between forward and reverse based on transition progress
            opacity *= mix(forward_opacity, reverse_opacity, u_transition_progress);

            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      reverse={reverse}
    />
  );
};

const ShaderMaterial = ({
  source,
  uniforms,
  reverse,
}: {
  source: string;
  uniforms: Uniforms;
  reverse?: boolean;
}) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);
  const transitionStartTime = useRef<number | null>(null);
  const transitionDuration = 0.3; // 300ms transition

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();

    const material = ref.current.material as THREE.ShaderMaterial;
    const timeLocation = material.uniforms.u_time;

    // Handle smooth transition to reverse
    const transitionProgressLocation = material.uniforms.u_transition_progress;
    if (reverse) {
      if (transitionStartTime.current === null) {
        transitionStartTime.current = timestamp;
      }
      const elapsed = timestamp - transitionStartTime.current;
      const progress = Math.min(elapsed / transitionDuration, 1);
      transitionProgressLocation.value = progress;
    } else {
      transitionProgressLocation.value = 0;
      transitionStartTime.current = null;
    }

    // Always use continuous time to prevent flicker
    timeLocation.value = timestamp;
  });

  const getUniforms = useCallback(() => {
    const preparedUniforms: Record<string, { value: unknown; type?: string }> =
      {};

    for (const uniformName in uniforms) {
      const uniform = uniforms[uniformName];

      switch (uniform.type) {
        case "uniform1f":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
          break;
        case "uniform1i":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
          break;
        case "uniform3f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector3().fromArray(uniform.value as number[]),
            type: "3f",
          };
          break;
        case "uniform1fv":
          preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
          break;
        case "uniform3fv":
          preparedUniforms[uniformName] = {
            value: (uniform.value as number[][]).map((v: number[]) =>
              new THREE.Vector3().fromArray(v)
            ),
            type: "3fv",
          };
          break;
        case "uniform2f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector2().fromArray(uniform.value as number[]),
            type: "2f",
          };
          break;
        default:
          console.error(`Invalid uniform type for '${uniformName}'.`);
          break;
      }
    }

    preparedUniforms.u_time = { value: 0, type: "1f" };
    preparedUniforms.u_resolution = {
      value: new THREE.Vector2(size.width * 2, size.height * 2),
    };
    return preparedUniforms;
  }, [size.width, size.height, uniforms]);

  const material = useMemo(() => {
    const materialObject = new THREE.ShaderMaterial({
      vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
      `,
      fragmentShader: source,
      uniforms: getUniforms(),
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });

    return materialObject;
  }, [source, getUniforms]);

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const Shader: React.FC<ShaderProps & { reverse?: boolean }> = ({
  source,
  uniforms,
  reverse,
}) => {
  return (
    <Canvas className="absolute inset-0 w-full h-full">
      <ShaderMaterial source={source} uniforms={uniforms} reverse={reverse} />
    </Canvas>
  );
};

export const AnimatedBackground = React.forwardRef<
  {
    startReveal: () => void;
    startFadeout: () => void;
  },
  AnimatedBackgroundProps
>(({ className }, ref) => {
  const [animationState, setAnimationState] = React.useState<
    "idle" | "revealing" | "revealed" | "fading" | "faded"
  >("idle");

  const startReveal = React.useCallback(() => {
    setAnimationState("revealing");
    setTimeout(() => setAnimationState("revealed"), 2000); // Adjust based on animation duration
  }, []);

  const startFadeout = React.useCallback(() => {
    setAnimationState("fading");
  }, []);

  React.useImperativeHandle(ref, () => ({
    startReveal,
    startFadeout,
  }));

  const shouldShowCanvas =
    animationState !== "idle" && animationState !== "faded";
  const isReverse = animationState === "fading";

  return (
    <div className={cn("absolute inset-0 z-0", className)}>
      {shouldShowCanvas && (
        <div className="absolute inset-0">
          <CanvasRevealEffect
            animationSpeed={isReverse ? 10 : 8}
            colors={[
              [249, 127, 39], // #f97f27 brand color
              [249, 127, 39],
            ]}
            dotSize={6}
            reverse={isReverse}
          />
        </div>
      )}
      <div className="absolute inset-0 dark:bg-background/70 bg-background/40" />
    </div>
  );
});

AnimatedBackground.displayName = "AnimatedBackground";

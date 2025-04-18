import { cn } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";
import { type CSSProperties, type ElementType, memo } from "react";

interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  active?: boolean;
}

export const TextShimmer = memo(
  ({
    children,
    as: Component = "span",
    className,
    duration = 2,
    spread = 2,
    active = true,
  }: TextShimmerProps) => {
    const MotionComponent = motion(Component as ElementType);

    return (
      <MotionComponent
        className={cn(
          "relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
          "text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]",
          "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
          "dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
          className
        )}
        initial={{ backgroundPosition: "100% center" }}
        animate={{ backgroundPosition: "0% center" }}
        transition={{
          repeat: active ? Number.POSITIVE_INFINITY : 0,
          duration,
          ease: "linear",
        }}
        style={
          {
            "--spread": `${children.length * spread}px`,
            backgroundImage:
              "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
          } as CSSProperties
        }
      >
        {children}
      </MotionComponent>
    );
  }
);

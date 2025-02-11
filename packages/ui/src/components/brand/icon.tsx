import { cn } from "@firebuzz/ui/lib/utils";
import React from "react";

type IconProps = React.HTMLProps<HTMLDivElement>;

export const Icon = React.forwardRef<HTMLDivElement, IconProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn("max-w-full max-h-full", className)}
      >
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 90 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fill="url(#a)" d="M53.5 0h15L36.961 140h-15.73L53.5 0Z" />
          <path
            fill="#F97F27"
            d="M74.5 0H90L58.192 140h-15.73L74.5 0ZM32.038 0h15.5L15.731 140H0L32.038 0Z"
          />
          <defs>
            <linearGradient
              id="a"
              x1={42}
              x2={42}
              y1={0}
              y2={140}
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F1F524" />
              <stop offset={1} stopColor="#F97F27" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }
);

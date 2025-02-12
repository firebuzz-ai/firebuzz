"use client";
import { cn } from "@firebuzz/ui/lib/utils";
import { motion, useInView } from "motion/react";
import * as React from "react";

export function LetterPullUp({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const splittedText = text.split("");

  const pullupVariant = {
    initial: { y: 10, opacity: 0 },
    animate: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
      },
    }),
  };
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <div className="flex justify-center">
      {splittedText.map((current, index) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: letters are static and order won't change
          key={index}
          ref={ref}
          variants={pullupVariant}
          initial="initial"
          animate={isInView ? "animate" : ""}
          custom={index}
          className={cn(
            "text-xl text-center sm:text-4xl font-bold tracking-tighter md:text-6xl md:leading-[4rem]",
            className
          )}
        >
          {current === " " ? <span>&nbsp;</span> : current}
        </motion.div>
      ))}
    </div>
  );
}

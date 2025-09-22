"use client";

import { useEffect, useState } from "react";

export const ScrollProgressIndicator = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollTop / documentHeight;
      setScrollProgress(Math.min(progress, 1));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex absolute top-0 left-1 z-10 flex-col items-center w-1 h-full bg-background">
      <div
        className="relative w-0.5"
        style={{ height: `${scrollProgress * 100}%` }}
      >
        {/* Main indicator line - solid */}
        <div className="w-full h-full bg-brand" />
        {/* Subtle glowing light effect - solid */}
        <div className="absolute inset-y-0 -inset-x-0.5 bg-brand opacity-20 blur-sm" />
        <div className="absolute inset-y-0 -inset-x-1 opacity-10 blur-md bg-brand" />

        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 w-full h-4">
          <div className="w-full h-full bg-gradient-to-t to-transparent from-background" />
          <div className="absolute inset-0 -inset-x-0.5 bg-gradient-to-t from-background to-transparent opacity-20 blur-sm" />
          <div className="absolute inset-0 -inset-x-1 bg-gradient-to-t to-transparent opacity-10 blur-md from-background" />
        </div>
      </div>
    </div>
  );
};

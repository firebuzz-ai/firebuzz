"use client";

import { MDXContent } from "@content-collections/mdx/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface ChangelogEntry {
  _meta: { path: string };
  title: string;
  summary: string;
  date: Date;
  version: string;
  thumbnail?: string;
  mdx: string;
}

interface ChangelogContentProps {
  changelogs: ChangelogEntry[];
}

export const ChangelogContent = ({ changelogs }: ChangelogContentProps) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress
  useEffect(() => {
    let ticking = false;

    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Calculate scroll progress as percentage
      const totalScrollableHeight = documentHeight - windowHeight;
      const progress = Math.min(scrollTop / totalScrollableHeight, 1);

      setScrollProgress(progress);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    // Set initial scroll progress
    updateScrollProgress();

    // Listen for scroll events with throttling
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="relative">
      {/* Border line between columns */}
      <div className="hidden absolute top-0 bottom-0 left-1/4 w-px lg:block bg-border" />

      {/* Scroll progress fill */}
      <div
        className="hidden absolute top-0 left-1/4 w-px transition-all duration-150 ease-out lg:block bg-brand"
        style={{
          height: `${scrollProgress * 100}%`,
        }}
      />

      {/* Glowing indicator at the end of progress */}
      {scrollProgress > 0 && (
        <div
          className="hidden absolute left-1/4 w-px transition-all duration-300 ease-out lg:block"
          style={{
            top: `${scrollProgress * 100}%`,
            height: "8px",
            transform: "translateY(-4px)", // Center the indicator
          }}
        >
          {/* Main indicator point */}
          <div className="w-full h-full rounded-full bg-brand" />
          {/* Glowing light effect */}
          <div className="absolute inset-y-0 -inset-x-1 rounded-full opacity-30 blur-sm bg-brand" />
          <div className="absolute inset-y-0 -inset-x-2 rounded-full opacity-20 blur-md bg-brand" />
          <div className="absolute inset-y-0 -inset-x-3 rounded-full opacity-10 blur-lg bg-brand" />
        </div>
      )}

      <div ref={containerRef} className="grid gap-16 lg:grid-cols-4">
        {changelogs.map((changelog, index) => {
          const isFirst = index === 0;
          const prevChangelog = index > 0 ? changelogs[index - 1] : null;
          const showDateHeader =
            isFirst ||
            !prevChangelog ||
            new Date(changelog.date).toDateString() !==
              new Date(prevChangelog.date).toDateString();

          return (
            <div key={changelog._meta.path} className="contents">
              {/* Date Sidebar - Sticky */}
              <div className="lg:col-span-1">
                {showDateHeader && (
                  <div className="sticky top-24 pr-8 space-y-2">
                    <div className="text-lg font-semibold text-foreground">
                      {new Date(changelog.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="font-mono text-sm text-muted-foreground">
                      {changelog.version}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <article className="space-y-8 lg:col-span-3 lg:pl-8">
                {/* Header */}
                <header className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    {changelog.title}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {changelog.summary}
                  </p>
                </header>

                {/* Thumbnail Image */}
                {changelog.thumbnail && (
                  <div className="overflow-hidden relative h-64 rounded-xl sm:h-96">
                    <Image
                      src={changelog.thumbnail}
                      alt={changelog.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="max-w-none prose prose-lg prose-invert prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-lg prose-img:my-8">
                  <MDXContent code={changelog.mdx} />
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
};

"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Split } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface VariantData {
  id: string;
  title: string;
  percentage: number;
  color: string;
  isControl?: boolean;
  variantIndex: number;
}

interface TrafficDistributionSliderProps {
  variants: VariantData[];
  onDistributionChange: (
    distributions: { variantId: string; percentage: number }[]
  ) => void;
  className?: string;
}

export const TrafficDistributionSlider = ({
  variants,
  onDistributionChange,
  className,
}: TrafficDistributionSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [distributions, setDistributions] = useState<VariantData[]>(variants);

  // Update local state when variants prop changes
  useEffect(() => {
    setDistributions(variants);
  }, [variants]);

  const getVariantLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, etc.
  };

  const calculateCumulativePositions = useCallback(() => {
    let cumulative = 0;
    return distributions.map((variant) => {
      const start = cumulative;
      cumulative += variant.percentage;
      return {
        ...variant,
        startPosition: start,
        endPosition: cumulative,
      };
    });
  }, [distributions]);

  const handleMouseDown = (variantId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(variantId);
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const relativeX = Math.max(
        0,
        Math.min(rect.width, event.clientX - rect.left)
      );
      const percentage = (relativeX / rect.width) * 100;

      const draggedIndex = distributions.findIndex((v) => v.id === isDragging);
      if (draggedIndex === -1) return;

      // Calculate new distributions
      const newDistributions = [...distributions];
      const cumulativePositions = calculateCumulativePositions();
      const draggedVariant = cumulativePositions[draggedIndex];

      // Determine which boundary we're moving
      const isMovingRightBoundary =
        percentage >
        draggedVariant.startPosition + draggedVariant.percentage / 2;

      if (isMovingRightBoundary && draggedIndex < distributions.length - 1) {
        // Moving right boundary - affects this variant and the next one
        const nextIndex = draggedIndex + 1;
        const maxPosition =
          draggedIndex === distributions.length - 2
            ? 100
            : cumulativePositions[nextIndex + 1]?.startPosition || 100;
        const minPosition = draggedVariant.startPosition + 1; // Minimum 1% for current variant

        const clampedPercentage = Math.max(
          minPosition,
          Math.min(maxPosition - 1, percentage)
        );
        const newCurrentPercentage =
          clampedPercentage - draggedVariant.startPosition;
        const remainingForNext = maxPosition - clampedPercentage;

        newDistributions[draggedIndex].percentage =
          Math.round(newCurrentPercentage);
        newDistributions[nextIndex].percentage = Math.round(remainingForNext);
      } else if (!isMovingRightBoundary && draggedIndex > 0) {
        // Moving left boundary - affects previous variant and this one
        const prevIndex = draggedIndex - 1;
        const minPosition = cumulativePositions[prevIndex]?.startPosition || 0;
        const maxPosition = draggedVariant.endPosition - 1; // Minimum 1% for current variant

        const clampedPercentage = Math.max(
          minPosition + 1,
          Math.min(maxPosition, percentage)
        );
        const newPrevPercentage = clampedPercentage - minPosition;
        const newCurrentPercentage =
          draggedVariant.endPosition - clampedPercentage;

        newDistributions[prevIndex].percentage = Math.round(newPrevPercentage);
        newDistributions[draggedIndex].percentage =
          Math.round(newCurrentPercentage);
      }

      // Ensure total is exactly 100%
      const total = newDistributions.reduce((sum, v) => sum + v.percentage, 0);
      if (total !== 100) {
        const diff = 100 - total;
        newDistributions[0].percentage += diff;
      }

      setDistributions(newDistributions);
    },
    [isDragging, distributions, calculateCumulativePositions]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Notify parent of changes
      onDistributionChange(
        distributions.map((v) => ({
          variantId: v.id,
          percentage: v.percentage,
        }))
      );
      setIsDragging(null);
    }
  }, [isDragging, distributions, onDistributionChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const cumulativePositions = calculateCumulativePositions();

  const autoDistribute = () => {
    const equalPercentage = Math.floor(100 / distributions.length);
    const remainder = 100 % distributions.length;

    const newDistributions = distributions.map((variant, index) => ({
      ...variant,
      percentage: equalPercentage + (index < remainder ? 1 : 0),
    }));

    setDistributions(newDistributions);
    onDistributionChange(
      newDistributions.map((v) => ({
        variantId: v.id,
        percentage: v.percentage,
      }))
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with percentages */}
      <div className="overflow-hidden relative">
        {cumulativePositions.map((variant, index) => {
          const centerPosition = variant.startPosition + variant.percentage / 2;
          const isFirst = index === 0;
          const isLast = index === cumulativePositions.length - 1;

          // For edge cases, align to edges instead of centering
          let finalPosition = centerPosition;
          let alignment = "center";

          if (isFirst && centerPosition < 15) {
            finalPosition = 0;
            alignment = "left";
          } else if (isLast && centerPosition > 85) {
            finalPosition = 100;
            alignment = "right";
          }

          return (
            <div
              key={variant.id}
              className={cn(
                "absolute flex flex-col",
                alignment === "left" && "items-start",
                alignment === "right" && "items-end",
                alignment === "center" &&
                  "items-center transform -translate-x-1/2"
              )}
              style={{
                left: alignment === "right" ? "auto" : `${finalPosition}%`,
                right: alignment === "right" ? "0%" : "auto",
              }}
            >
              <div className="mb-1 text-2xl font-bold text-foreground">
                {variant.percentage}%
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 mb-2",
                  alignment === "left" && "justify-start",
                  alignment === "right" && "justify-end",
                  alignment === "center" && "justify-center"
                )}
              >
                <div
                  className={cn(
                    "flex justify-center items-center w-5 h-5 text-xs font-bold rounded flex-shrink-0",
                    variant.color
                  )}
                >
                  {getVariantLetter(variant.variantIndex)}
                </div>
                <div className="text-sm text-muted-foreground truncate max-w-[80px]">
                  {variant.title}
                </div>
                {variant.isControl && (
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    Control
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        {/* Spacer for absolute positioned elements */}
        <div className="h-20" />
      </div>

      {/* Slider track */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="overflow-hidden relative h-2 rounded-full cursor-pointer bg-muted"
        >
          {/* Variant segments */}
          {cumulativePositions.map((variant, index) => (
            <div
              key={variant.id}
              className={cn(
                "absolute top-0 h-full transition-all duration-200",
                variant.color.replace("text-white text-black", ""), // Remove text colors, keep background
                isDragging === variant.id && "scale-y-150 shadow-lg"
              )}
              style={{
                left: `${variant.startPosition}%`,
                width: `${variant.percentage}%`,
              }}
            />
          ))}

          {/* Draggable handles */}
          {cumulativePositions.slice(0, -1).map((variant, index) => (
            <div
              key={`handle-${variant.id}`}
              className={cn(
                "absolute top-1/2 w-4 h-4 bg-background border-2 border-foreground rounded-full cursor-grab active:cursor-grabbing transform -translate-y-1/2 -translate-x-1/2 transition-all duration-200 hover:scale-110 z-10",
                isDragging === variant.id &&
                  "scale-125 shadow-lg border-primary"
              )}
              style={{
                left: `${variant.endPosition}%`,
              }}
              onMouseDown={(e) => handleMouseDown(variant.id, e)}
            />
          ))}
        </div>

        {/* Auto-distribute button */}
        <div className="flex justify-end mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={autoDistribute}
            className="gap-2 w-full h-8 text-sm"
          >
            <Split className="size-3" />
            Auto-distribute
          </Button>
        </div>
      </div>
    </div>
  );
};

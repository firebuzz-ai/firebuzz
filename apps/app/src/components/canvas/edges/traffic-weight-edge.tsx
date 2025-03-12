import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { memo, useMemo } from "react";

export const TrafficWeightEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const weight = useMemo(() => {
      if (!data?.trafficPercentage) return null;
      return `${data.trafficPercentage}%`;
    }, [data?.trafficPercentage]);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: 1,
          }}
          markerEnd={markerEnd}
        />

        {weight && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
                background: "hsla(var(--muted) / 0.9)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid hsl(var(--brand))",
                color: "hsl(var(--brand))",
              }}
              className="nodrag nopan"
            >
              {weight}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

TrafficWeightEdge.displayName = "TrafficWeightEdge";

import type { Node } from "@xyflow/react";
import {
	BaseEdge,
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
	useReactFlow,
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
		source,
		target,
	}: EdgeProps) => {
		const { getNode } = useReactFlow();

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

		// Determine if the edge should be muted based on connected AB test status
		const isMuted = useMemo(() => {
			const sourceNode = getNode(source);
			const targetNode = getNode(target);

			if (!sourceNode || !targetNode) return false;

			// Check if the source or target is an AB test that is completed or paused
			const checkABTestStatus = (node: Node) => {
				if (node?.type === "ab-test") {
					const status = node.data.status;
					return status === "completed" || status === "paused";
				}
				return false;
			};

			return checkABTestStatus(sourceNode) || checkABTestStatus(targetNode);
		}, [getNode, source, target]);

		return (
			<>
				<BaseEdge
					id={id}
					path={edgePath}
					style={{
						...style,
						strokeWidth: 1,
						stroke: isMuted
							? "hsl(var(--muted-foreground) / 0.4)"
							: style?.stroke,
						opacity: isMuted ? 0.5 : 1,
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
								background: isMuted
									? "hsla(var(--muted) / 0.6)"
									: "hsla(var(--muted) / 0.9)",
								padding: "4px 8px",
								borderRadius: "4px",
								fontSize: 12,
								fontWeight: 500,
								border: isMuted
									? "1px solid hsl(var(--muted-foreground) / 0.4)"
									: "1px solid hsl(var(--brand))",
								color: isMuted
									? "hsl(var(--muted-foreground) / 0.7)"
									: "hsl(var(--brand))",
								opacity: isMuted ? 0.7 : 1,
							}}
							className="nodrag nopan"
						>
							{weight}
						</div>
					</EdgeLabelRenderer>
				)}
			</>
		);
	},
);

TrafficWeightEdge.displayName = "TrafficWeightEdge";

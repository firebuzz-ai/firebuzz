import paper from "paper";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useBrush } from "@/hooks/ui/use-ai-image-modal";
import { useMaskState } from "./use-mask-state";

const maskColorString = "rgba(249, 127, 39, 0.5)"; // Semi-transparent orange
const maskSolidColorString = "rgba(249, 127, 39, 1)"; // Solid orange
const borderColorString = "rgba(249, 127, 39, 1)"; // Solid orange

// Extend HTMLCanvasElement to include clearMask method AND natural dimensions
interface MaskCanvasElement extends HTMLCanvasElement {
	clearMask?: () => void;
	naturalWidth?: number;
	naturalHeight?: number;
}

// Extended interface for Paper.js PathItem with segments
interface PathWithSegments extends paper.PathItem {
	segments: { length: number };
	area: number;
	isEmpty: () => boolean;
	strokeDashArray?: number[];
}

export const MaskCanvas = memo(
	({
		naturalImageSize,
		canvasSize,
		canvasRef,
		brushSize,
		selectedImageKey,
	}: {
		naturalImageSize: { width: number; height: number };
		canvasSize: { width: number; height: number };
		canvasRef: React.RefObject<HTMLCanvasElement | null>;
		brushSize: number;
		selectedImageKey: string;
	}) => {
		const { current: currentMaskState, push: pushMaskState } =
			useMaskState(selectedImageKey);
		const { scale: brushScale, setScale } = useBrush();

		const [isDrawing, setIsDrawing] = useState(false);
		const isDrawingRef = useRef(isDrawing); // Ref to track drawing state
		const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
		const [cursorVisible, setCursorVisible] = useState(false);
		const lastPointRef = useRef<paper.Point | null>(null);
		const paperInitializedRef = useRef(false);
		const maskGroupRef = useRef<paper.Group | null>(null);
		const currentStrokeItemsRef = useRef<paper.Item[]>([]);
		const isUndoRedoOperation = useRef(false);
		const previousCanvasSizeRef = useRef<{
			width: number;
			height: number;
		} | null>(null);
		const mainPaperProjectRef = useRef<paper.Project | null>(null);

		// Adjust scale based on canvas size
		useEffect(() => {
			const baseWidth = 800; // Reference width to calculate scale
			const baseHeight = 600; // Reference height to calculate scale

			// Calculate scale based on the smaller dimension ratio to maintain proportionality
			const widthRatio = canvasSize.width / baseWidth;
			const heightRatio = canvasSize.height / baseHeight;

			// Use the smaller ratio to ensure the brush isn't too large on any dimension
			const newScale = Math.min(widthRatio, heightRatio);

			// Only update if there's a significant difference
			if (Math.abs(newScale - brushScale) > 0.1) {
				setScale(newScale);
			}
		}, [canvasSize.width, canvasSize.height, brushScale, setScale]);

		// Helper function to update border styles based on drawing state
		const updateBorderStyles = useCallback((drawing: boolean) => {
			if (!maskGroupRef.current) return;

			for (const item of maskGroupRef.current.children) {
				const path = item as PathWithSegments;
				if (drawing) {
					// Hide borders while drawing
					path.strokeWidth = 0;
				} else {
					// Show dashed borders when not drawing
					path.strokeColor = new paper.Color(borderColorString);
					path.strokeWidth = 2;
					path.strokeCap = "round";
					path.dashArray = [10, 12]; // Example dash pattern
					path.dashOffset = 100;
				}
			}
			paper.view.update();
		}, []);

		// Animate the mask
		useEffect(() => {
			// Don't run animation if drawing or no paths exist
			if (!maskGroupRef.current || isDrawing) return;

			const animateDashes = () => {
				if (maskGroupRef.current) {
					for (const path of maskGroupRef.current.children) {
						// Decrement dashOffset for slower "marching ants" effect
						path.dashOffset -= 0.5;
					}
				}
			};

			// Add the frame listener
			paper.view.on("frame", animateDashes);

			// Return a cleanup function to remove the listener
			return () => {
				paper.view.off("frame", animateDashes);
			};
		}, [isDrawing]); // Only re-run if isDrawing changes

		// Initialize Paper.js and load initial mask state
		useEffect(() => {
			if (!canvasRef.current || paperInitializedRef.current) return;

			paper.setup(canvasRef.current);
			// Store ref to the main project created by setup
			mainPaperProjectRef.current = paper.project;
			paper.view.viewSize = new paper.Size(canvasSize.width, canvasSize.height);
			if (!maskGroupRef.current) {
				maskGroupRef.current = new paper.Group({ name: "maskGroup" });
			}
			paperInitializedRef.current = true;
			new paper.Tool().activate();

			// Load initial state from the history hook if it exists
			if (currentMaskState?.json) {
				try {
					maskGroupRef.current.removeChildren();
					maskGroupRef.current.importJSON(currentMaskState.json);

					// --- SCALING ON LOAD/UNDO/REDO --- START
					// Scale from the image's natural coordinate system (stored with the state)
					// to the current canvas display size.
					const storedImageWidth = currentMaskState.imageNaturalWidth;
					const storedImageHeight = currentMaskState.imageNaturalHeight;

					const displayWidth = canvasSize.width;
					const displayHeight = canvasSize.height;

					// Calculate scale factor: displaySize / imageNaturalSize
					const scaleX =
						storedImageWidth === 0 ? 1 : displayWidth / storedImageWidth;
					const scaleY =
						storedImageHeight === 0 ? 1 : displayHeight / storedImageHeight;
					// --- SCALING ON LOAD/UNDO/REDO --- END

					if (scaleX !== 1 || scaleY !== 1) {
						// Apply the calculated scaling
						maskGroupRef.current.scale(scaleX, scaleY, new paper.Point(0, 0));
					}

					updateBorderStyles(false);
					paper.view.update();
				} catch (error) {
					console.error("Error loading initial mask state:", error);
					maskGroupRef.current.removeChildren();
					// If loading fails, push a null state? Or rely on initial state?
					// For now, just clear visually. History starts with null anyway.
				}
			} else {
				// Ensure canvas is clear if no initial state
				maskGroupRef.current?.removeChildren();
			}
		}, [
			canvasRef,
			canvasSize.width, // Depend on dimensions for setup
			canvasSize.height,
			currentMaskState, // Depend on the current state from history
			updateBorderStyles,
		]);

		// Effect to handle canvas resizing
		useEffect(() => {
			if (
				!paperInitializedRef.current ||
				!maskGroupRef.current ||
				!canvasRef.current
			) {
				return;
			}

			const previousSize = previousCanvasSizeRef.current;
			if (
				!previousSize ||
				(previousSize.width === canvasSize.width &&
					previousSize.height === canvasSize.height)
			) {
				if (!previousSize) {
					previousCanvasSizeRef.current = { ...canvasSize };
				}
				return;
			}

			// --- Visual Scaling --- START
			const scaleX =
				previousSize.width === 0 ? 1 : canvasSize.width / previousSize.width;
			const scaleY =
				previousSize.height === 0 ? 1 : canvasSize.height / previousSize.height;

			paper.view.viewSize = new paper.Size(canvasSize.width, canvasSize.height);
			maskGroupRef.current.scale(scaleX, scaleY, new paper.Point(0, 0));
			updateBorderStyles(false);
			paper.view.update();
			// --- Visual Scaling --- END

			previousCanvasSizeRef.current = { ...canvasSize };
		}, [canvasSize, updateBorderStyles, canvasRef]);

		// Effect to handle state changes from undo/redo (uses currentMaskState)
		useEffect(() => {
			// Check if paper is initialized AND the view exists
			if (
				!paperInitializedRef.current ||
				!paper.view ||
				!maskGroupRef.current ||
				isDrawing ||
				isUndoRedoOperation.current
			) {
				return;
			}

			// Flag that this update comes from history change
			isUndoRedoOperation.current = true;

			try {
				maskGroupRef.current.removeChildren();

				if (currentMaskState?.json) {
					maskGroupRef.current.importJSON(currentMaskState.json);

					// --- SCALING ON LOAD/UNDO/REDO --- START
					// Scale from the image's natural coordinate system (stored with the state)
					// to the current canvas display size.
					const storedImageWidth = currentMaskState.imageNaturalWidth;
					const storedImageHeight = currentMaskState.imageNaturalHeight;

					const displayWidth = canvasSize.width;
					const displayHeight = canvasSize.height;

					// Calculate scale factor: displaySize / imageNaturalSize
					const scaleX =
						storedImageWidth === 0 ? 1 : displayWidth / storedImageWidth;
					const scaleY =
						storedImageHeight === 0 ? 1 : displayHeight / storedImageHeight;
					// --- SCALING ON LOAD/UNDO/REDO --- END

					if (scaleX !== 1 || scaleY !== 1) {
						// Apply the calculated scaling
						maskGroupRef.current.scale(scaleX, scaleY, new paper.Point(0, 0));
					}
				}

				updateBorderStyles(false);
				paper.view.update();
			} catch (error) {
				console.error("Error applying mask state (undo/redo):", error);
				maskGroupRef.current?.removeChildren();
				paper.view.update();
			} finally {
				// Reset the flag in the next frame to allow other updates
				requestAnimationFrame(() => {
					isUndoRedoOperation.current = false;
				});
			}
		}, [currentMaskState, updateBorderStyles, canvasSize, isDrawing]);

		// Unite and smooth the current stroke items
		const uniteCurrentStroke = useCallback(() => {
			if (
				!maskGroupRef.current ||
				currentStrokeItemsRef.current.length === 0 ||
				isUndoRedoOperation.current
			)
				return;

			isUndoRedoOperation.current = true;

			try {
				// --- START: Path simplification step ---
				// Simplify each path in the current stroke to reduce complexity before uniting
				for (const item of currentStrokeItemsRef.current) {
					const pathItem = item as paper.PathItem;
					// Check if it's a path with enough segments to warrant simplification
					if (
						pathItem instanceof paper.Path &&
						pathItem.segments &&
						pathItem.segments.length > 30
					) {
						// Only simplify complex paths with many segments
						try {
							pathItem.simplify(1.5); // Tolerance parameter - adjust as needed for balance between detail and performance
						} catch (e) {
							console.warn("Could not simplify path:", e);
						}
					}
				}
				// --- END: Path simplification step ---

				let currentUnitedPath: PathWithSegments | null = null;
				// Limit how many paths we unite at once for large strokes
				const batchSize = 10;
				for (
					let i = 0;
					i < currentStrokeItemsRef.current.length;
					i += batchSize
				) {
					// Process in batches
					const batch = currentStrokeItemsRef.current.slice(i, i + batchSize);

					// Create or update the united path
					if (!currentUnitedPath) {
						// For the first batch, clone the first item to start
						currentUnitedPath = batch[0].clone() as PathWithSegments;
						// Unite with the rest of the batch
						for (let j = 1; j < batch.length; j++) {
							try {
								const newUnion = currentUnitedPath.unite(
									batch[j] as paper.PathItem,
								) as PathWithSegments;
								currentUnitedPath.remove();
								currentUnitedPath = newUnion;
							} catch (e) {
								console.error("Error uniting batch segments:", e);
							}
						}
					} else {
						// For subsequent batches, unite the current united path with a temporary united batch
						try {
							// Unite all items in the current batch
							let batchUnion = batch[0].clone() as PathWithSegments;
							for (let j = 1; j < batch.length; j++) {
								try {
									const newBatchUnion = batchUnion.unite(
										batch[j] as paper.PathItem,
									) as PathWithSegments;
									batchUnion.remove();
									batchUnion = newBatchUnion;
								} catch (e) {
									console.error("Error uniting batch:", e);
								}
							}

							// Unite the batch union with the current united path
							const nextUnion = currentUnitedPath.unite(
								batchUnion,
							) as PathWithSegments;
							currentUnitedPath.remove();
							batchUnion.remove();
							currentUnitedPath = nextUnion;
						} catch (e) {
							console.error("Error uniting batches:", e);
						}
					}
				}

				if (!currentUnitedPath) {
					for (const item of currentStrokeItemsRef.current) item.remove();
					currentStrokeItemsRef.current = [];
					updateBorderStyles(false);
					return;
				}

				// Optional: Simplify the final united path if it's very complex
				if (
					currentUnitedPath instanceof paper.Path &&
					currentUnitedPath.segments &&
					currentUnitedPath.segments.length > 100
				) {
					try {
						currentUnitedPath.simplify(2.0); // Higher tolerance for final path
					} catch (e) {
						console.warn("Could not simplify final united path:", e);
					}
				}

				const existingPaths = maskGroupRef.current.children.filter(
					(item) => !currentStrokeItemsRef.current.includes(item),
				) as PathWithSegments[];

				const overlappingPaths: PathWithSegments[] = [];
				// Get bounds of the newly united stroke path once
				const currentBounds = currentUnitedPath.bounds;
				for (const existingPath of existingPaths) {
					try {
						// --- Optimization: First check if bounds intersect ---
						if (
							existingPath.visible &&
							currentBounds.intersects(existingPath.bounds)
						) {
							// --- Only if bounds intersect, do the more expensive checks ---
							if (
								currentUnitedPath.intersects(existingPath) ||
								existingPath.intersects(currentUnitedPath) ||
								currentUnitedPath.contains(existingPath.bounds) ||
								existingPath.contains(currentUnitedPath.bounds)
							) {
								overlappingPaths.push(existingPath);
							}
						}
					} catch (e) {
						console.error("Error checking intersection:", e);
					}
				}

				if (overlappingPaths.length > 0) {
					let finalCombinedPath = currentUnitedPath;

					// Sort overlapping paths by area (smallest first) to potentially improve unite operations
					overlappingPaths.sort((a, b) => {
						const areaA = a.area || 0;
						const areaB = b.area || 0;
						return areaA - areaB;
					});

					// Process overlapping paths in batches
					const batchSize = 5; // Adjust based on testing
					for (let i = 0; i < overlappingPaths.length; i += batchSize) {
						const batch = overlappingPaths.slice(i, i + batchSize);

						// United paths in this batch first
						let batchUnion: PathWithSegments | null = null;
						for (const path of batch) {
							try {
								if (!batchUnion) {
									batchUnion = path.clone() as PathWithSegments;
								} else {
									const newUnion = batchUnion.unite(path) as PathWithSegments;
									if (newUnion && !newUnion.isEmpty()) {
										batchUnion.remove();
										batchUnion = newUnion;
									}
								}
								// Remove the original path as it's now part of the batch union
								path.remove();
							} catch (e) {
								console.error("Error in batch unite:", e);
							}
						}

						// Now unite the batch with the final path
						if (batchUnion) {
							try {
								const combinedResult = finalCombinedPath.unite(
									batchUnion,
								) as PathWithSegments;
								if (combinedResult && !combinedResult.isEmpty()) {
									finalCombinedPath.remove();
									batchUnion.remove();
									finalCombinedPath = combinedResult;

									// Simplify after each batch to keep complexity under control
									if (
										finalCombinedPath instanceof paper.Path &&
										finalCombinedPath.segments &&
										finalCombinedPath.segments.length > 150
									) {
										try {
											finalCombinedPath.simplify(2.5);
										} catch (e) {
											console.warn("Could not simplify batch result:", e);
										}
									}
								} else {
									batchUnion.remove();
									console.warn("Unite batch operation resulted in empty path");
								}
							} catch (e) {
								console.error("Error uniting batch with final path:", e);
								batchUnion.remove();
							}
						}
					}

					finalCombinedPath.fillColor = new paper.Color(maskColorString);
					finalCombinedPath.strokeWidth = 0;
					if (!finalCombinedPath.parent) {
						maskGroupRef.current.addChild(finalCombinedPath);
					}
				} else {
					currentUnitedPath.fillColor = new paper.Color(maskColorString);
					currentUnitedPath.strokeWidth = 0;
					if (!currentUnitedPath.parent) {
						maskGroupRef.current.addChild(currentUnitedPath);
					}
				}

				// Clean up temporary stroke items
				for (const item of currentStrokeItemsRef.current) {
					item.remove();
				}
			} catch (e) {
				console.error("Error in uniteCurrentStroke:", e);
				for (const item of currentStrokeItemsRef.current) item.remove();
			} finally {
				currentStrokeItemsRef.current = [];
				updateBorderStyles(false);

				if (maskGroupRef.current) {
					// --- Start: Scale geometry to natural size before export ---
					const groupToSave = maskGroupRef.current.clone({
						insert: false,
					}) as paper.Group; // Clone without adding to scene

					const scaleToNaturalX =
						canvasSize.width === 0
							? 1
							: naturalImageSize.width / canvasSize.width;
					const scaleToNaturalY =
						canvasSize.height === 0
							? 1
							: naturalImageSize.height / canvasSize.height;

					if (scaleToNaturalX !== 1 || scaleToNaturalY !== 1) {
						groupToSave.scale(
							scaleToNaturalX,
							scaleToNaturalY,
							new paper.Point(0, 0),
						);
					}
					// --- End: Scale geometry to natural size before export ---

					const newStateJson = groupToSave.exportJSON();
					groupToSave.remove(); // Clean up clone

					if (newStateJson && newStateJson.length > 0) {
						// Push the new state to history, associating with IMAGE natural dimensions
						pushMaskState({
							json: newStateJson, // JSON is now relative to naturalImageSize
							imageNaturalWidth: naturalImageSize.width,
							imageNaturalHeight: naturalImageSize.height,
						});
					} else {
						if (currentMaskState !== null) {
							pushMaskState(null);
						}
					}
				}
				paper.view.update();
				requestAnimationFrame(() => {
					isUndoRedoOperation.current = false;
				});
			}
		}, [
			updateBorderStyles,
			pushMaskState,
			naturalImageSize,
			currentMaskState,
			canvasSize.width,
			canvasSize.height,
		]); // Added canvasSize dims

		// Keep ref synchronized with state
		useEffect(() => {
			isDrawingRef.current = isDrawing;
		}, [isDrawing]);

		// Draw a brush stroke at the given position
		const drawBrush = useCallback(
			(x: number, y: number) => {
				if (!paper.view || !maskGroupRef.current) return;

				const currentFillColor = new paper.Color(maskSolidColorString);
				const radius = (brushSize * brushScale) / 2;

				// Create a circle at the position
				const circle = new paper.Path.Circle({
					center: new paper.Point(x, y),
					radius,
					fillColor: currentFillColor,
					// No stroke needed for temporary segments
				});

				// In drawing mode, add the circle to the mask group and track it for later uniting
				maskGroupRef.current.addChild(circle);
				currentStrokeItemsRef.current.push(circle);

				// If we have a last point, connect them with a rectangle to make continuous stroke
				if (lastPointRef.current) {
					const lastPoint = lastPointRef.current;
					const currentPoint = new paper.Point(x, y);

					// Only draw connecting shape if points are not too far apart
					const distance = lastPoint.getDistance(currentPoint);
					if (distance < brushSize * brushScale * 2) {
						// Calculate a rectangle between the two points
						const vector = currentPoint.subtract(lastPoint);
						// Create perpendicular vector with length of half brush size
						const length = vector.length;
						if (length > 0) {
							const perpendicular = new paper.Point(
								-vector.y / length,
								vector.x / length,
							).multiply((brushSize * brushScale) / 2);

							const path = new paper.Path({
								segments: [
									lastPoint.add(perpendicular),
									lastPoint.subtract(perpendicular),
									currentPoint.subtract(perpendicular),
									currentPoint.add(perpendicular),
								],
								closed: true,
								fillColor: currentFillColor,
								// No stroke needed for temporary segments
							});

							maskGroupRef.current.addChild(path);
							currentStrokeItemsRef.current.push(path);
						}
					}
				}

				// Update last point
				lastPointRef.current = new paper.Point(x, y);

				// Force view to update
				paper.view.update();
			},
			[brushSize, brushScale],
		);

		// Handle mouse events for drawing and cursor
		useEffect(() => {
			if (!paperInitializedRef.current || !paper.view) return;

			// DOM event handlers
			const handleMouseMove = (e: MouseEvent) => {
				const rect = canvasRef.current?.getBoundingClientRect();
				if (!rect) return;

				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				setCursorPosition({ x, y });

				// If drawing, add a brush stroke
				if (isDrawingRef.current) {
					drawBrush(x, y);
				}
			};

			const handleMouseDown = (e: MouseEvent) => {
				if (!canvasRef.current) return;

				updateBorderStyles(true);
				const rect = canvasRef.current.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				setIsDrawing(true); // Update state
				lastPointRef.current = null;
				currentStrokeItemsRef.current = [];

				// Defer the first draw call slightly using requestAnimationFrame
				requestAnimationFrame(() => {
					// Check if still drawing using the ref
					if (isDrawingRef.current) {
						drawBrush(x, y);
					}
				});
			};

			const handleMouseUp = () => {
				if (isDrawingRef.current) {
					// Use ref for check
					if (currentStrokeItemsRef.current.length > 0) {
						uniteCurrentStroke();
					} else {
						updateBorderStyles(false);
					}
					setIsDrawing(false); // Update state (and ref via useEffect)
					lastPointRef.current = null;
				}
			};

			const handleMouseEnter = () => {
				setCursorVisible(true);
			};

			const handleMouseLeave = () => {
				setCursorVisible(false);
				if (isDrawingRef.current) {
					// Use ref for check
					if (currentStrokeItemsRef.current.length > 0) {
						uniteCurrentStroke();
					} else {
						updateBorderStyles(false);
					}
					setIsDrawing(false); // Update state (and ref via useEffect)
					lastPointRef.current = null;
				}
			};

			// Add event listeners
			const currentCanvas = canvasRef.current;
			currentCanvas?.addEventListener("mousemove", handleMouseMove);
			currentCanvas?.addEventListener("mousedown", handleMouseDown);
			currentCanvas?.addEventListener("mouseup", handleMouseUp);
			currentCanvas?.addEventListener("mouseenter", handleMouseEnter);
			currentCanvas?.addEventListener("mouseleave", handleMouseLeave);

			return () => {
				// Remove event listeners
				currentCanvas?.removeEventListener("mousemove", handleMouseMove);
				currentCanvas?.removeEventListener("mousedown", handleMouseDown);
				currentCanvas?.removeEventListener("mouseup", handleMouseUp);
				currentCanvas?.removeEventListener("mouseenter", handleMouseEnter);
				currentCanvas?.removeEventListener("mouseleave", handleMouseLeave);
			};
		}, [
			// Include drawBrush and other necessary dependencies BUT NOT isDrawing
			// because handleMouseDown/Up/Leave should close over the latest drawBrush
			canvasRef,
			drawBrush,
			updateBorderStyles,
			uniteCurrentStroke,
			// brushSize, brushScale, // drawBrush depends on these, so covered
		]);

		// Keep useEffect for attaching natural dimensions if needed elsewhere
		useEffect(() => {
			if (canvasRef.current) {
				const typedCanvas = canvasRef.current as MaskCanvasElement;
				typedCanvas.naturalWidth = naturalImageSize.width;
				typedCanvas.naturalHeight = naturalImageSize.height;
			}
			return () => {
				if (canvasRef.current) {
					const typedCanvas = canvasRef.current as MaskCanvasElement;
					typedCanvas.naturalWidth = undefined;
					typedCanvas.naturalHeight = undefined;
				}
			};
		}, [canvasRef, naturalImageSize]); // Removed clearMask dependency

		// Expose clearMask function to the canvas element
		useEffect(() => {
			if (canvasRef.current) {
				const typedCanvas = canvasRef.current as MaskCanvasElement;

				// Define the clearMask function
				typedCanvas.clearMask = () => {
					if (maskGroupRef.current) {
						maskGroupRef.current.removeChildren();
						paper.view.update();
					}
				};
			}

			return () => {
				if (canvasRef.current) {
					const typedCanvas = canvasRef.current as MaskCanvasElement;
					typedCanvas.clearMask = undefined;
				}
			};
		}, [canvasRef]);

		return (
			<div className="relative w-full h-full">
				<canvas
					ref={canvasRef}
					className="z-10 block w-full h-full cursor-none touch-none"
					style={{
						touchAction: "none",
					}}
				/>
				{/* Custom cursor */}
				{cursorVisible && (
					<div
						className="absolute z-30 pointer-events-none"
						style={{
							width: `${brushSize * brushScale}px`,
							height: `${brushSize * brushScale}px`,
							borderRadius: "50%",
							backgroundColor: maskColorString,
							transform: `translate(${cursorPosition.x - (brushSize * brushScale) / 2}px, ${
								cursorPosition.y - (brushSize * brushScale) / 2
							}px)`,
							top: 0,
							left: 0,
						}}
					/>
				)}
			</div>
		);
	},
);

MaskCanvas.displayName = "MaskCanvas";

import { useCallback, useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface EdgePath {
  points: Point[];
  isInner: boolean;
}

// Extend HTMLCanvasElement to include clearMask method
interface MaskCanvasElement extends HTMLCanvasElement {
  clearMask?: () => void;
}

export const MaskCanvas = ({
  canvasSize,
  canvasRef,
  brushSize,
}: {
  canvasSize: { width: number; height: number };
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  brushSize: number;
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  const [needsRedraw, setNeedsRedraw] = useState(true); // Start with true for initial draw
  const dashOffsetRef = useRef(0);
  // No longer need animationRef
  // const animationRef = useRef<number>(0);
  const lastPositionRef = useRef<Point | null>(null);
  const maskLayerRef = useRef<ImageData | null>(null);
  const edgePathsRef = useRef<EdgePath[]>([]);

  // Colors
  const maskColor = "rgba(249, 127, 39, 0.5)"; // Semi-transparent orange
  const borderColor = "rgba(249, 127, 39, 1)"; // Solid orange

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Prevent creating image data if dimensions are invalid
    if (canvas.width <= 0 || canvas.height <= 0) {
      console.warn(
        `MaskCanvas: Invalid dimensions received (${canvas.width}x${canvas.height}), skipping initialization.`
      );
      // Clear existing mask if dimensions become invalid
      if (maskLayerRef.current) {
        maskLayerRef.current = null;
        edgePathsRef.current = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Also clear the visible canvas
      }
      return;
    }

    // Initialize mask layer if needed or if size changed
    if (
      !maskLayerRef.current ||
      maskLayerRef.current.width !== canvas.width ||
      maskLayerRef.current.height !== canvas.height
    ) {
      maskLayerRef.current = ctx.createImageData(canvas.width, canvas.height);
      edgePathsRef.current = []; // Reset edges if size changes
      setNeedsRedraw(true); // Trigger redraw on init/resize
    }

    // Initial draw
    if (needsRedraw) {
      redrawMask(true); // Draw with borders initially
      setNeedsRedraw(false);
    }

    // No continuous animation loop needed anymore
    // const animate = () => { ... };
    // animate();
    // return () => { ... };
  }, [canvasRef, canvasSize, needsRedraw]); // Add needsRedraw dependency

  // Update mask rendering when canvas size changes (handled in init useEffect now)
  // useEffect(() => { ... }, [canvasSize, canvasRef]);

  // Function to redraw the mask, optionally drawing borders
  const redrawMask = useCallback(
    (drawBorders = true) => {
      const canvas = canvasRef.current;
      if (!canvas || !maskLayerRef.current) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the base mask
      ctx.putImageData(maskLayerRef.current, 0, 0);

      // Only calculate and draw borders if requested
      if (drawBorders) {
        // Update dash offset just before drawing borders
        dashOffsetRef.current = (dashOffsetRef.current + 0.5) % 16;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const edgePaths = findAllEdges(imageData);

        // Store edge paths for future reference
        edgePathsRef.current = edgePaths;

        // Draw all edge paths
        if (edgePaths.length > 0) {
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.lineDashOffset = dashOffsetRef.current;
          ctx.strokeStyle = borderColor;

          for (const path of edgePaths) {
            if (path.points.length < 2) continue;

            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);

            // Connect the edge points
            for (let i = 1; i < path.points.length; i++) {
              ctx.lineTo(path.points[i].x, path.points[i].y);
            }

            // Close the path
            if (path.points.length > 2) {
              ctx.closePath();
            }

            // Stroke the path
            ctx.stroke();
          }

          // Reset dash
          ctx.setLineDash([]);
        }
      }
    },
    [canvasRef]
  );

  // Helper to find all edges, including inner holes
  const findAllEdges = useCallback((imageData: ImageData): EdgePath[] => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edgePaths: EdgePath[] = [];
    const visited = new Set<string>();
    const maskPixels = new Set<string>();

    // First identify all mask pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + 3; // Alpha channel
        if (data[idx] > 0) {
          maskPixels.add(`${x},${y}`);
        }
      }
    }

    // Find all edge pixels
    const edgePixels: Point[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + 3; // Alpha channel
        if (data[idx] > 0 && isEdgePixel(data, x, y, width, height)) {
          edgePixels.push({ x, y });
        }
      }
    }

    if (edgePixels.length === 0) return []; // No mask found

    // Find connected components of edge pixels
    for (const point of edgePixels) {
      const key = `${point.x},${point.y}`;
      if (visited.has(key)) continue;

      const path = traceEdgePath(
        point.x,
        point.y,
        data,
        width,
        height,
        visited
      );

      if (path.length > 2) {
        // Determine if this is an inner or outer edge
        const isInner = isInnerEdge(path, width, height, maskPixels);
        // Increase epsilon for more aggressive simplification
        const simplifiedPoints = simplifyPath(path, 4.0); // Increased epsilon further for smoother edges
        if (simplifiedPoints.length > 1) {
          // Ensure simplification doesn't remove the path
          edgePaths.push({
            points: simplifiedPoints,
            isInner,
          });
        }
      }
    }

    return edgePaths;
  }, []); // Dependencies removed as helper functions are defined within useCallback scope or stable

  // Check if this is an inner edge (hole)
  const isInnerEdge = useCallback(
    (
      path: Point[],
      width: number,
      height: number,
      maskPixels: Set<string>
    ): boolean => {
      if (path.length < 3) return false;

      // Simple check: pick a point inside the bounding box but not on the path
      // If it's part of the mask, it's likely an outer edge.
      // If it's not part of the mask, it's likely an inner edge (hole).
      // This is simpler and potentially faster than ray casting.

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      for (const point of path) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }

      // Find a test point within the bounding box, preferably away from the edges
      const testX = Math.floor((minX + maxX) / 2);
      const testY = Math.floor((minY + maxY) / 2);

      // Check if test point is on the path itself
      if (path.some((p) => p.x === testX && p.y === testY)) {
        // Fallback: try slightly offset points if the center is on the path
        // (This is a simplification, might not cover all edge cases perfectly)
        const offsets = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        for (const offset of offsets) {
          const offsetX = testX + offset.dx;
          const offsetY = testY + offset.dy;
          if (
            offsetX >= 0 &&
            offsetX < width &&
            offsetY >= 0 &&
            offsetY < height &&
            !path.some((p) => p.x === offsetX && p.y === offsetY)
          ) {
            return !maskPixels.has(`${offsetX},${offsetY}`);
          }
        }
        // If even offsets are on the path or out of bounds, default to outer
        return false;
      }

      // If test point is inside bounds, check if it belongs to the mask
      if (testX >= 0 && testX < width && testY >= 0 && testY < height) {
        return !maskPixels.has(`${testX},${testY}`);
      }

      // Default to outer edge if test point is outside canvas (shouldn't happen often)
      return false;
    },
    []
  );

  // Trace an edge path
  const traceEdgePath = useCallback(
    (
      startX: number,
      startY: number,
      data: Uint8ClampedArray,
      width: number,
      height: number,
      visited: Set<string>
    ): Point[] => {
      const path: Point[] = [];
      const directions = [
        { x: 1, y: 0 }, // right
        { x: 1, y: 1 }, // down-right
        { x: 0, y: 1 }, // down
        { x: -1, y: 1 }, // down-left
        { x: -1, y: 0 }, // left
        { x: -1, y: -1 }, // up-left
        { x: 0, y: -1 }, // up
        { x: 1, y: -1 }, // up-right
      ];

      let x = startX;
      let y = startY;
      let dirIdx = 0; // Start looking right initially
      let steps = 0;
      const maxSteps = width * height * 2; // Increased safety limit slightly

      while (steps < maxSteps) {
        const key = `${x},${y}`;
        // Add point if not visited OR if it's the start point and path is long enough to close
        if (
          !visited.has(key) ||
          (x === startX && y === startY && path.length > 2)
        ) {
          path.push({ x, y });
          visited.add(key); // Mark as visited
        }

        // Moore-Neighbor tracing: Start looking from the direction after the last successful step
        let found = false;
        const startDir = (dirIdx + 6) % 8; // Start search from direction left of last move

        for (let i = 0; i < 8; i++) {
          const currentDir = (startDir + i) % 8;
          const nx = x + directions[currentDir].x;
          const ny = y + directions[currentDir].y;

          // Check if this neighbor is a valid edge pixel
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4 + 3;
            if (data[idx] > 0 && isEdgePixel(data, nx, ny, width, height)) {
              // Found next edge pixel
              x = nx;
              y = ny;
              dirIdx = currentDir; // Update direction for next step's search start
              found = true;
              break;
            }
          }
        }

        // Check for termination conditions
        if (!found || (x === startX && y === startY && path.length > 2)) {
          // Completed the loop or cannot find next pixel
          // Ensure the path is closed if it started and ended at the same point
          if (
            path.length > 2 &&
            path[0].x === x &&
            path[0].y === y &&
            path[path.length - 1].x !== x &&
            path[path.length - 1].y !== y
          ) {
            path.push({ x, y }); // Explicitly close loop if needed
          }
          break;
        }

        steps++;
        // Safety break if something goes wrong
        if (steps >= maxSteps - 1) {
          console.warn("Max steps reached during edge tracing, breaking loop.");
          break;
        }
      }

      return path;
    },
    []
  ); // isEdgePixel is stable

  // Check if a pixel is on the edge of the mask
  const isEdgePixel = useCallback(
    (
      data: Uint8ClampedArray,
      x: number,
      y: number,
      width: number,
      height: number
    ): boolean => {
      // A pixel is on the edge if it has at least one transparent neighbor
      const idx = (y * width + x) * 4 + 3;
      if (data[idx] === 0) return false; // Skip transparent pixels

      // Check 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // Skip self

          const nx = x + dx;
          const ny = y + dy;

          // If neighbor is out of bounds, consider it transparent (thus, current pixel is edge)
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            return true;
          }

          // Check if neighbor is transparent
          const nIdx = (ny * width + nx) * 4 + 3;
          if (data[nIdx] === 0) {
            return true;
          }
        }
      }

      return false;
    },
    []
  );

  // Simplify a path using the Ramer-Douglas-Peucker algorithm
  const simplifyPath = useCallback(
    (points: Point[], epsilon: number): Point[] => {
      if (points.length <= 2) return points;

      // Find the point with the maximum distance
      let maxDistance = 0;
      let index = 0;
      const start = points[0];
      const end = points[points.length - 1];

      for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(points[i], start, end);
        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }

      // If max distance is greater than epsilon, recursively simplify
      if (maxDistance > epsilon) {
        // Recursive case
        const firstPath = simplifyPath(points.slice(0, index + 1), epsilon);
        const secondPath = simplifyPath(points.slice(index), epsilon);

        // Concatenate the two paths, removing the duplicate point
        return [...firstPath.slice(0, -1), ...secondPath];
      }

      // Base case: all points in this segment are close to the line
      return [start, end];
    },
    []
  ); // perpendicularDistance is stable

  // Calculate perpendicular distance from a point to a line
  const perpendicularDistance = useCallback(
    (point: Point, lineStart: Point, lineEnd: Point): number => {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;

      // If the line is just a point, return the distance to that point
      const lineLengthSquared = dx * dx + dy * dy;
      if (lineLengthSquared === 0) {
        return Math.sqrt(
          (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
        );
      }

      // Project the point onto the line using dot product
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
            lineLengthSquared
        )
      );

      const projectionX = lineStart.x + t * dx;
      const projectionY = lineStart.y + t * dy;

      // Calculate the distance to the projection on the line segment
      return Math.sqrt(
        (point.x - projectionX) ** 2 + (point.y - projectionY) ** 2
      );
    },
    []
  );

  // Get scaled coordinates relative to the canvas drawing buffer
  const getScaledCoordinates = useCallback(
    (e: React.PointerEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      const bufferWidth = canvas.width;
      const bufferHeight = canvas.height;

      // Prevent division by zero if display size is somehow zero
      if (displayWidth === 0 || displayHeight === 0) return null;

      const scaleX = bufferWidth / displayWidth;
      const scaleY = bufferHeight / displayHeight;

      const clientX = e.clientX;
      const clientY = e.clientY;

      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;

      // Clamp coordinates to be within the buffer dimensions
      const clampedX = Math.max(0, Math.min(bufferWidth, canvasX));
      const clampedY = Math.max(0, Math.min(bufferHeight, canvasY));

      return { x: clampedX, y: clampedY };
    },
    [canvasRef]
  ); // Depends only on the ref

  // Apply a brush stroke at the given coordinates (relative to buffer)
  const applyBrush = useCallback(
    (x: number, y: number) => {
      if (!maskLayerRef.current) return;

      const data = maskLayerRef.current.data;
      const width = maskLayerRef.current.width;
      const height = maskLayerRef.current.height; // Get height for bounds check
      const radius = brushSize / 2;
      const radiusSquared = radius * radius;

      // Define bounds for iteration
      const startX = Math.max(0, Math.floor(x - radius));
      const endX = Math.min(width, Math.ceil(x + radius));
      const startY = Math.max(0, Math.floor(y - radius));
      const endY = Math.min(height, Math.ceil(y + radius));

      // For each pixel in the brush bounding box
      for (let iy = startY; iy < endY; iy++) {
        for (let ix = startX; ix < endX; ix++) {
          // Calculate distance from center of brush
          const distSquared = (ix - x) ** 2 + (iy - y) ** 2;

          if (distSquared <= radiusSquared) {
            // Calculate index in the image data array
            const idx = (iy * width + ix) * 4;

            // Set the pixel to orange with 50% opacity
            // We use rgb(249, 127, 39) which is the orange color from maskColor
            data[idx] = 249; // R
            data[idx + 1] = 127; // G
            data[idx + 2] = 39; // B
            data[idx + 3] = 128; // A (half opacity)
          }
        }
      }

      // Don't trigger full redraw on every brush application
      // setNeedsRedraw(true);
      // Instead, redraw minimally (without borders) during pointer move
    },
    [brushSize] // Removed canvasSize dependency as width/height come from maskLayerRef
  );

  // Draw a line between two points (relative to buffer)
  const drawLine = useCallback(
    (startPoint: Point, endPoint: Point) => {
      // Distance between points
      const distance = Math.sqrt(
        (endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2
      );
      const segmentLength = brushSize / 4; // Draw segments roughly quarter brush size

      // If points are very close, just draw at end point
      if (distance < segmentLength) {
        applyBrush(endPoint.x, endPoint.y);
        return;
      }

      // Draw points along the line for a smooth stroke
      const steps = Math.ceil(distance / segmentLength);
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        const x = startPoint.x + (endPoint.x - startPoint.x) * ratio;
        const y = startPoint.y + (endPoint.y - startPoint.y) * ratio;
        applyBrush(x, y);
      }
    },
    [brushSize, applyBrush]
  );

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const coords = getScaledCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      applyBrush(coords.x, coords.y);
      lastPositionRef.current = coords;
    },
    [applyBrush, getScaledCoordinates] // Use getScaledCoordinates
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const coords = getScaledCoordinates(e);
      if (!coords) {
        // Still update cursor position based on raw coords if scaling fails
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          setCursorPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        } else {
          setCursorPosition(null);
        }
        return;
      }

      // Update visual cursor based on unscaled coords relative to bounding rect
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCursorPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }

      if (!isDrawing) return;

      if (lastPositionRef.current) {
        // Pass scaled coordinates to drawLine
        drawLine(lastPositionRef.current, coords);
      } else {
        applyBrush(coords.x, coords.y);
      }
      lastPositionRef.current = coords;

      redrawMask(false);
    },
    [
      isDrawing,
      applyBrush,
      drawLine,
      redrawMask,
      getScaledCoordinates,
      canvasRef,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (!isDrawing) return; // Avoid redraw if not drawing

      setIsDrawing(false);
      lastPositionRef.current = null;

      // When stopping drawing, do a full redraw *with* borders
      redrawMask(true);
    },
    [isDrawing, redrawMask]
  );

  const handlePointerLeave = useCallback(() => {
    // If leaving while drawing, finalize the drawing
    if (isDrawing) {
      setIsDrawing(false);
      lastPositionRef.current = null;
      // Do a full redraw *with* borders
      redrawMask(true);
    }
    setCursorPosition(null);
  }, [isDrawing, redrawMask]);

  // Public method to clear the mask
  const clearMask = useCallback(() => {
    if (!maskLayerRef.current) return;

    // Reset the mask layer data
    const data = maskLayerRef.current.data;
    for (let i = 0; i < data.length; i += 4) {
      // Faster to set alpha to 0
      data[i + 3] = 0;
    }

    // Clear the edge paths
    edgePathsRef.current = [];

    // Update canvas with borders (or lack thereof)
    redrawMask(true);
  }, [redrawMask]);

  // Expose clear mask method to parent
  useEffect(() => {
    if (canvasRef.current) {
      // Cast to our extended interface and add the clearMask method
      const typedCanvas = canvasRef.current as MaskCanvasElement;
      typedCanvas.clearMask = clearMask;
    }

    return () => {
      if (canvasRef.current) {
        // Clean up by setting the property to undefined
        const typedCanvas = canvasRef.current as MaskCanvasElement;
        typedCanvas.clearMask = undefined;
      }
    };
  }, [canvasRef, clearMask]);

  return (
    <>
      <canvas
        ref={canvasRef}
        // Width/Height attributes are now set correctly in the init useEffect
        // width={canvasSize.width}
        // height={canvasSize.height}
        // The CSS determines the display size, which might differ from attributes
        className="absolute top-0 left-0 z-10 block w-full h-full cursor-none touch-none" // Use block w-full h-full to fill parent div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          touchAction: "none", // Prevent scrolling while drawing
        }}
      />

      {/* Custom cursor position is based on unscaled coords relative to bounding rect */}
      {cursorPosition && (
        <div
          className="absolute z-20 transition-transform duration-75 ease-out pointer-events-none"
          style={{
            width: `${brushSize}px`,
            height: `${brushSize}px`,
            borderRadius: "50%",
            border: `2px solid ${borderColor}`,
            backgroundColor: maskColor,
            transform: `translate(${cursorPosition.x - brushSize / 2}px, ${
              cursorPosition.y - brushSize / 2
            }px)`,
            top: 0,
            left: 0,
          }}
        />
      )}
    </>
  );
};

import type { Edge, Node, Viewport } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

export interface CanvasState {
	nodes: Node[];
	edges: Edge[];
	viewport: Viewport;
}

interface UseCanvasUndoRedoOptions {
	maxHistorySize?: number;
	onStateChange?: (state: CanvasState) => void;
}

export function useCanvasUndoRedo({
	maxHistorySize = 50,
	onStateChange,
}: UseCanvasUndoRedoOptions = {}) {
	const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
	const [redoStack, setRedoStack] = useState<CanvasState[]>([]);
	const isInternalUpdate = useRef(false);

	// Push new state to history
	const pushState = useCallback(
		(state: CanvasState) => {
			// Don't record if this is an internal update (undo/redo)
			if (isInternalUpdate.current) return;

			setUndoStack((prev) => {
				const newStack = [...prev, state];
				// Limit stack size
				if (newStack.length > maxHistorySize) {
					return newStack.slice(newStack.length - maxHistorySize);
				}
				return newStack;
			});

			// Clear redo stack when new action is performed
			setRedoStack([]);
		},
		[maxHistorySize],
	);

	// Undo operation
	const undo = useCallback(
		(currentState: CanvasState) => {
			if (undoStack.length === 0) return null;

			const previousState = undoStack[undoStack.length - 1];
			
			// Move current state to redo stack
			setRedoStack((prev) => [...prev, currentState]);
			
			// Remove the state we're restoring from undo stack
			setUndoStack((prev) => prev.slice(0, -1));

			// Mark as internal update
			isInternalUpdate.current = true;
			setTimeout(() => {
				isInternalUpdate.current = false;
			}, 100);

			onStateChange?.(previousState);
			return previousState;
		},
		[undoStack, onStateChange],
	);

	// Redo operation
	const redo = useCallback(
		(currentState: CanvasState) => {
			if (redoStack.length === 0) return null;

			const nextState = redoStack[redoStack.length - 1];
			
			// Move current state to undo stack
			setUndoStack((prev) => [...prev, currentState]);
			
			// Remove the state we're restoring from redo stack
			setRedoStack((prev) => prev.slice(0, -1));

			// Mark as internal update
			isInternalUpdate.current = true;
			setTimeout(() => {
				isInternalUpdate.current = false;
			}, 100);

			onStateChange?.(nextState);
			return nextState;
		},
		[redoStack, onStateChange],
	);

	// Check if we're currently doing an undo/redo operation
	const isUndoRedo = useCallback(() => isInternalUpdate.current, []);

	return {
		pushState,
		undo,
		redo,
		canUndo: undoStack.length > 0,
		canRedo: redoStack.length > 0,
		isUndoRedo,
		undoStackSize: undoStack.length,
		redoStackSize: redoStack.length,
	};
}
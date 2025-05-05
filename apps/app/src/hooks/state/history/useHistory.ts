import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { PUSH, REDO, RESET, UNDO, UPDATE_ALL } from "./actions";
import type { HistoryAtoms } from "./historyAtom";

export interface UseHistoryResult<Value> {
  /** The current value from the history stack. */
  current: Value;
  /** Function to dispatch a new value onto the history stack. */
  push: (value: Value) => void;
  /** Function to undo the last action. */
  undo: () => void;
  /** Function to redo the last undone action. */
  redo: () => void;
  /** Function to reset the history to its initial state. */
  reset: () => void;
  /** Function to apply an updater function to the entire history stack. */
  updateAll: (updater: (history: Value[]) => Value[]) => void;
  /** Boolean indicating if an undo operation is possible. */
  canUndo: boolean;
  /** Boolean indicating if a redo operation is possible. */
  canRedo: boolean;
  /** The full history stack (for reading or debugging). */
  stack: Value[];
}

/**
 * Hook to interact with history state created by `createHistoryAtoms`.
 *
 * @param atoms The object containing history atoms from `createHistoryAtoms`.
 * @returns An object with the current value and functions to manipulate history.
 */
export function useHistory<Value>(
  atoms: HistoryAtoms<Value>
): UseHistoryResult<Value> {
  const current = useAtomValue(atoms.currentValueAtom);
  const canUndo = useAtomValue(atoms.canUndoAtom);
  const canRedo = useAtomValue(atoms.canRedoAtom);
  const stack = useAtomValue(atoms.stackAtom); // Expose stack directly
  const dispatch = useSetAtom(atoms.historyDispatcherAtom);

  const push = useCallback(
    (value: Value) => {
      dispatch({ type: PUSH, value });
    },
    [dispatch]
  );

  const undo = useCallback(() => {
    dispatch({ type: UNDO });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: REDO });
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch({ type: RESET });
  }, [dispatch]);

  const updateAll = useCallback(
    (updater: (history: Value[]) => Value[]) => {
      dispatch({ type: UPDATE_ALL, updater });
    },
    [dispatch]
  );

  return {
    current,
    push,
    undo,
    redo,
    reset,
    updateAll,
    canUndo,
    canRedo,
    stack, // Return the stack
  };
}

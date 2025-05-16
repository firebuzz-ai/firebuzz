import type { Atom, WritableAtom } from "jotai";
import { atom } from "jotai";
import {
	type HistoryAction,
	PUSH,
	REDO,
	RESET,
	UNDO,
	UPDATE_ALL,
} from "./actions";

export interface HistoryAtoms<Value> {
	/** Atom holding the current value based on the history index. */
	currentValueAtom: Atom<Value>;
	/** Atom indicating if an undo operation is possible. */
	canUndoAtom: Atom<boolean>;
	/** Atom indicating if a redo operation is possible. */
	canRedoAtom: Atom<boolean>;
	/** Atom to dispatch actions (UNDO, REDO, PUSH, RESET, UPDATE_ALL) to the history state. */
	historyDispatcherAtom: WritableAtom<null, [HistoryAction<Value>], void>;
	/** Atom containing the raw stack of history values. Read-only access recommended. */
	stackAtom: Atom<Value[]>;
	/** Atom containing the current index within the history stack. Read-only access recommended. */
	indexAtom: Atom<number>;
}

/**
 * Creates a set of atoms to manage a history state.
 *
 * @param initialValue The initial value to start the history with.
 * @param limit The maximum number of history entries to keep.
 * @returns An object containing atoms for history management.
 */
export function createHistoryAtoms<Value>(
	initialValue: Value,
	limit: number,
): HistoryAtoms<Value> {
	const stackAtom = atom<Value[]>([initialValue]);
	const indexAtom = atom(0); // Index 0 is the *newest* state

	const currentValueAtom = atom((get) => get(stackAtom)[get(indexAtom)]);

	const canUndoAtom = atom((get) => get(indexAtom) < get(stackAtom).length - 1);
	const canRedoAtom = atom((get) => get(indexAtom) > 0);

	const historyDispatcherAtom = atom(
		null, // write-only atom
		(get, set, action: HistoryAction<Value>) => {
			const currentStack = get(stackAtom);
			const currentIndex = get(indexAtom);

			switch (action.type) {
				case PUSH: {
					// Drop redo states
					const newStack = currentStack.slice(currentIndex);
					// Add new state at the beginning
					newStack.unshift(action.value);
					// Trim to limit
					const limitedStack = newStack.slice(0, limit);
					set(stackAtom, limitedStack);
					set(indexAtom, 0); // Reset index to the newest state
					break;
				}
				case UPDATE_ALL: {
					const updatedStack = action.updater(currentStack);
					// Ensure stack length doesn't exceed limit after update
					const limitedUpdate = updatedStack.slice(0, limit);
					set(stackAtom, limitedUpdate);
					// Clamp index to be within the bounds of the potentially modified stack
					set(
						indexAtom,
						Math.min(currentIndex, Math.max(0, limitedUpdate.length - 1)),
					);
					break;
				}
				case UNDO: {
					if (get(canUndoAtom)) {
						set(indexAtom, currentIndex + 1);
					}
					break;
				}
				case REDO: {
					if (get(canRedoAtom)) {
						set(indexAtom, currentIndex - 1);
					}
					break;
				}
				case RESET: {
					set(stackAtom, [initialValue]);
					set(indexAtom, 0);
					break;
				}
				default: {
					// Optional: Throw error for unhandled action types
					// Or handle custom actions if extended
					break;
				}
			}
		},
	);

	return {
		currentValueAtom,
		canUndoAtom,
		canRedoAtom,
		historyDispatcherAtom,
		stackAtom: stackAtom as Atom<Value[]>,
		indexAtom: indexAtom as Atom<number>,
	};
}

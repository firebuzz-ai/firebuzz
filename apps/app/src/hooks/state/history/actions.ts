export const UNDO = Symbol("undo");
export type UNDO = typeof UNDO;

export const REDO = Symbol("redo");
export type REDO = typeof REDO;

export const RESET = Symbol("reset");
export type RESET = typeof RESET;

export const PUSH = Symbol("push");
export type PUSH = typeof PUSH;

export const UPDATE_ALL = Symbol("update_all");
export type UPDATE_ALL = typeof UPDATE_ALL;

// Type for actions handled by the history dispatcher
export type HistoryAction<Value> =
	| { type: UNDO }
	| { type: REDO }
	| { type: RESET }
	| { type: PUSH; value: Value }
	| { type: UPDATE_ALL; updater: (history: Value[]) => Value[] };

import {
  type HistoryAtoms,
  createHistoryAtoms,
  useHistory,
} from "@/hooks/state/history";
import { atom, getDefaultStore, useStore } from "jotai";

const limit = 10;

// Interface for the mask data including dimensions
export interface MaskData {
  /** Geometry data, coordinates relative to imageNaturalWidth/Height */
  json: string;
  /** The natural width of the image this mask belongs to */
  imageNaturalWidth: number;
  /** The natural height of the image this mask belongs to */
  imageNaturalHeight: number;
}

// Single atom holding a map from imageId to its history atoms
const historyAtomsMapAtom = atom(
  new Map<string, HistoryAtoms<MaskData | null>>()
);

/**
 * Retrieves or creates/stores the HistoryAtoms for a given imageId.
 * @param imageId The ID of the image.
 * @param store The Jotai store instance.
 * @returns The HistoryAtoms object for the imageId.
 */
function getHistoryAtoms(
  imageId: string,
  store: ReturnType<typeof useStore>
): HistoryAtoms<MaskData | null> {
  const historyAtomsMap = store.get(historyAtomsMapAtom);
  const existingAtoms = historyAtomsMap.get(imageId);

  if (existingAtoms) {
    return existingAtoms;
  }

  // Create new atoms if they don't exist
  const newHistoryAtoms = createHistoryAtoms<MaskData | null>(null, limit);
  const newMap = new Map(historyAtomsMap);
  newMap.set(imageId, newHistoryAtoms);
  store.set(historyAtomsMapAtom, newMap);

  return newHistoryAtoms;
}

/**
 * Hook to manage mask state with undo/redo history for a specific image.
 * Uses the custom history implementation.
 */
export const useMaskState = (imageId: string) => {
  const store = useStore();
  const historyAtoms = getHistoryAtoms(imageId, store);
  const historyResult = useHistory(historyAtoms);
  return historyResult;
};

/**
 * Checks if a history state exists for the given image ID without using hooks.
 * @param imageId The ID of the image to check.
 * @returns True if history exists, false otherwise.
 */
export const checkHasHistory = (imageId: string): boolean => {
  const store = getDefaultStore();
  const historyAtomsMap = store.get(historyAtomsMapAtom);
  if (!historyAtomsMap.has(imageId)) return false;
  const mainState = historyAtomsMap.get(imageId);
  const canUndoAtom = mainState?.canUndoAtom;
  const canRedoAtom = mainState?.canRedoAtom;
  if (!canUndoAtom || !canRedoAtom) return false;
  return store.get(canUndoAtom) || store.get(canRedoAtom);
};

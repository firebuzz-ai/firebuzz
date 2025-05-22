import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

export const useEditMemoryItem = () => {
  return useQueryStates(
    {
      editMemoryItem: parseAsBoolean,
      documentKey: parseAsString,
      documentId: parseAsString,
    },
    {
      urlKeys: {
        editMemoryItem: "edit-memory-item",
        documentKey: "document-key",
        documentId: "document-id",
      },
      history: "replace",
    }
  );
};

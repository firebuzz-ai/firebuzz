import { parseAsString, useQueryStates } from "nuqs";

export const useEditAudienceModal = () => {
  return useQueryStates(
    {
      edit: parseAsString,
    },
    {
      urlKeys: {
        edit: "edit-audience",
      },
    }
  );
};

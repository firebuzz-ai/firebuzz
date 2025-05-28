import { parseAsBoolean, useQueryStates } from "nuqs";

export const useNewAudienceModal = () => {
  return useQueryStates(
    {
      create: parseAsBoolean,
    },
    {
      urlKeys: {
        create: "create-audience",
      },
    }
  );
};

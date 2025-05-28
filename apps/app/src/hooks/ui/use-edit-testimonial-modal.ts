import { parseAsString, useQueryStates } from "nuqs";

export const useEditTestimonialModal = () => {
  return useQueryStates(
    {
      edit: parseAsString,
    },
    {
      urlKeys: {
        edit: "edit-testimonial",
      },
    }
  );
};

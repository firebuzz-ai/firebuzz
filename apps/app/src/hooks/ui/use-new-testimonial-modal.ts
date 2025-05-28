import { parseAsBoolean, useQueryStates } from "nuqs";

export const useNewTestimonialModal = () => {
  return useQueryStates(
    {
      create: parseAsBoolean,
    },
    {
      urlKeys: {
        create: "create-testimonial",
      },
    }
  );
};

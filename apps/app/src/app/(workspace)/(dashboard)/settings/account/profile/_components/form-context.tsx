"use client";

import { useUser } from "@/hooks/auth/use-user";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { type ReactNode, createContext, useContext, useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  imageUrl: z.string().optional(),
});

interface ProfileFormContextType {
  form: ReturnType<typeof useForm<z.infer<typeof formSchema>>>;
  isLoading: boolean;
  onSubmit: () => void;
  canSave: boolean;
}

const ProfileFormContext = createContext<ProfileFormContextType | null>(null);

export const useProfileForm = () => {
  const context = useContext(ProfileFormContext);
  return context; // Return null if not available instead of throwing
};

interface ProfileFormProviderProps {
  children: ReactNode;
}

export const ProfileFormProvider = ({ children }: ProfileFormProviderProps) => {
  const { user: currentUser } = useUser();
  const updateProfileMutation = useMutation(
    api.collections.users.mutations.updateProfile
  );
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: currentUser?.firstName || "",
      lastName: currentUser?.lastName || "",
      imageUrl: currentUser?.imageUrl || "",
    },
    mode: "onChange",
  });

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    if (!currentUser) {
      toast.error("User not found", {
        id: "update-profile-error",
      });
      return;
    }

    try {
      setIsLoading(true);
      await updateProfileMutation({
        firstName: data.firstName,
        lastName: data.lastName,
        imageUrl: data.imageUrl || undefined,
      });

      toast.success("Profile updated successfully", {
        id: "update-profile",
      });

      // Reset form dirty state
      form.reset(data);
    } catch (error) {
      const errorMessage =
        error instanceof ConvexError ? error.data : "Unexpected error occurred";

      toast.error("Failed to update profile", {
        id: "update-profile-error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = () => {
    form.handleSubmit(onSubmitHandler)();
  };

  const canSave = form.formState.isDirty && !isLoading && !!currentUser;

  const value = {
    form,
    isLoading,
    onSubmit,
    canSave,
  };

  return (
    <ProfileFormContext.Provider value={value}>
      {children}
    </ProfileFormContext.Provider>
  );
};

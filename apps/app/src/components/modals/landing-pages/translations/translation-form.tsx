"use client";

import type { Id } from "@firebuzz/convex";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { LocaleSelector } from "@firebuzz/ui/components/reusable/locale-selector";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Info } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { sleep } from "@firebuzz/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  language: z.string().min(2, "Language is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TranslationFormProps {
  onSuccess?: () => void;
  originalLandingPageId: Id<"landingPages">;
}

export const TranslationForm = ({
  onSuccess,
  originalLandingPageId,
}: TranslationFormProps) => {
  const router = useRouter();
  const createTranslationMutation = useMutation(
    api.collections.landingPages.mutations.createTranslation
  );
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "",
      description: "",
    },
  });

  const onSubmitHandler = async (data: FormData) => {
    try {
      setIsLoading(true);
      toast.loading("Creating translation...", { id: "create-translation" });

      const translationId = await createTranslationMutation({
        originalId: originalLandingPageId,
        language: data.language,
      });

      // Wait for creation to complete
      await sleep(2000);

      toast.success("Translation created", {
        id: "create-translation",
        description: "You will be redirected to your translation.",
      });

      // Close the modal
      onSuccess?.();

      // Redirect to the translation editor
      router.push(`/assets/landing-pages/${translationId}/edit`);
    } catch (error) {
      console.error("Error creating translation:", error);
      toast.error("Failed to create translation", {
        id: "create-translation",
        description:
          error instanceof ConvexError
            ? error.data
            : "Unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex overflow-hidden flex-col flex-1 h-full">
      <div className="overflow-auto flex-1 p-4">
        <div className="flex flex-col justify-center items-center">
          <Card className="w-full">
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(onSubmitHandler)}
                >
                  {/* Language */}
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <FormControl>
                          <LocaleSelector
                            className="h-8"
                            defaultValue={field.value}
                            onLocaleChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            placeholder="Brief description of this translation"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Information */}
          <div className="flex gap-2 items-center p-3 mt-4 w-full rounded-lg border border-border">
            <div className="p-1.5 rounded-md bg-muted border border-border">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm text-muted-foreground">
              This will create a translation copy with the same template and
              theme as the original.{" "}
              <span className="font-medium text-primary">
                But you must go to the landing page editor and make sure you
                translate the landing page.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Submit Button */}
      <div className="p-4 border-t">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={form.handleSubmit(onSubmitHandler)}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex gap-2 items-center">
              <Spinner size="xs" variant="default" />
              Creating Translation...
            </div>
          ) : (
            "Create Translation"
          )}
        </Button>
      </div>
    </div>
  );
};

import { ImageUpload } from "@/components/image-upload";
import { parsedFilesAtom, seoConfigAtom } from "@/lib/workbench/atoms";
import { webcontainerInstance } from "@/lib/workbench/webcontainer";
import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

// Define schema for SEO configuration
const seoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  canonical: z.string().url("Must be a valid URL"),
  indexable: z.boolean().default(true),
  iconType: z.string(),
  icon: z.string(), // Allow any string format for icon paths
  openGraph: z.object({
    title: z.string().min(1, "Open Graph title is required"),
    description: z.string().min(1, "Open Graph description is required"),
    image: z.string().url("Must be a valid URL"),
    url: z.string().url("Must be a valid URL"),
    type: z.string(),
  }),
  twitter: z.object({
    card: z.string(),
    title: z.string().min(1, "Twitter title is required"),
    description: z.string().min(1, "Twitter description is required"),
    image: z.string().url("Must be a valid URL"),
    url: z.string().url("Must be a valid URL"),
  }),
});

export type SeoConfigType = z.infer<typeof seoSchema>;

interface SeoTabProps {
  landingPageId: Id<"landingPages">;
  setSaveHandler: React.Dispatch<
    React.SetStateAction<(() => Promise<void>) | null>
  >;
  setUnsavedChanges: (unsavedChanges: boolean) => void;
}

export const SeoTab = ({
  landingPageId,
  setSaveHandler,
  setUnsavedChanges,
}: SeoTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const seoConfig = useAtomValue(seoConfigAtom);
  const setParsedFiles = useSetAtom(parsedFilesAtom);
  const updateCurrentVersionFiles = useMutation(
    api.collections.landingPages.versions.mutations.updateCurrentVersionFiles
  );

  // Parse the SEO configuration string to get the object
  const parsedConfig = useMemo(() => {
    if (!seoConfig?.content) return null;

    // Extract the configuration object from the string
    const configStr = seoConfig.content;
    const match = configStr.match(
      /export const seoConfiguration = ({[\s\S]*?});/
    );
    if (!match || !match[1]) return null;

    try {
      // Use Function constructor to safely evaluate the object expression
      // This allows us to parse the configuration without using eval
      const obj = new Function(`return ${match[1]}`)();
      return obj as SeoConfigType;
    } catch (error) {
      console.error("Failed to parse SEO configuration:", error);
      return null;
    }
  }, [seoConfig?.content]);

  const form = useForm<SeoConfigType>({
    resolver: zodResolver(seoSchema),
    defaultValues: parsedConfig || {
      title: "",
      description: "",
      canonical: "",
      indexable: true,
      iconType: "",
      icon: "",
      openGraph: {
        title: "",
        description: "",
        image: "",
        url: "",
        type: "",
      },
      twitter: {
        card: "",
        title: "",
        description: "",
        image: "",
        url: "",
      },
    },
    mode: "onChange", // Enable onChange validation mode
  });

  // Save handler that will be exposed to parent component
  const handleSave = useCallback(async (): Promise<void> => {
    try {
      if (!seoConfig) {
        throw new Error("SEO configuration not found");
      }

      setIsLoading(true);

      // Validate the form
      const valid = await form.trigger();
      if (!valid) {
        throw new Error("Form validation failed");
      }

      // Get form values
      const data = form.getValues();

      // Prepare the updated configuration string
      const configString = `
// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests e.g. "I want to change the meta title to 'My new title'"

export const seoConfiguration = ${JSON.stringify(data, null, 2)};
`.trim();

      // Write the file to the webcontainer
      await webcontainerInstance.fs.writeFile(
        `${landingPageId}/${seoConfig.path}`,
        configString
      );

      // Get all files
      const files = await webcontainerInstance.export(`${landingPageId}`, {
        excludes: ["node_modules", "dist", "build", "public", "false"],
      });

      // Update parsed files state
      setParsedFiles((prev) => {
        return new Map(prev).set(seoConfig.path, {
          path: seoConfig.path,
          content: configString,
          extension: "ts",
        });
      });

      // Save the files to the database
      await updateCurrentVersionFiles({
        landingPageId,
        filesString: JSON.stringify(files),
      });

      toast.success("SEO configuration updated");
    } catch (error) {
      console.error("Failed to update SEO configuration:", error);
      toast.error("Failed to update SEO configuration");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    form,
    landingPageId,
    updateCurrentVersionFiles,
    seoConfig,
    setParsedFiles,
  ]);

  // Reset form on unmount
  useEffect(() => {
    if (parsedConfig) {
      console.log("resetting form");
      form.reset(parsedConfig);
    }
  }, [parsedConfig, form.reset]);

  useEffect(() => {
    // Pass the function reference directly. React stores the function itself.
    setSaveHandler(() => handleSave);
  }, [handleSave, setSaveHandler]);

  useEffect(() => {
    setUnsavedChanges(form.formState.isDirty);
  }, [form.formState.isDirty, setUnsavedChanges]);

  if (!parsedConfig) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
        <span className="ml-2">Loading SEO configuration...</span>
      </div>
    );
  }

  return (
    <div className="py-4">
      <Form {...form}>
        <form>
          <div className="px-4 pb-4 space-y-6 border-b">
            <div className="">
              <h2 className="text-lg font-medium">General SEO Settings</h2>
              <p className="text-sm text-muted-foreground">
                Settings used to optimize your page for search engines
              </p>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormDescription>
                      The title displayed in search results and browser tabs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={isLoading} rows={4} />
                    </FormControl>
                    <FormDescription>
                      A brief description of your page for search engines
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canonical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canonical URL</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormDescription>
                      The preferred URL for this page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Favicon</FormLabel>
                    <div>
                      <FormControl>
                        <Input
                          className="sr-only"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div>
                        <ImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="indexable"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <FormLabel>
                        {field.value ? "Indexable" : "No Index"}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormDescription className="text-xs">
                      Whether this page should be indexed by search engines
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="p-4 space-y-6 border-b">
            <div>
              <h2 className="text-lg font-medium">Open Graph</h2>
              <p className="text-sm text-muted-foreground">
                Settings used when your page is shared on Facebook and other
                platforms
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="openGraph.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG Title</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openGraph.url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG URL</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openGraph.description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>OG Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={isLoading} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openGraph.image"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>OG Image URL</FormLabel>
                    <div>
                      <FormControl>
                        <Input
                          className="sr-only"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </div>
                    <FormDescription>
                      Image that appears when shared on social media
                      (recommended size: 1200x630)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="px-4 pt-4 pb-2 space-y-6">
            <div>
              <h2 className="text-lg font-medium">Twitter Card</h2>
              <p className="text-sm text-muted-foreground">
                Settings used when your page is shared on Twitter/X
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="twitter.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter Title</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twitter.url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter URL</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twitter.description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Twitter Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={isLoading} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="twitter.image"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Twitter Image URL</FormLabel>
                    <div>
                      <FormControl>
                        <Input
                          className="sr-only"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </div>
                    <FormDescription>
                      Image that appears when shared on Twitter (recommended
                      size: 1200x600)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

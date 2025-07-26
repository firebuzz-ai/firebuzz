"use client";

import { useProject } from "@/hooks/auth/use-project";
import type { Id } from "@firebuzz/convex";
import {
  ConvexError,
  api,
  useCachedQuery,
  useMutation,
  usePaginatedQuery,
} from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@firebuzz/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Info } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  campaignId: z.string().min(1, "Campaign is required"),
  templateId: z.string().min(1, "Template is required"),
  themeId: z.string(),
});

export function CreateLandingPage() {
  const router = useRouter();
  const { currentProject } = useProject();
  const createLandingPageMutation = useMutation(
    api.collections.landingPages.mutations.create
  );
  const [isLoading, setIsLoading] = useState(false);

  const { results: campaigns } = usePaginatedQuery(
    api.collections.campaigns.queries.getPaginated,
    currentProject
      ? {
          projectId: currentProject._id,
          sortOrder: "desc",
          searchQuery: undefined,
          isArchived: false,
          isPublished: false,
        }
      : "skip",
    { initialNumItems: 50 }
  );

  const { results: templates } = usePaginatedQuery(
    api.collections.landingPages.templates.queries.getPaginated,
    {
      paginationOpts: {
        numItems: 50,
      },
    },
    { initialNumItems: 50 }
  );

  const themes = useCachedQuery(api.collections.brands.themes.queries.getAll, {
    showHidden: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      campaignId: "",
      templateId: "",
      themeId: "",
    },
  });

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    if (!currentProject) {
      toast.error("Project not found", {
        id: "create-landing-page-error",
      });
      return;
    }

    try {
      setIsLoading(true);
      await createLandingPageMutation({
        title: data.title,
        projectId: currentProject._id,
        campaignId: data.campaignId as Id<"campaigns">,
        templateId: data.templateId as Id<"landingPageTemplates">,
        themeId: data.themeId as Id<"themes">,
      });

      toast.success("Landing page created", {
        id: "create-landing-page",
        description: "You will be redirected to your landing pages.",
      });

      router.push("/assets/landing-pages");
    } catch (error) {
      const errorMessage =
        error instanceof ConvexError ? error.data : "Unexpected error occurred";

      toast.error("Failed to create landing page", {
        id: "create-landing-page-error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center items-center mx-auto max-w-lg">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle>Create Landing Page</CardTitle>
          <CardDescription>
            Create a new landing page to showcase your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmitHandler)}
            >
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My Landing Page" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Landing page description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campaign */}
              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a campaign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {campaigns?.map((campaign) => (
                          <SelectItem key={campaign._id} value={campaign._id}>
                            {campaign.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Template */}
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Theme */}
              <FormField
                control={form.control}
                name="themeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {themes?.map((theme) => (
                          <SelectItem key={theme._id} value={theme._id}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex gap-2 items-center">
                    <Spinner size="xs" variant="default" /> Creating...
                  </div>
                ) : (
                  "Create Landing Page"
                )}
              </Button>
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
          Landing pages help you create engaging content for your audience.
        </div>
      </div>
    </div>
  );
}

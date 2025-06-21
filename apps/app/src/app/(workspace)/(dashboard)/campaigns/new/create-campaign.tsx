"use client";

import { useProject } from "@/hooks/auth/use-project";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
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
import { slugify } from "@firebuzz/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(["lead-generation", "click-through"]),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
});

export const CreateCampaignForm = () => {
  const router = useRouter();
  const { currentProject } = useProject();
  const createCampaignMutation = useMutation(
    api.collections.campaigns.mutations.create
  );
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "lead-generation",
      slug: "",
    },
  });

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    if (!currentProject) {
      toast.error("Project not found", {
        id: "create-campaign-error",
      });
      return;
    }
    try {
      setIsLoading(true);
      await createCampaignMutation({
        title: data.title,
        type: data.type,
        projectId: currentProject?._id,
        slug: slugify(data.slug),
      });

      toast.success("Campaign created", {
        id: "create-campaign",
        description: "You will be redirected to your new campaign.",
      });

      router.push("/campaigns");
    } catch (error) {
      const errorMessage =
        error instanceof ConvexError ? error.data : "Unexpected error occurred";

      toast.error("Failed to create campaign", {
        id: "create-campaign-error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center items-center max-w-lg">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle>Create Campaign</CardTitle>
          <CardDescription>
            Create a new campaign to engage with your audience
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
                      <Input placeholder="My Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="my-campaign" {...field} />
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
                        placeholder="Campaign description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campaign Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a campaign type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lead-generation">
                          Lead Generation
                        </SelectItem>
                        <SelectItem value="click-through">
                          Click Through
                        </SelectItem>
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
                  "Create Campaign"
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
          Campaigns help you create and manage your marketing flows effectively.
        </div>
      </div>
    </div>
  );
};

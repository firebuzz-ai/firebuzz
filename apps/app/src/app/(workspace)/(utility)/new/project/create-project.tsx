"use client";

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
  ColorPicker,
  colorPickerColorZodEnum,
} from "@firebuzz/ui/components/ui/color-picker";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import {
  IconPicker,
  iconPickerIconZodEnum,
} from "@firebuzz/ui/components/ui/icon-picker";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Info } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { slugify } from "@firebuzz/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

export const CreateProjectForm = () => {
  const router = useRouter();
  const createProjectMutation = useMutation(api.collections.projects.create);
  const formSchema = z.object({
    title: z.string().min(3),
    color: colorPickerColorZodEnum,
    icon: iconPickerIconZodEnum,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");

  const [isLoading, setIsLoading] = useState(false);

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      await createProjectMutation({
        title: data.title,
        color: data.color,
        icon: data.icon,
        slug: slugify(data.title),
      });

      toast.success("Project created", {
        id: "create-project",
        description: "You will be redirected to your new project.",
      });
    } catch (error) {
      const errorMessage =
        // Check whether the error is an application error
        error instanceof ConvexError
          ? // Access data and cast it to the type we expect
            error.data
          : // Must be some developer error,
            // and prod deployments will not
            // reveal any more information about it
            // to the client
            "Unexpected error occurred";
      toast.error("Failed to create project.", {
        id: "create-project-error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 max-w-lg">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="mb-2">
            <ColoredIconPreview color={watchedColor} icon={watchedIcon} />
          </div>

          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Add a new project to manage your content content and campaigns
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
                      <Input placeholder="My Workspace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-4">
                {/* Color Picker */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Icon Picker */}
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <IconPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="xs" variant="default" /> Creating...
                  </div>
                ) : (
                  "Create Project"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      {/* Information */}
      <div className="border border-border rounded-lg p-3 mt-4 w-full flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-muted border border-border">
          <Info className="w-3.5 h-3.5" />
        </div>
        <div className="text-sm text-muted-foreground">
          Projects help you manage your contents and campaigns consistently.
        </div>
      </div>
    </div>
  );
};

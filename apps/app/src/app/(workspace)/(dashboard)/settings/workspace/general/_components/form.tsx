"use client";

import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { ImagePreview } from "@/components/sheets/settings/landing-page/image-preview";
import { ImageSelect } from "@/components/sheets/settings/landing-page/image-select";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
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
import { useWorkspaceGeneralForm } from "./form-context";

export const WorkspaceGeneralForm = () => {
	const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
	const formContext = useWorkspaceGeneralForm();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const getWorkspaceInitials = (title: string) => {
		return title
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.substring(0, 2)
			.toUpperCase();
	};

	if (isWorkspaceLoading || !currentWorkspace || !formContext) {
		return (
			<div className="flex flex-1 justify-center items-center">
				<Spinner size="sm" />
			</div>
		);
	}

	const { form, isLoading } = formContext;

	return (
		<div className="p-6 space-y-6 w-full border-b max-h-min">
			{/* Header */}
			<div>
				<h1 className="text-lg font-semibold">General</h1>
				<p className="text-sm text-muted-foreground">
					Manage your workspace general settings.
				</p>
			</div>

			<Form {...form}>
				{/* General Settings Section */}
				<div className="flex overflow-hidden relative flex-col flex-1 max-h-full">
					<div className="overflow-y-auto flex-1 space-y-4 max-w-xl">
						<div className="flex gap-2 items-center p-2 mt-2 rounded-md border bg-muted/50">
							<Avatar className="w-6 h-6">
								<AvatarImage
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${currentWorkspace.logo}`}
									alt="Logo preview"
								/>
								<AvatarFallback className="text-xs">
									{getWorkspaceInitials(form.getValues().title)}
								</AvatarFallback>
							</Avatar>
							<span className="text-sm font-medium">
								{currentWorkspace.title}
							</span>
							<div className="flex gap-1 items-center ml-auto text-xs text-primary/30">
								Preview
							</div>
						</div>
						{/* Title */}
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Workspace Name</FormLabel>
									<FormControl>
										<Input
											className="!h-8"
											placeholder="My Workspace"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										This is the name that will be displayed across the platform.
									</FormDescription>
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
										<Input
											className="!h-8"
											placeholder="my-workspace"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										This is the slug that will be used to access your workspace.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Logo */}
						<FormField
							control={form.control}
							name="logo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Workspace Logo</FormLabel>
									<div>
										<FormControl>
											<Input
												className="sr-only"
												{...field}
												disabled={isLoading}
											/>
										</FormControl>
										{!field.value ? (
											<ImageSelect
												allowedSources={["gallery", "upload"]}
												activeTab="upload"
												onChange={field.onChange}
											/>
										) : (
											<ImagePreview
												src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${field.value}`}
												handleDeselect={() => {
													field.onChange("");
												}}
											/>
										)}
									</div>
									<FormDescription>
										Upload your workspace logo image (recommended: SVG or PNG
										with transparent background)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>
			</Form>

			<MediaGalleryModal />
		</div>
	);
};

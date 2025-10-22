"use client";

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
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";
import { useUser } from "@/hooks/auth/use-user";
import { useProfileForm } from "./form-context";

export const ProfileForm = () => {
	const { user: currentUser, isLoading: isUserLoading } = useUser();
	const formContext = useProfileForm();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const getUserInitials = (
		firstName: string | undefined,
		lastName: string | undefined,
	) => {
		if (firstName && lastName) {
			return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
		}

		if (firstName && !lastName) {
			return firstName.slice(0, 2).toLocaleUpperCase();
		}

		if (!firstName && lastName) {
			return lastName.slice(0, 2).toLocaleUpperCase();
		}

		return "FR";
	};

	if (isUserLoading || !currentUser || !formContext) {
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
				<h1 className="text-lg font-semibold">Profile</h1>
				<p className="text-sm text-muted-foreground">
					Manage your personal information and avatar.
				</p>
			</div>

			<Form {...form}>
				{/* Profile Settings Section */}
				<div className="flex overflow-hidden relative flex-col flex-1 max-h-full">
					<div className="overflow-y-auto flex-1 space-y-4 max-w-xl">
						<div className="flex gap-2 items-center p-2 mt-2 rounded-md border bg-muted/50">
							<Avatar className="w-6 h-6">
								<AvatarImage
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${form.getValues().imageKey || currentUser.imageKey}`}
									alt="Profile preview"
								/>
								<AvatarFallback className="text-xs">
									{getUserInitials(
										form.getValues().firstName || currentUser.firstName || "",
										form.getValues().lastName || currentUser.lastName || "",
									)}
								</AvatarFallback>
							</Avatar>
							<span className="text-sm font-medium">
								{form.getValues().firstName || currentUser.firstName}{" "}
								{form.getValues().lastName || currentUser.lastName}
							</span>
							<div className="flex gap-1 items-center ml-auto text-xs text-primary/30">
								Preview
							</div>
						</div>

						{/* First Name */}
						<FormField
							control={form.control}
							name="firstName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>First Name</FormLabel>
									<FormControl>
										<Input
											className="!h-8"
											placeholder="John"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										Your first name as it will appear on your profile.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Last Name */}
						<FormField
							control={form.control}
							name="lastName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Last Name</FormLabel>
									<FormControl>
										<Input
											className="!h-8"
											placeholder="Doe"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										Your last name as it will appear on your profile.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Avatar */}
						<FormField
							control={form.control}
							name="imageKey"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Profile Avatar</FormLabel>
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
										Upload your profile avatar image (recommended: square image,
										JPG or PNG format)
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

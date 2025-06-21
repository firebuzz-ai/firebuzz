"use client";

import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { Check, Plus, X } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { AVATARS } from "@firebuzz/utils";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

/* export const AVATARS = [
	{
		key: "old-female-1",
		name: "Julia",
	},
	{
		key: "old-male-1",
		name: "John",
	},
	{
		key: "old-female-2",
		name: "Jane",
	},
	{
		key: "old-male-2",
		name: "Bruce",
	},
	{
		key: "mid-female-1",
		name: "Sarah",
	},
	{
		key: "mid-male-1",
		name: "David",
	},
	{
		key: "mid-female-2",
		name: "Emily",
	},
	{
		key: "mid-male-2",
		name: "Michael",
	},
	{
		key: "mid-female-3",
		name: "Olivia",
	},
	{
		key: "mid-male-3",
		name: "Oliver",
	},
	{
		key: "young-female-1",
		name: "Emma",
	},
	{
		key: "young-male-1",
		name: "Noah",
	},
	{
		key: "young-female-2",
		name: "Ava",
	},
	{
		key: "young-male-2",
		name: "Liam",
	},
	{
		key: "young-female-3",
		name: "Isabella",
	},
	{
		key: "young-male-3",
		name: "William",
	},
]; */

// Define schema for audience creation based on the convex schema
const audienceSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().min(1, "Description is required"),
	gender: z.enum(["male", "female"], {
		required_error: "Please select a gender",
	}),
	age: z.enum(["18-24", "25-34", "35-44", "45-54", "55-64", "65+"], {
		required_error: "Please select an age range",
	}),
	goals: z.string().min(1, "Goals are required"),
	motivations: z.string().min(1, "Motivations are required"),
	frustrations: z.string().min(1, "Frustrations are required"),
	terminologies: z.array(z.string()).default([]),
	avatar: z
		.union([
			z.literal("old-female-1"),
			z.literal("old-male-1"),
			z.literal("old-female-2"),
			z.literal("old-male-2"),
			z.literal("mid-female-1"),
			z.literal("mid-male-1"),
			z.literal("mid-female-2"),
			z.literal("mid-male-2"),
			z.literal("mid-female-3"),
			z.literal("mid-male-3"),
			z.literal("young-female-1"),
			z.literal("young-male-1"),
			z.literal("young-female-2"),
			z.literal("young-male-2"),
			z.literal("young-female-3"),
			z.literal("young-male-3"),
		])
		.default("old-female-1"),
});

export type AudienceFormType = z.infer<typeof audienceSchema>;

interface AudienceFormProps {
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	isCreating: boolean;
	initialValues?: Partial<Doc<"audiences">>;
	audienceId?: Doc<"audiences">["_id"];
	mode?: "create" | "edit";
}

export const AudienceForm = ({
	setSaveHandler,
	isCreating,
	initialValues,
	audienceId,
	mode = "create",
}: AudienceFormProps) => {
	const createAudience = useMutation(
		api.collections.brands.audiences.mutations.create,
	);
	const updateAudience = useMutation(
		api.collections.brands.audiences.mutations.update,
	);
	const [newTerminology, setNewTerminology] = useState("");

	const form = useForm<AudienceFormType>({
		resolver: zodResolver(audienceSchema),
		defaultValues: {
			name: initialValues?.name || "",
			description: initialValues?.description || "",
			gender: initialValues?.gender || undefined,
			age: initialValues?.age || undefined,
			goals: initialValues?.goals || "",
			motivations: initialValues?.motivations || "",
			frustrations: initialValues?.frustrations || "",
			terminologies: initialValues?.terminologies || [],
			avatar: initialValues?.avatar || ("old-female-1" as const),
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	// Save handler that will be exposed to parent component
	const handleSave = useCallback(async (): Promise<void> => {
		if (isCreating) return;

		try {
			// Validate the form
			const valid = await form.trigger();
			if (!valid) {
				toast.error("Please fill in all fields", {
					id: mode === "create" ? "create-audience" : "update-audience",
				});
				return;
			}

			// Get form values
			const data = form.getValues();

			if (mode === "edit" && audienceId) {
				// Update the audience
				await updateAudience({
					id: audienceId,
					name: data.name,
					avatar: data.avatar,
					description: data.description,
					gender: data.gender,
					age: data.age,
					goals: data.goals,
					motivations: data.motivations,
					frustrations: data.frustrations,
					terminologies: data.terminologies,
				});

				toast.success("Audience updated successfully", {
					id: "update-audience",
				});
			} else {
				// Create the audience
				await createAudience({
					name: data.name,
					description: data.description,
					gender: data.gender,
					age: data.age,
					goals: data.goals,
					motivations: data.motivations,
					frustrations: data.frustrations,
					terminologies: data.terminologies,
					avatar: data.avatar,
				});

				toast.success("Audience created successfully", {
					id: "create-audience",
				});
			}
		} catch (error) {
			console.error(`Failed to ${mode} audience:`, error);
			toast.error(`Failed to ${mode} audience`, {
				id: mode === "create" ? "create-audience" : "update-audience",
			});
		}
	}, [form, createAudience, updateAudience, isCreating, mode, audienceId]);

	// Set up save handler for parent component
	useEffect(() => {
		setSaveHandler(() => handleSave);
	}, [handleSave, setSaveHandler]);

	// Handle adding terminology
	const handleAddTerminology = () => {
		if (newTerminology.trim()) {
			const currentTerminologies = form.getValues("terminologies");
			form.setValue("terminologies", [
				...currentTerminologies,
				newTerminology.trim(),
			]);
			setNewTerminology("");
		}
	};

	// Handle removing terminology
	const handleRemoveTerminology = (index: number) => {
		const currentTerminologies = form.getValues("terminologies");
		form.setValue(
			"terminologies",
			currentTerminologies.filter((_, i) => i !== index),
		);
	};

	// Handle keyboard event for terminology input
	const handleTerminologyKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTerminology();
		}
	};

	return (
		<div className="flex-1 w-full max-h-full py-4 overflow-y-auto">
			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					{/* Basic Information */}
					<div className="px-4 pb-4 space-y-6 border-b">
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												className="!h-8"
												placeholder="e.g., Tech-Savvy Millennials"
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										<FormDescription>
											A descriptive name for this audience segment
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Brief overview of this audience segment"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										<FormDescription>
											A clear description of who this audience represents
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="gender"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Gender</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger className="!h-8">
														<SelectValue placeholder="Select gender" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="male">Male</SelectItem>
													<SelectItem value="female">Female</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="age"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Age Range</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger className="!h-8">
														<SelectValue placeholder="Select age range" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="18-24">18-24</SelectItem>
													<SelectItem value="25-34">25-34</SelectItem>
													<SelectItem value="35-44">35-44</SelectItem>
													<SelectItem value="45-54">45-54</SelectItem>
													<SelectItem value="55-64">55-64</SelectItem>
													<SelectItem value="65+">65+</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
					</div>

					{/* Avatar Selection */}
					<div className="px-4 py-4 space-y-6 border-b">
						<div>
							<h2 className="text-lg font-medium">Avatar</h2>
							<p className="text-sm text-muted-foreground">
								Choose a visual representation for this audience
							</p>
						</div>
						<FormField
							control={form.control}
							name="avatar"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Select Avatar</FormLabel>
									<FormControl>
										<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 ">
											{AVATARS.map((avatar) => (
												<button
													key={avatar.key}
													type="button"
													onClick={() => field.onChange(avatar.key)}
													className={`relative p-2 border rounded-lg transition-all hover:shadow-md ${
														field.value === avatar.key
															? "border-brand ring-2 ring-brand/20"
															: "border-border hover:border-brand/50"
													}`}
													disabled={isCreating}
												>
													<Avatar className="p-1 mx-auto border size-20 bg-background-subtle">
														<AvatarImage
															className="shadow-md"
															src={`/avatars/${avatar.key}.png`}
															alt={avatar.name}
														/>
														<AvatarFallback>
															{avatar.name.charAt(0)}
														</AvatarFallback>
													</Avatar>
													<p className="mt-1 text-xs text-center text-muted-foreground">
														{avatar.name}
													</p>
													{field.value === avatar.key && (
														<div className="absolute flex items-center justify-center w-5 h-5 rounded-full top-1 right-1 bg-brand">
															<Check className="w-3 h-3 text-primary-foreground" />
														</div>
													)}
												</button>
											))}
										</div>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Psychological Profile */}
					<div className="px-4 py-4 space-y-6 border-b">
						<div>
							<h2 className="text-lg font-medium">Psychological Profile</h2>
							<p className="text-sm text-muted-foreground">
								Understand what drives this audience
							</p>
						</div>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="goals"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Goals</FormLabel>
										<FormControl>
											<Textarea
												placeholder="What does this audience want to achieve?"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										<FormDescription>
											Primary objectives and aspirations of this audience
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="motivations"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Motivations</FormLabel>
										<FormControl>
											<Textarea
												placeholder="What drives this audience to take action?"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										<FormDescription>
											Key factors that motivate this audience
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="frustrations"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Frustrations</FormLabel>
										<FormControl>
											<Textarea
												placeholder="What challenges does this audience face?"
												className="resize-none"
												rows={3}
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										<FormDescription>
											Pain points and obstacles this audience encounters
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Terminologies */}
					<div className="px-4 py-4 space-y-6">
						<div>
							<h2 className="text-lg font-medium">Terminologies</h2>
							<p className="text-sm text-muted-foreground">
								Key terms and language this audience uses
							</p>
						</div>
						<FormField
							control={form.control}
							name="terminologies"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Terms & Phrases</FormLabel>
									<div className="space-y-3">
										{/* Input for adding new terminology */}
										<div className="flex gap-2">
											<Input
												className="!h-8 flex-1"
												placeholder="Add a term or phrase"
												value={newTerminology}
												onChange={(e) => setNewTerminology(e.target.value)}
												onKeyDown={handleTerminologyKeyDown}
												disabled={isCreating}
											/>
											<Button
												type="button"
												size="iconSm"
												variant="outline"
												onClick={handleAddTerminology}
												disabled={!newTerminology.trim() || isCreating}
											>
												<Plus className="w-4 h-4" />
											</Button>
										</div>

										{/* Display existing terminologies */}
										{field.value.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{field.value.map((term, index) => (
													<Badge
														key={`${term}-${
															// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
															index
														}`}
														variant="brand"
														className="flex items-center gap-1 pr-1"
													>
														{term}
														<button
															type="button"
															onClick={() => handleRemoveTerminology(index)}
															className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground"
															disabled={isCreating}
														>
															<X className="w-3 h-3" />
														</button>
													</Badge>
												))}
											</div>
										)}
									</div>
									<FormDescription>
										Industry terms, slang, or specific language this audience
										uses
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
		</div>
	);
};

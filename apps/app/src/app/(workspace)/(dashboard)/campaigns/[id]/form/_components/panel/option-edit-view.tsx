"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormField as FormFieldComponent,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { ArrowLeft } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useEffect } from "react";
import { z } from "zod";
import type { PanelScreen } from "../form-types";

// Option edit schema
const optionEditSchema = z.object({
	label: z.string().min(1, "Label is required"),
	value: z.string().min(1, "Value is required"),
});

interface OptionEditViewProps {
	option: { label: string; value: string } | null;
	allOptions: { label: string; value: string }[];
	onScreenChange: (screen: PanelScreen) => void;
	onSave: (
		updatedOption: { label: string; value: string },
		originalValue: string,
	) => void;
	onDelete: (value: string) => void;
}

export const OptionEditView = ({
	option,
	allOptions,
	onScreenChange,
	onSave,
	onDelete,
}: OptionEditViewProps) => {
	const optionForm = useForm<z.infer<typeof optionEditSchema>>({
		resolver: zodResolver(optionEditSchema),
		defaultValues: {
			label: option?.label || "",
			value: option?.value || "",
		},
	});

	// Update form when option changes
	useEffect(() => {
		if (option) {
			optionForm.reset({
				label: option.label,
				value: option.value,
			});
		}
	}, [option, optionForm]);

	const onSubmit = async (data: z.infer<typeof optionEditSchema>) => {
		if (!option) return;

		// Check for duplicate values (excluding current option)
		const duplicateExists = allOptions.some(
			(opt) => opt.value === data.value && opt.value !== option.value,
		);

		if (duplicateExists) {
			optionForm.setError("value", {
				type: "manual",
				message: "This value already exists",
			});
			return;
		}

		onSave(data, option.value);
		onScreenChange("field-settings");
		toast.success("Option updated successfully");
	};

	const handleDelete = () => {
		if (!option) return;

		onDelete(option.value);
		onScreenChange("field-settings");
		toast.success("Option deleted successfully");
	};

	if (!option) {
		return (
			<div className="flex flex-col h-full">
				<div className="flex gap-2 items-center mb-4">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onScreenChange("field-settings")}
					>
						<ArrowLeft className="w-4 h-4" />
					</Button>
					<h2 className="text-lg font-semibold">Edit Option</h2>
				</div>
				<div className="flex flex-1 justify-center items-center">
					<p className="text-sm text-muted-foreground">No option selected</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex gap-2 justify-between items-center px-4 py-3 border-b bg-muted">
				<div className="flex gap-2 items-center">
					<Button
						size="iconXs"
						variant="outline"
						className="!p-1.5"
						onClick={() => onScreenChange("field-settings")}
					>
						<ArrowLeft className="size-3" />
					</Button>
					<h2 className="font-semibold">Edit Option</h2>
				</div>
			</div>

			<div className="overflow-y-auto flex-1 p-4 min-h-0">
				<Form {...optionForm}>
					<form
						onSubmit={optionForm.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormFieldComponent
							control={optionForm.control}
							name="label"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Option Label</FormLabel>
									<FormControl>
										<Input
											className="h-8"
											placeholder="What users will see"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormFieldComponent
							control={optionForm.control}
							name="value"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Option Value</FormLabel>
									<FormControl>
										<Input
											className="h-8"
											placeholder="The stored value"
											{...field}
										/>
									</FormControl>
									<FormMessage />
									<div className="text-xs text-muted-foreground">
										This value must be unique and will be stored in your
										database
									</div>
								</FormItem>
							)}
						/>

						<div className="flex gap-2 items-center pt-4">
							<Button
								size="sm"
								variant="outline"
								type="submit"
								disabled={optionForm.formState.isSubmitting}
								className="w-full"
							>
								Save Changes
							</Button>
							<Button
								onClick={handleDelete}
								size="sm"
								variant="ghost"
								type="button"
								disabled={optionForm.formState.isSubmitting}
								className="w-full text-destructive"
							>
								Delete Option
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
};

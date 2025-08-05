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

	// Watch form changes and save automatically (with debouncing through the parent)
	useEffect(() => {
		if (!option) return;

		const subscription = optionForm.watch((data) => {
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

			// Clear any previous errors
			optionForm.clearErrors("value");

			// Only save if data is valid and different
			if (
				data.label &&
				data.value &&
				(data.label !== option.label || data.value !== option.value)
			) {
				onSave(data as { label: string; value: string }, option.value);
			}
		});

		return () => subscription.unsubscribe();
	}, [option, allOptions, optionForm, onSave]);

	const handleDelete = () => {
		if (!option) return;

		onDelete(option.value);
		onScreenChange("field-settings");
		toast.success("Option deleted successfully");
	};

	if (!option) {
		return (
			<div className="flex flex-col h-full">
				<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
					<Button
						size="iconSm"
						variant="outline"
						onClick={() => onScreenChange("field-settings")}
						className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
					>
						<ArrowLeft className="size-4" />
					</Button>

					<div className="flex-1">
						<div className="flex flex-col">
							<div className="text-lg font-semibold leading-tight">
								Edit Option
							</div>
							<div className="text-sm leading-tight text-muted-foreground">
								Select an option to configure
							</div>
						</div>
					</div>
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
			<div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
				<Button
					size="iconSm"
					variant="outline"
					onClick={() => onScreenChange("field-settings")}
					className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
				>
					<ArrowLeft className="size-4" />
				</Button>

				<div className="flex-1">
					<div className="flex flex-col">
						<div className="text-lg font-semibold leading-tight">
							Edit Option
						</div>
						<div className="text-sm leading-tight text-muted-foreground">
							Configure option label and value
						</div>
					</div>
				</div>
			</div>

			<div className="overflow-y-auto flex-1 p-4 min-h-0">
				<Form {...optionForm}>
					<form className="space-y-4">
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

						<div className="pt-4 border-t">
							<Button
								onClick={handleDelete}
								size="sm"
								variant="destructive"
								type="button"
								className="w-full"
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

"use client";

import { failedActionsAtom } from "@/lib/workbench/atoms";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AlertTriangle } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { z } from "zod";

export const actionErrorSchema = z.object({
	actionType: z
		.string()
		.describe("The type of action that failed (file, quick-edit, shell)"),
	errorMessage: z.string().describe("The error message that was thrown"),
	filePath: z
		.string()
		.optional()
		.describe("The file path where the error occurred"),
	from: z
		.string()
		.optional()
		.describe(
			"The original content that was supposed to be replaced (for quick-edit actions)",
		),
	to: z
		.string()
		.optional()
		.describe(
			"The new content that was supposed to replace the original (for quick-edit actions)",
		),
	suggestion: z.string().describe("A suggestion to fix the error"),
});

export const ActionErrors = ({
	onSubmit,
}: {
	onSubmit: (message: string) => Promise<void>;
}) => {
	const [failedActions, setFailedActions] = useAtom(failedActionsAtom);

	const { submit, isLoading: isHandlingError } = useObject({
		api: "/api/chat/landing/fix-error",
		schema: z.array(actionErrorSchema),
		onFinish: ({ object }) => {
			setFailedActions([]);
			onSubmit(
				JSON.stringify({
					type: "action-error-explanation",
					errors: object,
				}),
			);
		},
	});

	const handleErrorClick = async () => {
		try {
			submit({
				prompt: JSON.stringify(
					failedActions.map((action) => ({
						message: action.error.message,
						type: action.error.actionType,
						filePath: action.error.filePath,
						from: action.error.from,
						to: action.error.to,
					})),
					null,
					2,
				),
			});
		} catch (error) {
			console.error("Failed to handle action errors:", error);
			toast.error("Failed to fix action errors");
		}
	};

	const handleMarkAsResolved = () => {
		setFailedActions([]);
	};

	if (failedActions.length === 0) return null;

	return (
		<div className="absolute w-full px-4 -top-16">
			<motion.div
				className="flex items-center justify-between w-full px-3 py-2 border rounded-lg shadow-sm bg-muted"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<div className="flex items-center gap-2 text-amber-400">
					<AlertTriangle className="size-4" />
					<p className="text-sm">{failedActions.length} action errors found.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={handleMarkAsResolved} size="sm" variant="ghost">
						Mark as resolved
					</Button>
					<Button
						onClick={handleErrorClick}
						size="sm"
						className="w-32"
						disabled={isHandlingError}
					>
						{isHandlingError ? (
							<Spinner size="xs" />
						) : (
							<div className="flex items-center gap-2">
								<div>Fix Errors</div>
								<ButtonShortcut>⌘A</ButtonShortcut>
							</div>
						)}
					</Button>
				</div>
			</motion.div>
		</div>
	);
};

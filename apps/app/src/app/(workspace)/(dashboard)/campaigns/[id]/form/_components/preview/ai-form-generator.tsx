"use client";

import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowRight, Sparkles } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormField } from "../form-types";

// Subtle slide + fade animation
const animations = {
	container: {
		hidden: { opacity: 0, y: 8 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.18, ease: "easeOut" },
		},
		exit: {
			opacity: 0,
			y: 8,
			transition: { duration: 0.12, ease: "easeInOut" },
		},
	},
};

interface AIFormGeneratorProps {
	isVisible: boolean;
	existingSchema: FormField[];
	onSchemaUpdate: (
		schema: FormField[],
		submitButtonText?: string,
		successMessage?: string,
	) => void;
	onClose?: () => void;
}

export const AIFormGenerator = ({
	isVisible,
	existingSchema,
	onSchemaUpdate,
	onClose,
}: AIFormGeneratorProps) => {
	const [prompt, setPrompt] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	const handleGenerate = useCallback(async () => {
		if (!prompt.trim()) return;

		setIsGenerating(true);
		try {
			const response = await fetch("/api/chat/form/generate-schema", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompt: prompt.trim(),
					existingSchema:
						existingSchema.length > 0 ? existingSchema : undefined,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to generate form schema");
			}

			const result = await response.json();

			// Update the form schema
			onSchemaUpdate(
				result.schema,
				result.submitButtonText,
				result.successMessage,
			);

			setPrompt("");
		} catch (error) {
			console.error("Error generating form schema:", error);
			// Add proper error handling (consider using a toast notification)
		} finally {
			setIsGenerating(false);
		}
	}, [prompt, existingSchema, onSchemaUpdate]);

	// Reset prompt when hidden
	useEffect(() => {
		if (!isVisible) {
			setPrompt("");
		}
	}, [isVisible]);

	// Focus input when visible
	useEffect(() => {
		if (isVisible && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isVisible]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				void handleGenerate();
			}
			if (e.key === "Escape") {
				onClose?.();
			}
		},
		[handleGenerate, onClose],
	);

	if (!isVisible) return null;

	return (
		<AnimatePresence mode="wait">
			<motion.div
				variants={animations.container}
				initial="hidden"
				animate="visible"
				exit="exit"
				className={cn(
					// Position just above the controller (which sits bottom-center)
					"flex absolute right-0 left-0 bottom-14 z-20 justify-center items-center p-2 select-none",
				)}
			>
				<div className="flex relative items-center w-full max-w-xl rounded-md border shadow-sm bg-muted">
					<div className="pr-2 pl-3 text-muted-foreground">
						<Sparkles className="size-4" />
					</div>

					<Input
						ref={inputRef}
						type="text"
						placeholder={
							existingSchema.length > 0
								? "Ask AI to modify your form..."
								: "Describe the form you want to create..."
						}
						className="flex-1 h-9 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
					/>

					<div className="flex gap-1 items-center">
						<Button
							className="hover:bg-transparent"
							variant="ghost"
							size="iconSm"
						>
							<ButtonShortcut>⌘G</ButtonShortcut>
						</Button>
						<Button
							variant="ghost"
							size="iconSm"
							className="p-2 mr-1 w-auto h-auto rounded-md text-muted-foreground hover:bg-muted disabled:bg-transparent"
							onClick={() => {
								void handleGenerate();
							}}
							disabled={!prompt.trim() || isGenerating}
						>
							{isGenerating ? (
								<Spinner size="xs" />
							) : (
								<ArrowRight className="size-4" />
							)}
						</Button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

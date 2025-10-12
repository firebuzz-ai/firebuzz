"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Minus } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { memo } from "react";
import {
	AnimatedButton,
	AnimatedButtonShortcut,
} from "@/components/reusables/animated-button";
import type { FormField } from "../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/form-types";
import { useFormCanvasController } from "../controller/provider";
import { FormFieldsRenderer } from "./form-fields-renderer";

export interface FormNodeData extends Record<string, unknown> {
	title: string;
	description?: string;
	schema: FormField[];
	submitButtonText: string;
	successMessage: string;
	successRedirectUrl?: string;
}

export const FormNode = memo(({ data }: NodeProps) => {
	const { setIsGeneratingSchema } = useFormCanvasController();
	const nodeData = data as FormNodeData;
	return (
		<div className={cn("relative min-w-[400px] max-w-[600px]")}>
			{/* Hidden handles for potential future connections */}
			<Handle type="target" position={Position.Top} className="invisible" />
			<Handle type="source" position={Position.Bottom} className="invisible" />

			<Card className="p-6 shadow-lg backdrop-blur bg-background/95">
				{/* Form Fields - Reuse form renderer logic */}
				<div className="space-y-4 max-h-[600px] overflow-y-auto">
					{nodeData.schema.length === 0 ? (
						<div className="text-center text-muted-foreground">
							<div className="inline-flex justify-center items-center rounded-md border bg-muted p-1.5">
								<Minus className="size-6" />
							</div>
							<h3 className="mt-4 text-lg font-semibold text-primary">
								No Form Schema
							</h3>
							<p className="mx-auto max-w-xs text-sm">
								You can generate form with AI or you can use to panel on the
								right to add fields.
							</p>
						</div>
					) : (
						<FormFieldsRenderer fields={nodeData.schema} />
					)}
				</div>

				{/* Form Footer */}
				{nodeData.schema.length > 0 ? (
					<div className="pt-4 mt-4 border-t">
						<Button className="w-full" size="sm" disabled>
							{nodeData.submitButtonText || "Submit"}
						</Button>
					</div>
				) : (
					<AnimatedButton
						className="mt-4 w-full"
						variant="outline"
						onClick={() => setIsGeneratingSchema(true)}
					>
						Generate Schema <AnimatedButtonShortcut>⌘G</AnimatedButtonShortcut>
					</AnimatedButton>
				)}
			</Card>
		</div>
	);
});

FormNode.displayName = "FormNode";

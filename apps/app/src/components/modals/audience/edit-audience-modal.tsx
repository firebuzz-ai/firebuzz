import { api, ConvexError, useQuery } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { useEditAudienceModal } from "@/hooks/ui/use-edit-audience-modal";
import { AudienceForm } from "./audience-form";

export const EditAudienceModal = () => {
	const [state, setState] = useEditAudienceModal();
	const [isUpdating, setIsUpdating] = useState(false);
	const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
		null,
	);

	// Fetch the audience data
	const audience = useQuery(
		api.collections.brands.audiences.queries.getById,
		// biome-ignore lint/suspicious/noExplicitAny: Convex ID typing complexity
		state.edit ? { id: state.edit as any } : "skip",
	);

	const handleUpdate = async () => {
		if (!saveHandler) return;

		try {
			setIsUpdating(true);
			await saveHandler();
			// Close modal on success
			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update audience.", {
					description: error.data,
					id: "update-audience",
				});
			} else {
				toast.error("Failed to update audience.", {
					description: "Please try again.",
					id: "update-audience",
				});
			}
		} finally {
			setIsUpdating(false);
		}
	};

	// Don't render if no audience ID or audience not found
	if (!state.edit || !audience) {
		return null;
	}

	return (
		<Dialog
			open={!!state.edit}
			onOpenChange={(value) => {
				setState(value ? state : null);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-2xl w-full h-[70vh] flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Edit Audience</DialogTitle>
						<DialogDescription>
							Update the details for your audience.
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					{(state.edit && audience) || !state.edit ? (
						<AudienceForm
							setSaveHandler={setSaveHandler}
							isCreating={isUpdating}
							initialValues={audience}
							audienceId={audience._id}
							mode="edit"
						/>
					) : (
						<div className="flex items-center justify-center h-full">
							<Spinner size="sm" />
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t">
					<Button
						size="sm"
						variant="outline"
						className="w-full"
						onClick={handleUpdate}
						disabled={isUpdating || !saveHandler}
					>
						{isUpdating ? (
							<Spinner size="xs" />
						) : (
							<>
								Update <ButtonShortcut>⌘S</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

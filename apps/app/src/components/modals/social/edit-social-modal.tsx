import { useEditSocialModal } from "@/hooks/ui/use-edit-social-modal";
import {
	ConvexError,
	type Id,
	api,
	useCachedRichQuery,
} from "@firebuzz/convex";
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
import { SocialForm } from "./social-form";

export const EditSocialModal = () => {
	const [state, setState] = useEditSocialModal();
	const [isUpdating, setIsUpdating] = useState(false);
	const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
		null,
	);

	const { data: social, isPending: isLoading } = useCachedRichQuery(
		api.collections.brands.socials.queries.getById,
		state.edit ? { id: state.edit as Id<"socials"> } : "skip",
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
				toast.error("Failed to update social account.", {
					description: error.data,
					id: "update-social",
				});
			} else {
				toast.error("Failed to update social account.", {
					description: "Please try again.",
					id: "update-social",
				});
			}
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Dialog
			open={!!state.edit}
			onOpenChange={(value) => {
				setState(value ? state : null);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-2xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Edit Social Account</DialogTitle>
						<DialogDescription>
							Update your social media account information.
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					{isLoading ? (
						<div className="flex items-center justify-center flex-1">
							<Spinner size="sm" />
						</div>
					) : social ? (
						<SocialForm
							setSaveHandler={setSaveHandler}
							isCreating={isUpdating}
							initialValues={social}
							socialId={social._id}
							mode="edit"
						/>
					) : (
						<div className="flex items-center justify-center flex-1">
							<p className="text-muted-foreground">Social account not found</p>
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
						disabled={isUpdating || !saveHandler || isLoading}
					>
						{isUpdating ? (
							<Spinner size="xs" />
						) : (
							<>
								Update Account <ButtonShortcut>⌘S</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

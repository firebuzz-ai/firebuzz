import { useNewSocialModal } from "@/hooks/ui/use-new-social-modal";
import { ConvexError } from "@firebuzz/convex";
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
import { ZodError } from "zod";
import { SocialForm } from "./social-form";

export const NewSocialModal = () => {
	const [state, setState] = useNewSocialModal();
	const [isCreating, setIsCreating] = useState(false);
	const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
		null,
	);

	const handleCreate = async () => {
		if (!saveHandler) return;

		try {
			setIsCreating(true);
			await saveHandler();
			// Close modal only on successful completion
			setState(null);
		} catch (error) {
			console.log(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to add social account.", {
					description: error.data,
					id: "create-social",
				});
			} else if (error instanceof ZodError) {
				toast.error("Failed to add social account.", {
					description: error.message,
					id: "create-social",
				});
			} else {
				toast.error("Failed to add social account.", {
					description: "Please try again.",
					id: "create-social",
				});
			}
			// Modal stays open when there's an error
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Dialog
			open={state.create ?? false}
			onOpenChange={(value) => {
				setState(
					value
						? {
								create: true,
							}
						: null,
				);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-2xl w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<DialogTitle>Add Social Account</DialogTitle>
						<DialogDescription>
							Connect a new social media account to your brand.
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="flex flex-col flex-1 h-full overflow-hidden">
					<SocialForm setSaveHandler={setSaveHandler} isCreating={isCreating} />
				</div>

				{/* Footer */}
				<div className="p-4 border-t">
					<Button
						size="sm"
						variant="outline"
						className="w-full"
						onClick={handleCreate}
						disabled={isCreating || !saveHandler}
					>
						{isCreating ? (
							<Spinner size="xs" />
						) : (
							<>
								Add Account <ButtonShortcut>⌘S</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

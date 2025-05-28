import { useEditTestimonialModal } from "@/hooks/ui/use-edit-testimonial-modal";
import { ConvexError, type Id, api, useCachedQuery } from "@firebuzz/convex";
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
import { TestimonialForm } from "./testimonial-form";

export const EditTestimonialModal = () => {
	const [state, setState] = useEditTestimonialModal();
	const [isUpdating, setIsUpdating] = useState(false);
	const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(
		null,
	);

	const testimonialId = state.edit as Id<"testimonials"> | null;
	const isOpen = !!testimonialId;

	const testimonial = useCachedQuery(
		api.collections.brands.testimonials.queries.getById,
		testimonialId ? { id: testimonialId } : "skip",
	);

	const handleUpdate = async () => {
		if (!saveHandler) return;

		try {
			setIsUpdating(true);
			await saveHandler();
			// Close modal on success
			setState({ edit: null });
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update testimonial.", {
					description: error.data,
					id: "update-testimonial",
				});
			} else {
				toast.error("Failed to update testimonial.", {
					description: "Please try again.",
					id: "update-testimonial",
				});
			}
		} finally {
			setIsUpdating(false);
		}
	};

	const handleClose = () => {
		setState({ edit: null });
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>Edit Testimonial</DialogTitle>
					<DialogDescription>
						Update the testimonial details and customer information.
					</DialogDescription>
				</DialogHeader>

				{/* Loading State */}
				{!testimonial && (
					<div className="flex items-center justify-center p-8">
						<Spinner size="sm" />
					</div>
				)}

				{/* Form State */}
				{testimonial && (
					<div className="flex-1 max-h-full py-4 overflow-hidden">
						<TestimonialForm
							setSaveHandler={setSaveHandler}
							isCreating={isUpdating}
							initialValues={testimonial}
							testimonialId={testimonial._id}
							mode="edit"
						/>
					</div>
				)}

				{/* Footer */}
				<div className="p-4 border-t">
					<Button
						size="sm"
						variant="outline"
						className="w-full"
						onClick={handleUpdate}
						disabled={isUpdating}
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

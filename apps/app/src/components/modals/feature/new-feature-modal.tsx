"use client";

import { useNewFeatureModal } from "@/hooks/ui/use-new-feature-modal";
import { api, useMutation } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { useState } from "react";

export const NewFeatureModal = () => {
	const [modalState, setModalState] = useNewFeatureModal();
	const createFeature = useMutation(
		api.collections.brands.features.mutations.create,
	);

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		benefits: "",
		proof: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const isOpen = modalState.create;

	const handleClose = () => {
		setModalState({ create: false });
		setFormData({
			name: "",
			description: "",
			benefits: "",
			proof: "",
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (
			!formData.name ||
			!formData.description ||
			!formData.benefits ||
			!formData.proof
		) {
			return;
		}

		setIsSubmitting(true);
		try {
			await createFeature({
				name: formData.name,
				description: formData.description,
				benefits: formData.benefits,
				proof: formData.proof,
			});
			handleClose();
		} catch (error) {
			console.error("Failed to create feature:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-xl w-full flex flex-col !gap-0 !p-0">
				<DialogHeader className="px-4 py-4 border-b">
					<DialogTitle>Create New Feature</DialogTitle>
					<DialogDescription>
						Add a new feature or service to showcase your offerings and their
						benefits.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							className="!h-8"
							placeholder="e.g., Video Tutorials"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							placeholder="Describe what this feature or service offers..."
							className="resize-none"
							rows={3}
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="benefits">Benefits</Label>
						<Textarea
							id="benefits"
							placeholder="What benefits does this provide to your users..."
							className="resize-none"
							rows={3}
							value={formData.benefits}
							onChange={(e) =>
								setFormData({ ...formData, benefits: e.target.value })
							}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="proof">Proof or Evidence</Label>
						<Textarea
							id="proof"
							placeholder="What evidence supports the value of this feature..."
							className="resize-none"
							rows={3}
							value={formData.proof}
							onChange={(e) =>
								setFormData({ ...formData, proof: e.target.value })
							}
							required
						/>
					</div>
				</form>
				{/* Footer */}
				<div className="p-4 border-t">
					<Button
						size="sm"
						variant="outline"
						className="w-full"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<Spinner size="xs" />
						) : (
							<>
								Create <ButtonShortcut>⌘S</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

"use client";
import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { GenerateImage } from "./generate-image";

export const AIImageModal = () => {
	const { isOpen, setIsOpen } = useAIImageModal();

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="max-w-screen-xl max-h-[90vh] h-full p-0 overflow-hidden"
			>
				<DialogHeader className="sr-only">
					<DialogTitle>Generate Image</DialogTitle>
					<DialogDescription>Generate an image using AI.</DialogDescription>
				</DialogHeader>

				{/* Main Container */}

				<div className="overflow-hidden w-full h-full max-h-full">
					<GenerateImage />
				</div>
			</DialogContent>
		</Dialog>
	);
};

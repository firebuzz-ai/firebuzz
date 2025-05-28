import { useDocumentsSelectorModal } from "@/hooks/ui/use-documents-selector-modal";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@firebuzz/ui/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	File,
	GalleryHorizontal,
	Paperclip,
	Wand2,
} from "@firebuzz/ui/icons/lucide";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useState } from "react";

import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { attachmentsAtom } from "@/lib/workbench/atoms";
import type { Id } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { useAtom } from "jotai";
export const AttachmentButton = () => {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const { setState: setGalleryModalState } = useMediaGalleryModal();
	const { setState: setDocumentsModalState } = useDocumentsSelectorModal();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const { setState: setAIImageModalState } = useAIImageModal();
	const [isOpen, setIsOpen] = useState(false);
	const [, setAttachments] = useAtom(attachmentsAtom);

	const openGalleryModal = () => {
		setGalleryModalState((prev) => ({
			...prev,
			allowedTypes: ["image", "video", "audio"],
			allowMultiple: true,
			maxFiles: 5,
			activeTab: "gallery",
			onSelect: (data) => {
				setAttachments((prevAttachments) => [
					...(prevAttachments || []),
					...data.map((item) => ({
						name: item.fileName,
						contentType: item.contentType,
						url: item.url,
						size: item.size,
					})),
				]);
				setIsOpen(false);
			},
			isOpen: true,
		}));
	};

	const openDocumentsModal = () => {
		setDocumentsModalState((prev) => ({
			...prev,
			allowedTypes: ["md", "html", "txt", "pdf", "csv", "docx"],
			allowMultiple: true,
			maxFiles: 5,
			activeTab: "documents",
			onSelect: (data) => {
				setAttachments((prevAttachments) => [
					...(prevAttachments || []),
					...data.map((item) => ({
						id: item.id as Id<"documents">,
						name: item.fileName,
						contentType: item.contentType,
						url: item.url,
						size: item.size,
					})),
				]);
				setIsOpen(false);
			},
			isOpen: true,
		}));
	};

	const openAIImageModal = () => {
		setAIImageModalState((prev) => ({
			...prev,
			isOpen: true,
			onInsert: (data) => {
				setAttachments((prevAttachments) => [
					...(prevAttachments || []),
					{
						name: data.name,
						contentType: data.contentType,
						url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${data.key}`,
						size: data.size,
					},
				]);
				setIsOpen(false);
			},
		}));
	};

	// Mobile (Drawer)
	if (isMobile) {
		return (
			<Drawer open={isOpen} onOpenChange={setIsOpen}>
				<DrawerTrigger asChild>
					<Button size="sm" variant="outline">
						<div className="flex items-center gap-1">
							<Paperclip className=" size-3" />
							Attach
						</div>
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader className="text-left">
						<DrawerTitle>Attach</DrawerTitle>
						<DrawerDescription>
							Attach a file to your message.
						</DrawerDescription>
					</DrawerHeader>
					<div className="flex flex-col gap-2 p-4">
						<Button
							variant="outline"
							onClick={() => {
								openGalleryModal();
							}}
						>
							<GalleryHorizontal className="mr-2 size-3" />
							Media Gallery
						</Button>

						<Button
							variant="outline"
							onClick={() => {
								openDocumentsModal();
							}}
						>
							<File className="mr-2 size-3" />
							Documents
						</Button>

						<Button
							variant="outline"
							onClick={() => {
								openAIImageModal();
							}}
						>
							<Wand2 className="mr-2 size-3" />
							Generate Image
						</Button>
					</div>
					<DrawerFooter className="pt-2">
						<DrawerClose asChild>
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	// Desktop Dropdown
	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline">
					<div className="flex items-center gap-1">
						<Paperclip className="size-3" />
						Attach
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						openGalleryModal();
					}}
				>
					<GalleryHorizontal className="mr-2 size-3" />
					Media Gallery
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						openDocumentsModal();
					}}
				>
					<File className="mr-2 size-3" />
					Documents
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={(e) => {
						e.preventDefault();
						openAIImageModal();
					}}
				>
					<Wand2 className="mr-2 size-3" />
					Generate Image
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

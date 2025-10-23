"use client";

import type { Doc } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card } from "@firebuzz/ui/components/ui/card";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import Image from "next/image";
import { useTemplatePreviewModal } from "@/hooks/ui/use-template-preview-modal";

const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

interface TemplateCardProps {
	template: Doc<"landingPageTemplates"> & {
		thumbnail: string;
		previewURL: string;
	};
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
	const [, setPreviewModal] = useTemplatePreviewModal();

	const handleClick = () => {
		void setPreviewModal({ templateId: template._id });
	};


	console.log({template});
	return (
		<div
			className="flex flex-col gap-2 cursor-pointer group"
			onClick={handleClick}
		>
			{/* Preview Card */}
			<Card className="overflow-hidden relative shadow-sm transition-all">
				{/* Thumbnail */}
				<div className="relative w-full h-48 bg-muted">
					{template.thumbnail ? (
						<Image
							src={template.thumbnail}
							alt={template.title}
							fill
							className="object-cover"
						/>
					) : (
						<div className="flex justify-center items-center w-full h-full">
							<p className="text-xs text-muted-foreground">
								No Preview Available
							</p>
						</div>
					)}

					{/* Hover Overlay with Preview Button */}
					<div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity duration-200 bg-black/50 group-hover:opacity-100">
						<Button variant="default" size="sm" className="pointer-events-none">
							Preview
						</Button>
					</div>
				</div>

				{/* Tags - Inside Preview */}
				{template.tags && template.tags.length > 0 && (
					<div className="flex absolute right-2 bottom-2 left-2 flex-wrap gap-2">
						{template.tags.slice(0, 2).map((tag) => (
							<Badge
								key={tag}
								variant="secondary"
								className="text-xs px-2 py-0.5 font-normal bg-background/90 backdrop-blur-sm"
							>
								{capitalizeFirstLetter(tag)}
							</Badge>
						))}
					</div>
				)}
			</Card>

			{/* Title & Description - Outside Preview */}
			<div className="flex flex-col gap-1">
				<h3 className="text-sm font-medium truncate transition-colors group-hover:text-primary">
					{template.title}
				</h3>
				<p className="text-xs text-muted-foreground line-clamp-2">
					{template.description}
				</p>
			</div>
		</div>
	);
};

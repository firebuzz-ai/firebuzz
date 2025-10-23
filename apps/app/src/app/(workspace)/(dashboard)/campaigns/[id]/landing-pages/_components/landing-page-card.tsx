"use client";

import type { Doc } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Languages } from "@firebuzz/ui/icons/lucide";
import { capitalizeFirstLetter } from "@firebuzz/utils";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useLandingPagePreviewModal } from "@/hooks/ui/use-landing-page-preview-modal";

const NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

interface LandingPageCardProps {
	landingPage: Doc<"landingPages"> & {
		creator: {
			_id: string;
			name: string | null;
			email: string;
			imageKey?: string;
		} | null;
		variantsCount: number;
		translationsCount: number;
	};
}

export const LandingPageCard = ({ landingPage }: LandingPageCardProps) => {
	const [, setPreviewModal] = useLandingPagePreviewModal();

	const handleClick = () => {
		void setPreviewModal({ landingPageId: landingPage._id });
	};

	const getInitials = (name: string | null, email: string) => {
		if (name) {
			return name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		return email[0]?.toUpperCase() || "?";
	};

	return (
		<div
			className="flex flex-col gap-2 cursor-pointer group"
			onClick={handleClick}
		>
			{/* Preview Card */}
			<Card className="overflow-hidden relative shadow-sm transition-all">
				{/* Thumbnail */}
				<div className="relative w-full h-48 bg-muted">
					{landingPage.thumbnailUrl ? (
						<Image
							src={landingPage.thumbnailUrl}
							alt={landingPage.title}
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

				{/* Metadata: Variants & Translations - Inside Preview */}
				{(landingPage.variantsCount > 0 ||
					landingPage.translationsCount > 0) && (
					<div className="flex absolute right-2 bottom-2 left-2 flex-wrap gap-2">
						{landingPage.variantsCount > 0 && (
							<Badge
								variant="secondary"
								className="text-xs px-2 py-0.5 font-normal bg-background/90 backdrop-blur-sm"
							>
								{landingPage.variantsCount}{" "}
								{landingPage.variantsCount === 1 ? "Variant" : "Variants"}
							</Badge>
						)}
						{landingPage.translationsCount > 0 && (
							<Badge
								variant="secondary"
								className="text-xs px-2 py-0.5 font-normal flex items-center gap-1 bg-background/90 backdrop-blur-sm"
							>
								<Languages className="size-3" />
								{landingPage.translationsCount}{" "}
								{landingPage.translationsCount === 1
									? "Translation"
									: "Translations"}
							</Badge>
						)}
					</div>
				)}
			</Card>

			{/* Title & Creator - Outside Preview */}
			<div className="flex gap-2 justify-between items-center">
				<div className="flex gap-2 items-start">
					{/* Avatar */}
					<Avatar className="flex-shrink-0 size-8">
						<AvatarImage
							src={
								landingPage.creator?.imageKey
									? `${NEXT_PUBLIC_R2_PUBLIC_URL}/${landingPage.creator.imageKey}`
									: undefined
							}
						/>
						<AvatarFallback className="text-xs">
							{landingPage.creator
								? getInitials(
										landingPage.creator.name,
										landingPage.creator.email,
									)
								: "?"}
						</AvatarFallback>
					</Avatar>

					{/* Title & Updated Date */}
					<div className="flex flex-col flex-1 min-w-0">
						<h3 className="text-sm font-medium truncate transition-colors group-hover:text-primary">
							{landingPage.title}
						</h3>
						<span className="text-xs text-muted-foreground">
							{formatDistanceToNow(landingPage.updatedAt, { addSuffix: true })}
						</span>
					</div>
				</div>
				<Badge
					variant={landingPage.status === "published" ? "emerald" : "outline"}
				>
					{capitalizeFirstLetter(landingPage.status)}
				</Badge>
			</div>
		</div>
	);
};

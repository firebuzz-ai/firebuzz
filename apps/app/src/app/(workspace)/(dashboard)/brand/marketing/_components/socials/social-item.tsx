"use client";

import { api, type Doc, type Id, useMutation } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	Copy,
	ExternalLink,
	MoreHorizontalIcon,
	Pencil,
	Trash,
} from "@firebuzz/ui/icons/lucide";
import {
	DevToIcon,
	DiscordIcon,
	DribbbleIcon,
	FacebookIcon,
	GitHubIcon,
	GitLabIcon,
	HashnodeIcon,
	InstagramIcon,
	LinkedInIcon,
	MediumIcon,
	PinterestIcon,
	RedditIcon,
	SnapchatIcon,
	StackOverflowIcon,
	TikTokIcon,
	TwitchIcon,
	TwitterIcon,
	YouTubeIcon,
} from "@firebuzz/ui/icons/social";
import { cn } from "@firebuzz/ui/lib/utils";
import {
	type Dispatch,
	type SetStateAction,
	useMemo,
	useRef,
	useState,
} from "react";
import { useEditSocialModal } from "@/hooks/ui/use-edit-social-modal";

interface SocialItemProps {
	social: Doc<"socials">;
	selected?: boolean;
	setSelected?: Dispatch<SetStateAction<Id<"socials">[]>>;
}

// Platform icons mapping
const platformIcons: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	facebook: FacebookIcon,
	instagram: InstagramIcon,
	twitter: TwitterIcon,
	linkedin: LinkedInIcon,
	youtube: YouTubeIcon,
	tiktok: TikTokIcon,
	pinterest: PinterestIcon,
	snapchat: SnapchatIcon,
	reddit: RedditIcon,
	discord: DiscordIcon,
	twitch: TwitchIcon,
	dribbble: DribbbleIcon,
	github: GitHubIcon,
	gitlab: GitLabIcon,
	medium: MediumIcon,
	devto: DevToIcon,
	hashnode: HashnodeIcon,
	stackoverflow: StackOverflowIcon,
};

const getPlatformIcon = (platform: string) => {
	return platformIcons[platform] || null;
};

export const SocialItem = ({
	social,
	selected = false,
	setSelected,
}: SocialItemProps) => {
	const [, setEditModal] = useEditSocialModal();
	const cardRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isDropdownHovered, setIsDropdownHovered] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	const duplicateSocial = useMutation(
		api.collections.brands.socials.mutations.duplicate,
	);

	const deleteSocial = useMutation(
		api.collections.brands.socials.mutations.deletePermanent,
	);

	const PlatformIcon = getPlatformIcon(social.platform);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current) return;

		const rect = cardRef.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const mouseX = e.clientX - centerX;
		const mouseY = e.clientY - centerY;

		setMousePosition({ x: mouseX, y: mouseY });
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		setMousePosition({ x: 0, y: 0 });
	};

	// Calculate transform values based on mouse position
	const transform = useMemo(() => {
		if (!isHovered || isDropdownOpen || isDropdownHovered)
			return "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";

		const maxRotation = 15; // Maximum rotation in degrees
		const rotateX = -(mousePosition.y / 10); // Negative for natural feel
		const rotateY = mousePosition.x / 10;

		// Clamp rotation values
		const clampedRotateX = Math.max(
			-maxRotation,
			Math.min(maxRotation, rotateX),
		);
		const clampedRotateY = Math.max(
			-maxRotation,
			Math.min(maxRotation, rotateY),
		);

		return `perspective(1000px) rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg) scale3d(1.01, 1.01, 1.01)`;
	}, [isHovered, isDropdownOpen, isDropdownHovered, mousePosition]);

	// Calculate icon transform for parallax effect
	const iconTransform = useMemo(() => {
		if (!isHovered || isDropdownOpen || isDropdownHovered)
			return "translateZ(30px) rotateX(0deg) rotateY(0deg) scale(1)";

		// Minimal movement in same direction as card
		const maxRotation = 8; // Much more subtle rotation
		const rotateX = -(mousePosition.y / 15); // Less intense rotation
		const rotateY = mousePosition.x / 15;
		const translateX = mousePosition.x / 25; // More subtle translation
		const translateY = mousePosition.y / 25;

		// Clamp rotation values
		const clampedRotateX = Math.max(
			-maxRotation,
			Math.min(maxRotation, rotateX),
		);
		const clampedRotateY = Math.max(
			-maxRotation,
			Math.min(maxRotation, rotateY),
		);

		return `translateZ(30px) translateX(${translateX}px) translateY(${translateY}px) rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg) scale(1.02)`;
	}, [isHovered, isDropdownOpen, isDropdownHovered, mousePosition]);

	const editHandler = () => {
		setEditModal({ edit: social._id });
	};

	const duplicateHandler = async (id: Id<"socials">) => {
		await duplicateSocial({ id });
	};

	const deleteHandler = async (id: Id<"socials">) => {
		await deleteSocial({ id });
	};

	const openUrlHandler = () => {
		if (social.url) {
			window.open(social.url, "_blank", "noopener,noreferrer");
		}
	};

	const handleSelection = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!setSelected) return;

		setSelected((prev) => {
			if (selected) {
				return prev.filter((id) => id !== social._id);
			}
			return [...prev, social._id];
		});
	};

	return (
		<Card
			ref={cardRef}
			className={cn(
				"relative transition-all duration-300 ease-out cursor-pointer group bg-muted hover:shadow-xl hover:shadow-brand/10",
				selected && "ring-2 ring-brand bg-brand/5",
			)}
			style={{
				transform,
				transformStyle: "preserve-3d",
			}}
			onClick={handleSelection}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<CardContent
				className="relative p-6"
				style={{ transform: "translateZ(20px)" }}
			>
				{/* Dropdown */}
				<DropdownMenu onOpenChange={setIsDropdownOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="iconXs"
							className="absolute transition-all duration-200 top-2 right-2 hover:scale-110"
							onClick={(e) => e.stopPropagation()}
							onMouseEnter={() => setIsDropdownHovered(true)}
							onMouseLeave={() => setIsDropdownHovered(false)}
						>
							<MoreHorizontalIcon className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={editHandler}>
							<Pencil className="w-4 h-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onClick={openUrlHandler}>
							<ExternalLink className="w-4 h-4 mr-2" />
							Open URL
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={async () => await duplicateHandler(social._id)}
						>
							<Copy className="w-4 h-4 mr-2" />
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => await deleteHandler(social._id)}
						>
							<Trash className="w-4 h-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="flex flex-col items-center text-center">
					{/* Platform Icon */}
					<div className="relative">
						<div
							className="z-10 flex items-center justify-center transition-all duration-300 ease-out border rounded-full size-20 bg-background-subtle group-hover:shadow-lg"
							style={{
								transform: iconTransform,
								transformStyle: "preserve-3d",
							}}
						>
							{PlatformIcon ? (
								<div className="fill-current size-8">
									<PlatformIcon />
								</div>
							) : (
								<span className="text-3xl">🌐</span>
							)}
						</div>
					</div>

					{/* Platform Badge */}
					<div className="flex flex-wrap gap-2 mt-2 capitalize">
						<Badge
							variant="brand"
							className="transition-all duration-200 group-hover:scale-105"
						>
							{social.platform}
						</Badge>
					</div>

					{/* Handle */}
					<div className="max-w-full mt-2 space-y-1 truncate">
						<h3 className="text-xl font-semibold transition-all duration-200 group-hover:text-brand">
							@{social.handle}
						</h3>

						{/* URL */}
						<p className="text-sm truncate text-muted-foreground">
							{social.url}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

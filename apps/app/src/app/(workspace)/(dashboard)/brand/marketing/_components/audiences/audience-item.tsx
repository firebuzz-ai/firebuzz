"use client";

import { useEditAudienceModal } from "@/hooks/ui/use-edit-audience-modal";
import { type Doc, type Id, api, useMutation } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
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
	MoreHorizontalIcon,
	Pencil,
	Trash,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";

import {
	type Dispatch,
	type SetStateAction,
	useMemo,
	useRef,
	useState,
} from "react";

interface AudienceItemProps {
	audience: Doc<"audiences">;
	selected?: boolean;
	setSelected?: Dispatch<SetStateAction<Id<"audiences">[]>>;
}

const getInitials = (name: string) => {
	return name
		.split(" ")
		.map((word) => word.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
};

export const AudienceItem = ({
	audience,
	selected = false,
	setSelected,
}: AudienceItemProps) => {
	const [, setEditModal] = useEditAudienceModal();
	const cardRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isDropdownHovered, setIsDropdownHovered] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const initials = getInitials(audience.name);

	const duplicateAudience = useMutation(
		api.collections.brands.audiences.mutations.duplicate,
	);

	const deleteAudience = useMutation(
		api.collections.brands.audiences.mutations.deletePermanent,
	);

	const avatarUrl = useMemo(() => {
		if (audience.avatar) {
			return `/avatars/${audience.avatar}.png`;
		}
		return "";
	}, [audience.avatar]);

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

	// Calculate avatar transform for parallax effect
	const avatarTransform = useMemo(() => {
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
		setEditModal({ edit: audience._id });
	};

	const duplicateHandler = async (id: Id<"audiences">) => {
		await duplicateAudience({ id });
	};

	const deleteHandler = async (id: Id<"audiences">) => {
		await deleteAudience({ id });
	};

	const handleSelection = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!setSelected) return;

		setSelected((prev) => {
			if (selected) {
				return prev.filter((id) => id !== audience._id);
			}
			return [...prev, audience._id];
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
							className="absolute top-2 right-2 transition-all duration-200 hover:scale-110"
							onClick={(e) => e.stopPropagation()}
							onMouseEnter={() => setIsDropdownHovered(true)}
							onMouseLeave={() => setIsDropdownHovered(false)}
						>
							<MoreHorizontalIcon className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={editHandler}>
							<Pencil className="mr-2 w-4 h-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={async () => await duplicateHandler(audience._id)}
						>
							<Copy className="mr-2 w-4 h-4" />
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => await deleteHandler(audience._id)}
						>
							<Trash className="mr-2 w-4 h-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="flex flex-col items-center text-center">
					{/* Avatar */}
					<div className="relative">
						<Avatar
							className="z-10 p-1 border transition-all duration-300 ease-out size-20 bg-background-subtle group-hover:shadow-lg"
							style={{
								transform: avatarTransform,
								transformStyle: "preserve-3d",
							}}
						>
							<AvatarImage
								className="shadow-md"
								src={avatarUrl}
								alt={audience.name}
							/>
							<AvatarFallback>{initials}</AvatarFallback>
						</Avatar>
					</div>

					{/* Badges */}
					<div className="flex flex-wrap gap-2 mt-2 capitalize">
						<Badge
							variant="brand"
							className="transition-all duration-200 group-hover:scale-105"
						>
							{audience.gender}
						</Badge>
						<Badge
							variant="outline"
							className="transition-all duration-200 group-hover:scale-105"
						>
							{audience.age}
						</Badge>
					</div>

					{/* Name */}
					<div className="mt-2 space-y-1">
						<h3 className="text-xl font-semibold transition-all duration-200 group-hover:text-brand">
							{audience.name}
						</h3>

						{/* Description */}
						<p className="text-sm text-muted-foreground line-clamp-2">
							{audience.description}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

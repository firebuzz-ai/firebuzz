"use client";

import { api, type Doc, type Id, useMutation } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
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
	Star,
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
import { useEditTestimonialModal } from "@/hooks/ui/use-edit-testimonial-modal";

interface TestimonialItemProps {
	testimonial: Doc<"testimonials">;
	selected?: boolean;
	setSelected?: Dispatch<SetStateAction<Id<"testimonials">[]>>;
}

const getInitials = (name: string) => {
	return name
		.split(" ")
		.map((word) => word.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
};

export const TestimonialItem = ({
	testimonial,
	selected = false,
	setSelected,
}: TestimonialItemProps) => {
	const [, setEditModal] = useEditTestimonialModal();
	const cardRef = useRef<HTMLDivElement>(null);
	const [isHovered, setIsHovered] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isDropdownHovered, setIsDropdownHovered] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const initials = getInitials(testimonial.name);

	const duplicateTestimonial = useMutation(
		api.collections.brands.testimonials.mutations.duplicate,
	);

	const deleteTestimonial = useMutation(
		api.collections.brands.testimonials.mutations.deletePermanent,
	);

	const avatarUrl = useMemo(() => {
		if (testimonial.avatar) {
			return testimonial.avatar;
		}
		return "";
	}, [testimonial.avatar]);

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
		setEditModal({ edit: testimonial._id });
	};

	const duplicateHandler = async (id: Id<"testimonials">) => {
		await duplicateTestimonial({ id });
	};

	const deleteHandler = async (id: Id<"testimonials">) => {
		await deleteTestimonial({ id });
	};

	const handleSelection = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!setSelected) return;

		setSelected((prev) => {
			if (selected) {
				return prev.filter((id) => id !== testimonial._id);
			}
			return [...prev, testimonial._id];
		});
	};

	const renderStars = (rating?: number) => {
		if (!rating) return null;

		return (
			<div className="flex items-center gap-1">
				{Array.from({ length: 5 }).map((_, index) => (
					<Star
						// biome-ignore lint/suspicious/noArrayIndexKey: Star rating display, index is appropriate here
						key={index}
						className={cn(
							"size-4",
							index < rating
								? "fill-[hsl(var(--brand))] text-brand"
								: "text-muted-foreground/30",
						)}
					/>
				))}
			</div>
		);
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
							<Pencil className="!size-3.5" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => duplicateHandler(testimonial._id)}>
							<Copy className="!size-3.5" />
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => deleteHandler(testimonial._id)}>
							<Trash className="!size-3.5" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="flex flex-col items-center text-center">
					{/* Avatar */}
					<div className="relative">
						<Avatar
							className="z-10 p-2 transition-all duration-300 ease-out border size-20 bg-background-subtle group-hover:shadow-lg"
							style={{
								transform: avatarTransform,
								transformStyle: "preserve-3d",
							}}
						>
							<AvatarImage
								className="object-cover object-center rounded-full shadow-md"
								src={avatarUrl}
								alt={testimonial.name}
							/>
							<AvatarFallback className="text-sm font-medium bg-brand/10 text-brand">
								{initials}
							</AvatarFallback>
						</Avatar>
					</div>

					{/* Rating */}
					{testimonial.rating && (
						<div className="flex items-center justify-center mt-2">
							{renderStars(testimonial.rating)}
						</div>
					)}

					{/* Name and Title */}
					<div className="mt-2">
						<h3 className="font-semibold transition-all duration-200">
							{testimonial.name}
						</h3>
						{testimonial.title && (
							<div className="text-xs text-muted-foreground">
								{testimonial.title}
							</div>
						)}
					</div>

					{/* Testimonial Content */}
					<div className="mt-2 text-lg text-muted-foreground line-clamp-2 group-hover:text-brand">
						&ldquo;{testimonial.content}&rdquo;
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

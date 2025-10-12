import { Button } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	ChevronRight,
	Paintbrush,
	Redo2,
	Trash,
	Undo2,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo } from "react";
import {
	type ImageType,
	useAIImageModal,
	useBrush,
} from "@/hooks/ui/use-ai-image-modal";
import { useMaskState } from "./use-mask-state";

export const MaskButton = ({
	canvasRef,
	selectedImage,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	selectedImage: ImageType;
}) => {
	const { setIsMasking, isMasking, isSelectedImagePrimary } = useAIImageModal();
	const { setSize, size } = useBrush();
	const { undo, redo, canUndo, canRedo, reset } = useMaskState(
		selectedImage.key,
	);

	const hasHistory = useMemo(() => {
		return canUndo || canRedo;
	}, [canUndo, canRedo]);

	const clearMask = useCallback(() => {
		reset();
		const canvas = canvasRef.current;
		if (
			canvas &&
			"clearMask" in canvas &&
			typeof canvas.clearMask === "function"
		) {
			canvas.clearMask();
		}
	}, [canvasRef, reset]);

	return (
		<>
			<Separator orientation="vertical" className="h-4" />
			{/* Mask Toggle */}
			<Tooltip delayDuration={0}>
				<TooltipTrigger asChild>
					<Button
						disabled={!isSelectedImagePrimary}
						variant="outline"
						className={cn("h-8", {
							"text-brand hover:text-brand/80": isMasking,
						})}
						size="sm"
						onClick={() => {
							if (isMasking) {
								// If turning off masking, clear any existing mask
								clearMask();
							}
							setIsMasking((v) => !v);
						}}
					>
						<Paintbrush className="!size-3.5" /> Mask
					</Button>
				</TooltipTrigger>
				<TooltipContent className="text-xs" side="top" sideOffset={5}>
					Mask the image
				</TooltipContent>
			</Tooltip>

			<AnimatePresence>
				{isMasking && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex items-center gap-2"
					>
						<ChevronRight className="!size-3.5" />
						<DropdownMenu>
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<Button
											className="text-xs font-medium uppercase"
											size="iconSm"
											variant="outline"
										>
											{size}
										</Button>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent
									className="text-xs"
									side="top"
									align="start"
									sideOffset={5}
								>
									Brush size
								</TooltipContent>
							</Tooltip>
							<DropdownMenuContent side="top" align="start" sideOffset={10}>
								<DropdownMenuItem
									className="justify-between"
									onClick={() => setSize("sm")}
								>
									Small <div className="rounded-full size-2 bg-brand" />
								</DropdownMenuItem>
								<DropdownMenuItem
									className="justify-between"
									onClick={() => setSize("md")}
								>
									Medium <div className="rounded-full size-3 bg-brand" />
								</DropdownMenuItem>
								<DropdownMenuItem
									className="justify-between"
									onClick={() => setSize("lg")}
								>
									Large <div className="rounded-full size-4 bg-brand" />
								</DropdownMenuItem>
								<DropdownMenuItem
									className="justify-between"
									onClick={() => setSize("xl")}
								>
									XLarge <div className="rounded-full size-5 bg-brand" />
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									size="iconSm"
									variant="outline"
									onClick={undo}
									disabled={!canUndo}
								>
									<Undo2 className="!size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="text-xs" side="top" sideOffset={5}>
								Undo
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									size="iconSm"
									variant="outline"
									onClick={redo}
									disabled={!canRedo}
								>
									<Redo2 className="!size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="text-xs" side="top" sideOffset={5}>
								Redo
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									disabled={!hasHistory}
									size="iconSm"
									variant="outline"
									onClick={clearMask}
								>
									<Trash className="!size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent
								className="text-xs"
								side="top"
								align="end"
								sideOffset={5}
							>
								Clear mask
							</TooltipContent>
						</Tooltip>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

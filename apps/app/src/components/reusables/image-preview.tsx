import { X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Image from "next/image";

export const ImagePreview = ({
	src,
	handleDeselect,
	className,
}: {
	src: string;
	handleDeselect: () => void;
	className?: string;
}) => {
	return (
		<div className={cn("relative w-full h-40 group", className)}>
			<Image
				unoptimized
				src={src}
				alt="Selected content"
				fill
				className="object-contain p-2 w-full h-full rounded-md border"
			/>
			<button
				type="button"
				onClick={handleDeselect}
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 rounded-full shadow-sm opacity-0 transition-opacity bg-background/80 text-foreground hover:bg-background group-hover:opacity-100"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};

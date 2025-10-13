import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Loader } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ReactNode } from "react";

export interface ToolPartProps {
	className?: string;
	status: "loading" | "success" | "error";
	toolName: string;

	children?: ReactNode;
}

export const ToolPart = ({
	className,
	children,
	status,
	toolName,
}: ToolPartProps) => {
	return (
		<div
			className={cn(
				"flex gap-4 justify-between items-center text-xs text-muted-foreground",
				className,
			)}
		>
			<div className="flex gap-2 items-center">
				{status === "loading" && (
					<Loader className="animate-spin size-2 text-muted-foreground" />
				)}
				{status === "success" && (
					<div className="bg-emerald-600 rounded-[2px] size-2" />
				)}
				{status === "error" && (
					<div className="bg-red-600 rounded-[2px] size-2" />
				)}
				{status === "loading" ? (
					<TextShimmer
						as="span"
						duration={1.5}
						className="text-sm italic font-medium"
						active={true}
					>
						{toolName}
					</TextShimmer>
				) : (
					<span className="text-xs font-medium">{toolName}</span>
				)}
			</div>
			{/* Children or Null */}
			{children ? children : null}
		</div>
	);
};

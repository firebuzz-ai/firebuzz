"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import type { LucideIcon } from "@firebuzz/ui/icons/lucide";

interface PanelHeaderProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	iconClassName?: string;
	className?: string;
	children?: React.ReactNode;
}

export const PanelHeader = ({
	icon: Icon,
	title,
	description,
	iconClassName,
	className,
	children,
}: PanelHeaderProps) => {
	return (
		<div
			className={cn(
				"flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted",
				className
			)}
		>
			<div
				className={cn(
					"p-2 rounded-lg border bg-brand/10 border-brand text-brand",
					iconClassName
				)}
			>
				<Icon className="size-4" />
			</div>
			<div className="flex-1">
				<div className="flex flex-col">
					<div className="text-lg font-semibold leading-tight">{title}</div>
					{description && (
						<div className="text-sm leading-tight text-muted-foreground">
							{description}
						</div>
					)}
				</div>
			</div>
			{children}
		</div>
	);
};
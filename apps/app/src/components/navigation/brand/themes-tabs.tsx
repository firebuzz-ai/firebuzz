"use client";

import { useNewThemeModal } from "@/hooks/ui/use-new-theme-modal";
import { useSheet } from "@/hooks/ui/use-sheet";
import type { Id } from "@firebuzz/convex";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Pencil, Plus } from "@firebuzz/ui/icons/lucide";
import type { Dispatch, SetStateAction } from "react";

interface ThemeTabsProps {
	id: Id<"themes"> | undefined;
	setId: Dispatch<SetStateAction<Id<"themes"> | undefined>>;
	tabs: TabItem[];
}

export const ThemeTabs = ({ id, setId, tabs }: ThemeTabsProps) => {
	const { setIsOpen: setIsSettingsSheetOpen } = useSheet("theme-settings");
	const [, setIsNewModalOpen] = useNewThemeModal();

	return (
		<div className="relative flex items-center justify-between px-2 border-b">
			{/* Tabs */}
			<div className="flex items-center gap-1">
				<AnimatedTabs
					tabs={tabs}
					value={id}
					onValueChange={(value) => setId(value as Id<"themes">)}
					indicatorPadding={0}
					tabsContainerClassName="flex items-center gap-2"
					withBorder={false}
					indicatorRelativeToParent
				/>
				<div className="flex items-center gap-2">
					{/* Plus Button */}
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className="bg-muted"
								size="iconXs"
								onClick={() => setIsNewModalOpen({ create: true })}
							>
								<Plus className="!size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							Create New Theme
						</TooltipContent>
					</Tooltip>
					{/* Edit Button */}
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className="bg-muted"
								size="iconXs"
								onClick={() => setIsSettingsSheetOpen(true)}
								disabled={!id}
							>
								<Pencil className="!size-3" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							Edit Theme
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Future: Add theme-specific actions here */}
			<div className="flex items-center gap-4">
				{/* Placeholder for future theme actions */}
			</div>
		</div>
	);
};

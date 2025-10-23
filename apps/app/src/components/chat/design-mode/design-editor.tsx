"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronRight } from "@firebuzz/ui/icons/lucide";
import { IconComponents, IconHomeEdit } from "@firebuzz/ui/icons/tabler";
import { cn } from "@firebuzz/ui/lib/utils";
import { ColorSelectorModal } from "@/components/modals/color-selector/modal";
import {
	useDesignModeElement,
	useDesignModeState,
} from "@/components/providers/agent/design-mode";
import { ElementEditorContent } from "./element-editor";
import { ThemeEditor } from "./theme-editor";

export const DesignEditor = () => {
	const { selectedElement, selectElement } = useDesignModeElement();
	const { isLoading, currentDesignModeTab } = useDesignModeState();

	const handleThemeClick = () => {
		// Clear selected element to show theme editor
		selectElement(null);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col p-4 h-full">
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<>
			<div className="flex overflow-hidden flex-col h-full rounded-lg border">
				{/* Shared Header with Breadcrumb Navigation */}
				<div className="flex-shrink-0 p-2 rounded-t-lg border-b bg-muted">
					<div className="flex gap-1 items-center text-sm">
						<Button
							variant="outline"
							size="sm"
							onClick={handleThemeClick}
							className={cn(
								"h-8 font-medium rounded-2xl text-sm px-2 py-1",
								currentDesignModeTab === "theme" &&
									"text-blue-500  border-blue-500 bg-blue-500/20 hover:bg-blue-500/30 hover:text-blue-500",
								currentDesignModeTab === "element" && "opacity-50",
							)}
						>
							<IconHomeEdit className="size-3.5" />
							Theme
						</Button>

						{currentDesignModeTab === "element" && selectedElement && (
							<>
								<ChevronRight className="size-4 text-muted-foreground" />
								<Button
									variant="outline"
									size="sm"
									className="items-center px-2 py-1 h-8 text-sm text-blue-500 rounded-2xl border-blue-500 bg-blue-500/20 hover:bg-blue-500/30 hover:text-blue-500"
								>
									<IconComponents className="size-3.5" />
									<div className="flex gap-1 items-center">
										<div className="capitalize">
											{selectedElement?.tagName.toLowerCase()}
										</div>
										<span className="text-xs text-blue-500/60">
											{selectedElement?.sourceFile.split("/").pop()}
										</span>
									</div>
								</Button>
							</>
						)}
					</div>
				</div>

				{/* Content - Show theme or element editor based on currentDesignModeTab */}
				<div className="flex-1 min-h-0">
					{currentDesignModeTab === "element" ? (
						<ElementEditorContent />
					) : (
						<ThemeEditor />
					)}
				</div>
			</div>

			{/* Global Color Selector Modal - shared by both theme and element editors */}
			<ColorSelectorModal />
		</>
	);
};

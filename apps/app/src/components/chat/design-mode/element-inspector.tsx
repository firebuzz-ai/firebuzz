"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { IconCode, IconFileCode, IconX } from "@firebuzz/ui/icons/tabler";
import { AnimatePresence, motion } from "motion/react";
import {
	useDesignModeElement,
	useDesignModeState,
} from "@/components/providers/agent/design-mode";

export const ElementInspector = () => {
	const { selectedElement, selectElement } = useDesignModeElement();
	const { isDesignModeActive } = useDesignModeState();

	if (!isDesignModeActive || !selectedElement) return null;

	const handleClose = () => {
		selectElement(null);
	};

	return (
		<AnimatePresence>
			{selectedElement && (
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: 20 }}
					transition={{ duration: 0.2 }}
					className="flex absolute top-4 right-4 z-50 flex-col w-80 max-h-[calc(100vh-8rem)]"
				>
					<Card className="shadow-xl border-primary/20">
						<CardHeader className="pb-3">
							<div className="flex justify-between items-start">
								<div>
									<CardTitle className="flex gap-2 items-center text-base">
										<IconCode className="size-4" />
										Element Inspector
									</CardTitle>
									<CardDescription className="text-xs">
										Selected element details
									</CardDescription>
								</div>
								<Button
									variant="ghost"
									size="iconSm"
									onClick={handleClose}
									className="-mt-1 -mr-2 rounded-lg"
								>
									<IconX className="size-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{/* Tag Name */}
							<div>
								<div className="mb-1 text-xs font-semibold text-muted-foreground">
									Tag
								</div>
								<div className="p-2 font-mono text-sm rounded-md bg-muted">
									{selectedElement.tagName.toLowerCase()}
								</div>
							</div>

							<Separator />

							{/* Class Name */}
							<div>
								<div className="mb-1 text-xs font-semibold text-muted-foreground">
									Classes
								</div>
								<ScrollArea className="max-h-20">
									<div className="p-2 font-mono text-xs break-all rounded-md bg-muted">
										{selectedElement.className || (
											<span className="italic text-muted-foreground">
												No classes
											</span>
										)}
									</div>
								</ScrollArea>
							</div>

							<Separator />

							{/* Text Content */}
							{selectedElement.textContent && (
								<>
									<div>
										<div className="mb-1 text-xs font-semibold text-muted-foreground">
											Text Content
										</div>
										<ScrollArea className="max-h-20">
											<div className="p-2 text-sm break-words rounded-md bg-muted">
												{selectedElement.textContent.substring(0, 100)}
												{selectedElement.textContent.length > 100 && "..."}
											</div>
										</ScrollArea>
									</div>
									<Separator />
								</>
							)}

							{/* Source Path */}
							{selectedElement.sourceFile && (
								<>
									<div>
										<div className="mb-1 text-xs font-semibold text-muted-foreground">
											Source File
										</div>
										<div className="flex gap-1 items-center p-2 font-mono text-xs break-all rounded-md bg-muted">
											<IconFileCode className="flex-shrink-0 size-3" />
											<span>{selectedElement.sourceFile}</span>
										</div>
									</div>
									<Separator />
								</>
							)}
						</CardContent>
					</Card>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

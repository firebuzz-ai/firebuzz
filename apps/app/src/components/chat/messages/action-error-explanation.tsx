import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@firebuzz/ui/components/ui/accordion";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	ExternalLink,
	FileCode,
	Terminal,
	XCircle,
} from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface ActionErrorData {
	actionType: string;
	errorMessage: string;
	filePath?: string;
	from?: string;
	to?: string;
	suggestion: string;
}

interface ActionErrorExplanationProps {
	errors: ActionErrorData[];
}

export const ActionErrorExplanation = ({
	errors,
}: ActionErrorExplanationProps) => {
	const [isErrorsVisible, setIsErrorsVisible] = useState(false);

	if (!errors || errors.length === 0) {
		return null;
	}

	const getActionIcon = (type: string) => {
		switch (type) {
			case "file":
				return <FileCode className="w-4 h-4 text-amber-400" />;
			case "shell":
				return <Terminal className="w-4 h-4 text-blue-400" />;
			case "quick-edit":
				return <ExternalLink className="w-4 h-4 text-green-400" />;
			default:
				return <XCircle className="w-4 h-4 text-red-400" />;
		}
	};

	return (
		<div className="overflow-hidden w-full rounded-md border">
			<div className="flex items-stretch">
				<Button
					variant="ghost"
					className="flex-1 justify-start px-4 py-2 h-auto rounded-none hover:bg-accent"
					onClick={() => setIsErrorsVisible(!isErrorsVisible)}
				>
					<div className="flex gap-2 items-center text-left">
						<div>
							<div className="text-sm font-medium">Action errors detected</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								Click to {isErrorsVisible ? "close" : "open"} error details
							</div>
						</div>
					</div>
				</Button>
			</div>

			<AnimatePresence>
				{isErrorsVisible && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="h-px bg-border" />
						<div className="p-4 bg-muted/50">
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								<Accordion type="single" collapsible className="w-full">
									{errors.map((error, index) => (
										<motion.div
											key={`action-error-${error.actionType}-${index}`}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.1 }}
										>
											<AccordionItem
												value={`action-error-${error.actionType}-${index}`}
												className="border-b-0 last:border-0"
											>
												<AccordionTrigger className="px-2 py-2 text-sm font-medium rounded-none hover:bg-muted/70">
													<div className="flex gap-2 items-center">
														{getActionIcon(error.actionType)}
														<span>
															{error.actionType === "file"
																? error.filePath
																	? `File action error: ${error.filePath}`
																	: "File action error"
																: error.actionType === "quick-edit"
																	? error.filePath
																		? `Quick edit error: ${error.filePath}`
																		: "Quick edit error"
																	: "Shell command error"}
														</span>
													</div>
												</AccordionTrigger>
												<AccordionContent className="px-2 pt-2 pb-3">
													<div className="space-y-3">
														<div className="text-sm">{error.errorMessage}</div>

														{error.actionType === "quick-edit" &&
															error.from &&
															error.to && (
																<div className="p-3 rounded-md border bg-background">
																	<p className="mb-1 text-xs font-medium">
																		Quick Edit Details:
																	</p>
																	<div className="space-y-2">
																		<p className="text-sm text-muted-foreground">
																			<span className="text-xs font-medium">
																				From:{" "}
																			</span>
																			<code className="p-1 text-xs rounded bg-muted/50">
																				{error.from}
																			</code>
																		</p>
																		<p className="text-sm text-muted-foreground">
																			<span className="text-xs font-medium">
																				To:{" "}
																			</span>
																			<code className="p-1 text-xs rounded bg-muted/50">
																				{error.to}
																			</code>
																		</p>
																	</div>
																</div>
															)}

														<div className="p-3 rounded-md border bg-background">
															<p className="mb-1 text-xs font-medium">
																Suggestion:
															</p>
															<p className="text-sm text-muted-foreground">
																{error.suggestion}
															</p>
														</div>
													</div>
												</AccordionContent>
											</AccordionItem>
										</motion.div>
									))}
								</Accordion>
							</motion.div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

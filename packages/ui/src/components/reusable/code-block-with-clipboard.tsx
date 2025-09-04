"use client";
import { CheckCheck, Clipboard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface CodeBlockWithClipboardProps {
	code: string;
	language?: string;
	className?: string;
	showLineNumbers?: boolean;
}

export const CodeBlockWithClipboard = ({
	code,
	language = "javascript",
	className,
	showLineNumbers = false,
}: CodeBlockWithClipboardProps) => {
	const [state, setState] = useState<"idle" | "copied">("idle");

	const handleCopy = () => {
		setState("idle");
		navigator.clipboard.writeText(code);
		setState("copied");
		return setTimeout(() => {
			setState("idle");
		}, 2000);
	};

	const lines = code.split("\n");

	return (
		<div className={cn("relative", className)}>
			<div className="relative bg-muted border border-border rounded-md overflow-hidden">
				{/* Header with language and copy button */}
				<div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
					<span className="text-xs text-muted-foreground font-medium uppercase">
						{language}
					</span>
					<TooltipProvider>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<button
									onClick={handleCopy}
									type="button"
									className="flex items-center justify-center w-6 h-6 hover:bg-accent rounded transition-colors"
								>
									<AnimatePresence initial={false} mode="wait">
										{state === "copied" && (
											<motion.div
												key="copied"
												className="flex justify-center items-center"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
											>
												<CheckCheck className="w-3 h-3 text-brand" />
											</motion.div>
										)}
										{state === "idle" && (
											<motion.div
												key="idle"
												className="flex justify-center items-center"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
											>
												<Clipboard className="w-3 h-3 text-muted-foreground hover:text-foreground" />
											</motion.div>
										)}
									</AnimatePresence>
								</button>
							</TooltipTrigger>
							<TooltipContent side="top" align="center">
								<p>{state === "copied" ? "Copied!" : "Copy"}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				{/* Code content */}
				<div className="p-3 overflow-x-auto">
					<pre className="text-xs font-mono leading-relaxed">
						<code className="text-foreground">
							{showLineNumbers ? (
								<div className="flex">
									<div className="flex flex-col text-muted-foreground mr-4 select-none">
										{lines.map((_, index) => (
											<span key={index} className="text-right w-6">
												{index + 1}
											</span>
										))}
									</div>
									<div className="flex-1">
										{lines.map((line, index) => (
											<div key={index}>{line || " "}</div>
										))}
									</div>
								</div>
							) : (
								code
							)}
						</code>
					</pre>
				</div>
			</div>
		</div>
	);
};

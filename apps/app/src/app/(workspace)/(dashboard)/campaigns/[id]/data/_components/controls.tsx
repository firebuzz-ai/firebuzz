import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { FlaskConical, Radio, SortAsc } from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";

interface ControlsProps {
	isPreview: boolean;
	setIsPreview: Dispatch<SetStateAction<boolean>>;
	sortOrder: "asc" | "desc";
	setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
}

export const Controls = ({
	isPreview,
	setIsPreview,
	sortOrder,
	setSortOrder,
}: ControlsProps) => {
	return (
		<div className="flex flex-col gap-2 px-4 py-3 border-b max-h-min border-border">
			{/* Controls */}
			<div className="flex gap-2 justify-between items-center">
				{/* Left Part - Form Data Title */}
				<div>
					<h2 className="font-semibold">Form Submissions</h2>
				</div>

				{/* Right Part */}
				<div className="flex flex-1 gap-4 justify-end items-center">
					{/* Filters row */}
					<div className="flex flex-1 gap-2 justify-end items-center">
						<div className="flex overflow-hidden gap-2 items-center pr-2 h-8 rounded-md border transition-transform duration-200 ease-in-out">
							<Label
								htmlFor="preview-switch"
								className="inline-flex items-center px-2 h-full text-sm border-r text-muted-foreground bg-muted"
							>
								{isPreview ? (
									<div className="flex gap-2 items-center">
										<FlaskConical className="size-3.5" />
										Preview
									</div>
								) : (
									<div className="flex gap-2 items-center">
										<Radio className="size-3.5" />
										<span className="text-sm">Production</span>
									</div>
								)}
							</Label>
							<Switch
								id="preview-switch"
								checked={isPreview}
								onCheckedChange={setIsPreview}
							/>
						</div>

						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									className="w-8 h-8"
									onClick={() =>
										setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
									}
								>
									<motion.div
										initial={{ rotate: 0 }}
										animate={{ rotate: sortOrder === "desc" ? 0 : 180 }}
										transition={{ duration: 0.1 }}
									>
										<SortAsc className="w-3.5 h-3.5" />
									</motion.div>
								</Button>
							</TooltipTrigger>
							<TooltipContent sideOffset={10}>Sort by date</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
};

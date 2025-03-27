import type { Doc } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Filter, Search, SortAsc } from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useDebounce } from "use-debounce";

interface ControlsProps {
	open: () => void;
	searchQuery: string;
	setSearchQuery: Dispatch<SetStateAction<string>>;
	campaignType: Doc<"campaigns">["type"] | "all";
	setCampaignType: Dispatch<SetStateAction<Doc<"campaigns">["type"] | "all">>;
	sortOrder: "asc" | "desc";
	setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
}

export const Controls = ({
	open,
	searchQuery,
	setSearchQuery,
	campaignType,
	setCampaignType,
	sortOrder,
	setSortOrder,
}: ControlsProps) => {
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

	return (
		<div className="flex flex-col gap-2 max-h-min px-4 py-3 border-b border-border">
			{/* Controls */}
			<div className="flex items-center gap-2 justify-between">
				{/* Left Part */}
				<div>
					{/* Search bar */}
					<div className="w-full relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
						<Input
							type="search"
							className="w-full h-8 pl-8"
							placeholder="Search by name"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Right Part */}
				<div className="flex items-center justify-end gap-4 flex-1">
					{/* Filters row */}
					<div className="flex items-center flex-1 justify-end gap-2">
						<Select
							value={campaignType}
							onValueChange={(value) =>
								setCampaignType(value as Doc<"campaigns">["type"])
							}
						>
							<SelectTrigger className="h-8 w-full max-w-48">
								<div className="flex items-center gap-2">
									<Filter className="w-3.5 h-3.5" />
									<SelectValue placeholder="All types" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="lead-generation">Lead Generation</SelectItem>
								<SelectItem value="click-through">Click Through</SelectItem>
							</SelectContent>
						</Select>

						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									className="h-8 w-8"
									disabled={debouncedSearchQuery !== ""}
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
							<TooltipContent sideOffset={10}>Sort</TooltipContent>
						</Tooltip>
					</div>
					<Separator orientation="vertical" className="h-5" />
					<Button onClick={() => open()} className="h-8">
						New Campaign
						<ButtonShortcut>⌘N</ButtonShortcut>
					</Button>
				</div>
			</div>
		</div>
	);
};

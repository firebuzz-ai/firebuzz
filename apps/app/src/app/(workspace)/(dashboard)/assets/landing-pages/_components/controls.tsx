import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
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
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";

interface ControlsProps {
	searchQuery: string;
	setSearchQuery: Dispatch<SetStateAction<string>>;
	sortOrder: "asc" | "desc";
	setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
	isArchived: boolean | undefined;
	setIsArchived: Dispatch<SetStateAction<boolean | undefined>>;
}

export const Controls = ({
	searchQuery,
	setSearchQuery,
	sortOrder,
	setSortOrder,
	isArchived,
	setIsArchived,
}: ControlsProps) => {
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
	const [, { openModal }] = useNewLandingPageModal();

	return (
		<div className="flex flex-col gap-2 px-4 py-3 border-b max-h-min border-border">
			<div className="flex gap-2 justify-between items-center">
				<div>
					<div className="relative w-full">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
						<Input
							type="search"
							className="pl-8 w-full h-8"
							placeholder="Search by title"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				<div className="flex flex-1 gap-4 justify-end items-center">
					<div className="flex flex-1 gap-2 justify-end items-center">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setIsArchived(isArchived === undefined ? true : undefined)
							}
						>
							<Filter className="mr-2 h-3.5 w-3.5" />
							{isArchived ? "Show All" : "Show Archived"}
						</Button>

						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									className="w-8 h-8"
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
					<Button
						variant="outline"
						className="!h-8"
						onClick={() => openModal()}
					>
						New Landing Page
						<ButtonShortcut>⌘N</ButtonShortcut>
					</Button>
				</div>
			</div>
		</div>
	);
};

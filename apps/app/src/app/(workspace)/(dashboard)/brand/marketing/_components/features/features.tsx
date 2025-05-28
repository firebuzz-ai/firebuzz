"use client";

import { EmptyState } from "@/components/reusables/empty-state";
import { useNewFeatureModal } from "@/hooks/ui/use-new-feature-modal";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@firebuzz/ui/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { HelpCircle, Table2 } from "@firebuzz/ui/icons/lucide";
import { FeatureRow } from "./feature-row";

export const Features = () => {
	const [, setNewFeatureModal] = useNewFeatureModal();

	const { data: features, isPending: isLoading } = useCachedRichQuery(
		api.collections.brands.features.queries.getAll,
		{},
	);

	const handleCreateFirstFeature = () => {
		setNewFeatureModal({ create: true });
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center flex-1 w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 max-h-full overflow-hidden">
			{/* Empty State */}
			{features && features.length === 0 && (
				<EmptyState
					icon={<Table2 className="size-6" />}
					title="No features yet"
					description="Create your first feature to start defining your product offerings and their benefits."
					buttonTitle="Create Feature"
					buttonShortcut="⌘N"
					onClick={handleCreateFirstFeature}
				/>
			)}

			{/* Content */}
			{features && features.length > 0 && (
				<div className="flex-1 overflow-y-auto">
					<div className="p-4">
						<div className="overflow-hidden border rounded-xl">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50 hover:bg-muted/50">
										<TableHead className="w-[200px] border-r border-b-0">
											<div className="flex items-center gap-2">Name</div>
										</TableHead>
										<TableHead className="border-b-0 border-r">
											<div className="flex items-center gap-2">
												Description
												<Tooltip delayDuration={0}>
													<TooltipTrigger>
														<HelpCircle className="w-4 h-4 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent
														side="right"
														align="center"
														sideOffset={10}
														className="max-w-[200px]"
													>
														<p>
															A detailed description of what this feature or
															service offers
														</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</TableHead>
										<TableHead className="border-b-0 border-r">
											<div className="flex items-center gap-2">
												Benefits
												<Tooltip delayDuration={0}>
													<TooltipTrigger>
														<HelpCircle className="w-4 h-4 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent
														side="right"
														align="center"
														sideOffset={10}
														className="max-w-[200px]"
													>
														<p>
															The specific benefits and value this provides to
															users
														</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</TableHead>
										<TableHead className="border-b-0 border-r">
											<div className="flex items-center gap-2">
												Proof or Evidence
												<Tooltip delayDuration={0}>
													<TooltipTrigger>
														<HelpCircle className="w-4 h-4 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent
														side="right"
														align="center"
														sideOffset={10}
														className="max-w-[200px]"
													>
														<p>
															Evidence, testimonials, or data that supports the
															value of this feature
														</p>
													</TooltipContent>
												</Tooltip>
											</div>
										</TableHead>
										<TableHead className="w-16 border-b-0">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{features.map((feature, index) => (
										<FeatureRow
											key={feature._id}
											feature={feature}
											isLast={index === features.length - 1}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

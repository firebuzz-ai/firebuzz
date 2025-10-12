"use client";

import { api, type Doc, type Id, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Users } from "@firebuzz/ui/icons/lucide";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/reusables/empty-state";
import { useNewAudienceModal } from "@/hooks/ui/use-new-audience-modal";
import { AudienceItem } from "./audience-item";
import { AudienceSearchBar } from "./audience-search-bar";
import { AudienceSelectedMenu } from "./audience-selected-menu";

export const Audiences = () => {
	const [selected, setSelected] = useState<Id<"audiences">[]>([]);
	const [, setModal] = useNewAudienceModal();
	const [searchResults, setSearchResults] = useState<Doc<"audiences">[]>([]);
	const [isSearchActive, setIsSearchActive] = useState(false);

	const { data: audiences, isPending: isLoading } = useCachedRichQuery(
		api.collections.brands.audiences.queries.getAll,
		{},
	);

	const displayedAudiences = useMemo(() => {
		return isSearchActive ? searchResults : audiences;
	}, [searchResults, audiences, isSearchActive]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center flex-1 w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col flex-1 max-h-full overflow-hidden">
			<div
				onDoubleClick={(e) => {
					e.stopPropagation();
					setSelected([]);
				}}
				className="flex-1 overflow-y-auto select-none"
			>
				{/* Content */}

				{/* Empty State */}
				{displayedAudiences &&
					displayedAudiences.length === 0 &&
					!isSearchActive && (
						<EmptyState
							icon={<Users className="size-6" />}
							title="No audiences yet"
							description="Create your first audience to start defining your target demographics and characteristics."
							buttonTitle="Create Audience"
							buttonShortcut="⌘N"
							onClick={() => {
								setModal((prev) => {
									return {
										...prev,
										create: true,
									};
								});
							}}
						/>
					)}

				{/* Audiences */}
				{displayedAudiences && displayedAudiences.length > 0 && (
					<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{displayedAudiences.map((audience) => (
							<AudienceItem
								key={audience._id}
								audience={audience}
								selected={selected.includes(audience._id)}
								setSelected={setSelected}
							/>
						))}
					</div>
				)}
			</div>

			<AudienceSelectedMenu
				selections={selected}
				setSelections={setSelected}
				totalCount={audiences?.length ?? 0}
			/>

			<AudienceSearchBar
				isSearchActive={isSearchActive}
				setIsSearchActive={setIsSearchActive}
				isVisible={selected.length === 0 && (audiences?.length ?? 0) > 0}
				setSearchResults={setSearchResults}
			/>
		</div>
	);
};

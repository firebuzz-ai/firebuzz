"use client";

import { api, type Doc, type Id, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Hash } from "@firebuzz/ui/icons/lucide";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/reusables/empty-state";
import { useNewSocialModal } from "@/hooks/ui/use-new-social-modal";
import { SocialItem } from "./social-item";
import { SocialSearchBar } from "./social-search-bar";
import { SocialSelectedMenu } from "./social-selected-menu";

export const Socials = () => {
	const [selected, setSelected] = useState<Id<"socials">[]>([]);
	const [, setModal] = useNewSocialModal();
	const [searchResults, setSearchResults] = useState<Doc<"socials">[]>([]);
	const [isSearchActive, setIsSearchActive] = useState(false);

	const { data: socials, isPending: isLoading } = useCachedRichQuery(
		api.collections.brands.socials.queries.getAll,
		{},
	);

	const displayedSocials = useMemo(() => {
		return isSearchActive ? searchResults : socials;
	}, [searchResults, socials, isSearchActive]);

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
				{displayedSocials &&
					displayedSocials.length === 0 &&
					!isSearchActive && (
						<EmptyState
							icon={<Hash className="size-6" />}
							title="No social accounts yet"
							description="Connect your social media accounts to start managing your brand's online presence."
							buttonTitle="Add Social Account"
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

				{/* Socials */}
				{displayedSocials && displayedSocials.length > 0 && (
					<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{displayedSocials.map((social) => (
							<SocialItem
								key={social._id}
								social={social}
								selected={selected.includes(social._id)}
								setSelected={setSelected}
							/>
						))}
					</div>
				)}
			</div>

			<SocialSelectedMenu
				selections={selected}
				setSelections={setSelected}
				totalCount={socials?.length ?? 0}
			/>

			<SocialSearchBar
				isSearchActive={isSearchActive}
				setIsSearchActive={setIsSearchActive}
				isVisible={selected.length === 0 && (socials?.length ?? 0) > 0}
				setSearchResults={setSearchResults}
			/>
		</div>
	);
};

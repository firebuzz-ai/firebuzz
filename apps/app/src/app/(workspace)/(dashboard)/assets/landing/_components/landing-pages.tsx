"use client";
import { TableFooter } from "@/components/tables/paginated-footer";
import { useProject } from "@/hooks/auth/use-project";
import { api, useCachedQuery, useStablePaginatedQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Controls } from "./controls";
import { Table } from "./table";

export const LandingPages = () => {
	const { currentProject } = useProject();
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [selection, setSelection] = useState<Record<string, boolean>>({});
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
	const [isArchived, setIsArchived] = useState<boolean | undefined>(undefined);

	const {
		results: landingPages,
		status,
		loadMore,
	} = useStablePaginatedQuery(
		api.collections.landingPages.queries.getPaginatedLandingPages,
		currentProject
			? {
					projectId: currentProject?._id,
					sortOrder,
					searchQuery: debouncedSearchQuery,
					isArchived,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	const totalCount = useCachedQuery(
		api.collections.landingPages.queries.getTotalCount,
		currentProject
			? {
					projectId: currentProject?._id,
				}
			: "skip",
	);

	const loaderRef = useRef<HTMLDivElement>(null);

	const loadMoreHandler = async () => {
		if (status === "CanLoadMore") {
			void loadMore(20);
		}
	};

	useEffect(() => {
		if (status !== "CanLoadMore") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMore(20);
				}
			},
			{ threshold: 0.1 },
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}

		return () => observer.disconnect();
	}, [status, loadMore]);

	return (
		<div className="overflow-hidden flex-1 flex flex-col max-w-full max-h-full">
			<Controls
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				sortOrder={sortOrder}
				setSortOrder={setSortOrder}
				isArchived={isArchived}
				setIsArchived={setIsArchived}
			/>

			<div className="flex flex-col flex-1 overflow-hidden max-h-full max-w-full">
				{status === "LoadingFirstPage" ? (
					<div className="flex flex-1 items-center justify-center">
						<Spinner size="sm" />
					</div>
				) : landingPages.length === 0 ? (
					<div className="flex items-center justify-center flex-1">
						<p className="text-muted-foreground text-sm text-center">
							No landing pages found. Create a new landing page to get started.
						</p>
					</div>
				) : (
					<Table
						data={landingPages}
						selection={selection}
						setSelection={setSelection}
						loadMoreHandler={loadMoreHandler}
					/>
				)}
			</div>
			<TableFooter
				currentCount={landingPages.length}
				totalCount={totalCount ?? 0}
				status={status}
			/>
		</div>
	);
};

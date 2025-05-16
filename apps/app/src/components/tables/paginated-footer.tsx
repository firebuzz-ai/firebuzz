export const TableFooter = ({
	currentCount,
	totalCount,
	status,
}: {
	currentCount: number;
	totalCount: number;
	status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}) => {
	return (
		<div className="flex w-full max-h-min items-center justify-between py-1.5 border-t border-border px-4">
			<div className="flex items-center justify-between w-full gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					{`${currentCount} of ${totalCount} loaded`}
				</div>
				{status === "LoadingFirstPage" ? (
					<div className="text-xs text-muted-foreground/50">Loading...</div>
				) : (
					<div className="flex items-center justify-between">
						<div className="text-xs text-muted-foreground/50">
							{status === "CanLoadMore" && totalCount > currentCount
								? "Scroll down to load more"
								: status === "LoadingMore"
									? "Loading..."
									: "All loaded"}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

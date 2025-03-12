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
    <div className="flex flex-1 max-h-min items-center justify-between py-1.5 border-t border-border px-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-between w-full">
        <div className="flex items-center gap-1">
          {`${currentCount} of ${totalCount} loaded`}
        </div>
        {status === "LoadingFirstPage" ? (
          <div className="text-xs text-muted-foreground/50">Loading...</div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground/50">
              {status === "CanLoadMore"
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

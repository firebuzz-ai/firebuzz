"use client";
import { TableFooter } from "@/components/tables/paginated-footer";
import { useProject } from "@/hooks/auth/use-project";
import {
  type Doc,
  api,
  useCachedQuery,
  useStablePaginatedQuery,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Controls } from "./controls";
import { Table } from "./table";

export const Campaigns = () => {
  const { currentProject } = useProject();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [campaignType, setCampaignType] = useState<
    Doc<"campaigns">["type"] | "all"
  >("all");

  const {
    results: campaigns,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.collections.campaigns.queries.getPaginatedCampaigns,
    currentProject
      ? {
          projectId: currentProject?._id,
          sortOrder,
          searchQuery: debouncedSearchQuery,
          campaignType: campaignType !== "all" ? campaignType : undefined,
        }
      : "skip",
    { initialNumItems: 20 }
  );

  const totalCount = useCachedQuery(
    api.collections.campaigns.queries.getTotalCount,
    currentProject
      ? {
          projectId: currentProject?._id,
        }
      : "skip"
  );

  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMoreHandler = async () => {
    if (status === "CanLoadMore") {
      void loadMore(20);
    }
  };

  // Add intersection observer for infinite loading
  useEffect(() => {
    if (status !== "CanLoadMore") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(20);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [status, loadMore]);

  return (
    <div className="overflow-hidden flex-1 flex flex-col max-w-full max-h-full">
      <Controls
        open={open}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        campaignType={campaignType}
        setCampaignType={setCampaignType}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      {/* Table */}
      <div className="flex flex-col flex-1 overflow-hidden max-h-full max-w-full">
        {/* Table View */}
        {status === "LoadingFirstPage" ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground text-sm text-center">
              No campaigns found. Create a new campaign to get started.
            </p>
          </div>
        ) : (
          <Table
            data={campaigns}
            selection={selection}
            setSelection={setSelection}
            loadMoreHandler={loadMoreHandler}
          />
        )}
      </div>
      <TableFooter
        currentCount={campaigns.length}
        totalCount={totalCount ?? 0}
        status={status}
      />
      {/*  <SelectedMenu
        selections={selection}
        setSelections={setSelection}
        totalCount={totalCount ?? 0}
      /> */}
    </div>
  );
};

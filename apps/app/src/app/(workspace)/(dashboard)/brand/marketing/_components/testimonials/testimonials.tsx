"use client";

import { EmptyState } from "@/components/reusables/empty-state";
import { useNewTestimonialModal } from "@/hooks/ui/use-new-testimonial-modal";
import {
  type Doc,
  type Id,
  api,
  useCachedQuery,
  useStablePaginatedQuery,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Star } from "@firebuzz/ui/icons/lucide";
import { useEffect, useRef, useState } from "react";
import { Footer } from "./footer";
import { TestimonialItem } from "./testimonial-item";
import { TestimonialSearchBar } from "./testimonial-search-bar";
import { TestimonialSelectedMenu } from "./testimonial-selected-menu";

export const Testimonials = () => {
  const [selected, setSelected] = useState<Id<"testimonials">[]>([]);
  const [, setModal] = useNewTestimonialModal();
  const [searchResults, setSearchResults] = useState<Doc<"testimonials">[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const {
    results: testimonials,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.collections.brands.testimonials.queries.getAll,
    {},
    { initialNumItems: 12 }
  );

  const brandId = testimonials[0]?.brandId;

  const totalCount = useCachedQuery(
    api.collections.brands.testimonials.queries.getTotalCount,
    brandId
      ? {
          brandId,
        }
      : "skip"
  );

  // Use search results when search is active, otherwise use paginated results
  const displayedTestimonials = isSearchActive ? searchResults : testimonials;

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "CanLoadMore") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(12);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [status, loadMore]);

  if (status === "LoadingFirstPage") {
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
        {/* Empty State */}
        {displayedTestimonials.length === 0 && !isSearchActive && (
          <EmptyState
            icon={<Star className="size-6" />}
            title="No testimonials yet"
            description="Create your first testimonial to start showcasing customer feedback and reviews."
            buttonTitle="Create Testimonial"
            buttonShortcut="⌘N"
            onClick={() => {
              setModal({ create: true });
            }}
          />
        )}

        {/* Testimonials */}
        {displayedTestimonials.length > 0 && (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedTestimonials.map((testimonial) => (
              <TestimonialItem
                key={testimonial._id}
                testimonial={testimonial}
                selected={selected.includes(testimonial._id)}
                setSelected={setSelected}
              />
            ))}
          </div>
        )}

        {/* Loading More */}
        {status === "CanLoadMore" && (
          <div ref={loaderRef} className="flex justify-center w-full p-4">
            <Spinner size="xs" />
          </div>
        )}
        {status === "LoadingMore" && (
          <div className="flex items-center justify-center w-full h-24">
            <Spinner size="xs" />
          </div>
        )}
      </div>

      {totalCount && totalCount > 0 && (
        <Footer
          totalCount={totalCount}
          currentCount={displayedTestimonials.length}
          status={status}
        />
      )}

      <TestimonialSelectedMenu
        selections={selected}
        setSelections={setSelected}
        totalCount={totalCount ?? 0}
      />

      <TestimonialSearchBar
        isSearchActive={isSearchActive}
        setIsSearchActive={setIsSearchActive}
        isVisible={selected.length === 0 && testimonials.length > 0}
        setSearchResults={setSearchResults}
      />
    </div>
  );
};

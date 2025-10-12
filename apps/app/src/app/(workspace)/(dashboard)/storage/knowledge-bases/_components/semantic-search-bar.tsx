"use client";

import { api, type Id, useAction } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowRight, Search, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { MemoryItemType } from "./memory-list";

// Animation variants
const animations = {
	container: {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.2, ease: "easeOut" },
		},
		exit: {
			opacity: 0,
			y: 20,
			transition: { duration: 0.1, ease: "easeInOut" },
		},
	},
	searchBar: {
		unfocused: {
			scale: 1,
			padding: "0px",
			transition: { type: "spring", stiffness: 400, damping: 25 },
		},
		focused: {
			scale: 1.05,
			padding: "12px",
			transition: { type: "spring", stiffness: 400, damping: 25 },
		},
	},
};

interface SemanticSearchBarProps {
	knowledgeBaseId: Id<"knowledgeBases"> | undefined;
	isVisible: boolean;
	setSearchResults: Dispatch<SetStateAction<MemoryItemType[]>>;
	setIsSearchActive: Dispatch<SetStateAction<boolean>>;
	isSearchActive: boolean;
}

export const SemanticSearchBar = ({
	knowledgeBaseId,
	isVisible,
	setSearchResults,
	setIsSearchActive,
	isSearchActive,
}: SemanticSearchBarProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [lastSearchQuery, setLastSearchQuery] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const performVectorSearch = useAction(
		api.collections.storage.knowledgeBases.actions.vectorSearch,
	);

	const handleActivate = useCallback(() => {
		setIsFocused(true);
		inputRef.current?.focus();
	}, []);
	const resetSearch = useCallback(() => {
		setSearchQuery("");
		setLastSearchQuery("");
		setSearchResults([]);
		setIsSearchActive(false);
	}, [setSearchResults, setIsSearchActive]);

	useHotkeys("esc", resetSearch, {
		preventDefault: true,
		enabled: !isFocused || isSearchActive,
	});

	useHotkeys("meta+s", handleActivate, { preventDefault: true });

	const handleSearch = useCallback(async () => {
		if (!searchQuery.trim() || !knowledgeBaseId) return;

		setIsSearching(true);
		try {
			const results = await performVectorSearch({
				query: searchQuery,
				knowledgeBase: [knowledgeBaseId],
			});
			setSearchResults(results);
			setLastSearchQuery(searchQuery);
			setIsSearchActive(true);
		} catch (error) {
			console.error("Error performing vector search:", error);
			setSearchResults([]);
			// Add proper error handling (consider using a toast notification)
		} finally {
			setIsSearching(false);
			setIsFocused(false);
		}
	}, [
		searchQuery,
		knowledgeBaseId,
		performVectorSearch,
		setSearchResults,
		setIsSearchActive,
	]);

	// Reset search when component becomes invisible
	useEffect(() => {
		if (!isVisible) {
			setSearchQuery("");
			setIsFocused(false);
			setIsSearchActive(false);
		}
	}, [isVisible, setIsSearchActive]);

	// Clear search results when query is empty
	/*   useEffect(() => {
    if (searchQuery.trim() === "" && isVisible) {
      setSearchResults([]);
      setIsSearchActive(false);
    }
  }, [searchQuery, isVisible, setSearchResults, setIsSearchActive]); */

	// Focus input when visible and focused
	useEffect(() => {
		if (isVisible && isFocused && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isVisible, isFocused]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				void handleSearch();
			}
			if (e.key === "Escape") {
				setIsFocused(false);
				inputRef.current?.blur();
			}
		},
		[handleSearch],
	);

	const handleInputBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node)) {
				setIsFocused(false);
			}
		},
		[],
	);

	if (!isVisible) return null;

	return (
		<AnimatePresence mode="wait">
			<motion.div
				variants={animations.container}
				initial="hidden"
				animate="visible"
				exit="exit"
				className={cn(
					"absolute left-0 right-0 z-10 flex items-center justify-center p-2 pointer-events-none select-none bottom-10",
					isFocused &&
						"inset-0 z-30 bg-background/80 backdrop-blur-sm pointer-events-auto flex items-center justify-center",
				)}
			>
				<motion.div
					variants={animations.searchBar}
					animate={isFocused ? "focused" : "unfocused"}
					layoutId="searchBar"
					className="flex relative items-center w-full max-w-xl rounded-md border shadow-sm pointer-events-auto bg-background border-border"
					onClick={(e) => e.stopPropagation()}
				>
					{isSearchActive && lastSearchQuery && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="absolute left-0 -top-10 text-muted-foreground"
						>
							<Button onClick={resetSearch} variant="outline" size="sm">
								{lastSearchQuery} <X className="!size-3.5" />
							</Button>
						</motion.div>
					)}

					<div className="pr-2 pl-3 text-muted-foreground">
						<Search className="size-4" />
					</div>

					<Input
						ref={inputRef}
						type="text"
						placeholder="Search memory items..."
						className="flex-1 h-9 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => !isFocused && setIsFocused(true)}
						onBlur={handleInputBlur}
						onKeyDown={handleKeyDown}
					/>

					<div className="flex gap-1 items-center">
						<Button
							className="hover:bg-transparent"
							variant="ghost"
							size="iconSm"
						>
							<ButtonShortcut>⌘S</ButtonShortcut>
						</Button>
						<Button
							variant="ghost"
							size="iconSm"
							className="p-2 mr-1 w-auto h-auto rounded-md text-muted-foreground hover:bg-muted disabled:bg-transparent"
							onClick={(e) => {
								e.stopPropagation();
								void handleSearch();
							}}
							disabled={!searchQuery.trim() || isSearching}
						>
							{isSearching ? (
								<Spinner size="xs" />
							) : (
								<ArrowRight className="size-4" />
							)}
						</Button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};

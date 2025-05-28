"use client";

import { type Doc, api, useCachedRichQuery } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowRight, Search, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

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

interface SocialSearchBarProps {
	isVisible: boolean;
	setSearchResults: Dispatch<SetStateAction<Doc<"socials">[]>>;
	setIsSearchActive: Dispatch<SetStateAction<boolean>>;
	isSearchActive: boolean;
}

export const SocialSearchBar = ({
	isVisible,
	setSearchResults,
	setIsSearchActive,
	isSearchActive,
}: SocialSearchBarProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [actualSearchQuery, setActualSearchQuery] = useState("");
	const [lastSearchQuery, setLastSearchQuery] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const { data: searchResults, isPending: isSearchPending } =
		useCachedRichQuery(
			api.collections.brands.socials.queries.getAll,
			actualSearchQuery.trim()
				? { searchQuery: actualSearchQuery.trim() }
				: "skip",
		);

	const handleActivate = useCallback(() => {
		setIsFocused(true);
		inputRef.current?.focus();
	}, []);

	const resetSearch = useCallback(() => {
		setSearchQuery("");
		setActualSearchQuery("");
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
		if (!searchQuery.trim()) return;

		setIsSearching(true);
		try {
			// Trigger the actual search by setting the actualSearchQuery
			setActualSearchQuery(searchQuery.trim());
			setLastSearchQuery(searchQuery);
			setIsSearchActive(true);
		} catch (error) {
			console.error("Error performing search:", error);
			setSearchResults([]);
		} finally {
			setIsSearching(false);
			setIsFocused(false);
		}
	}, [searchQuery, setSearchResults, setIsSearchActive]);

	// Update search results when query results change
	useEffect(() => {
		if (searchResults && actualSearchQuery.trim()) {
			setSearchResults(searchResults);
			setIsSearchActive(true);
		}
	}, [searchResults, actualSearchQuery, setSearchResults, setIsSearchActive]);

	// Reset search when component becomes invisible
	useEffect(() => {
		if (!isVisible) {
			setSearchQuery("");
			setIsFocused(false);
			setIsSearchActive(false);
		}
	}, [isVisible, setIsSearchActive]);

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
					"absolute left-0 right-0 z-10 flex items-center justify-center p-2 pointer-events-none select-none bottom-5",
					isFocused &&
						"inset-0 z-30 bg-background/80 backdrop-blur-sm pointer-events-auto flex items-center justify-center",
				)}
			>
				<motion.div
					variants={animations.searchBar}
					animate={isFocused ? "focused" : "unfocused"}
					layoutId="searchBar"
					className="relative flex items-center w-full max-w-xl border rounded-md shadow-sm pointer-events-auto bg-background border-border"
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

					<div className="pl-3 pr-2 text-muted-foreground">
						<Search className="size-4" />
					</div>

					<Input
						ref={inputRef}
						type="text"
						placeholder="Search social accounts..."
						className="flex-1 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => !isFocused && setIsFocused(true)}
						onBlur={handleInputBlur}
						onKeyDown={handleKeyDown}
					/>

					<div className="flex items-center gap-1">
						<Button
							onClick={!isFocused ? handleActivate : resetSearch}
							className="hover:bg-transparent"
							variant="ghost"
							size="iconSm"
						>
							<ButtonShortcut>{isFocused ? "Esc" : "⌘S"}</ButtonShortcut>
						</Button>
						<Button
							variant="ghost"
							size="iconSm"
							className="w-auto h-auto p-2 mr-1 rounded-md text-muted-foreground hover:bg-muted disabled:bg-transparent"
							onClick={(e) => {
								e.stopPropagation();
								void handleSearch();
							}}
							disabled={!searchQuery.trim() || isSearching || isSearchPending}
						>
							{isSearching ? (
								<Spinner className="mb-0.5" size="xs" />
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

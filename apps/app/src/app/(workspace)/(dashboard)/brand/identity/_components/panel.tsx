"use client";

import { BrowserPreview } from "@/lib/theme/preview";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { DottedGridBackground } from "@firebuzz/ui/components/reusable/dotted-grid-background";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface PanelProps {
	hasChanges: boolean;
	onSave: (() => Promise<void>) | null;
	isSaving: boolean;
	formValues: {
		name: string;
		website?: string;
		description?: string;
		persona?: string;
		logo?: string;
		logoDark?: string;
		favicon?: string;
	} | null;
}

export const Panel = ({
	hasChanges = false,
	onSave,
	isSaving = false,
	formValues,
}: PanelProps) => {
	const { theme: currentTheme } = useTheme();
	const { data: brand, isPending: isLoadingBrand } = useCachedRichQuery(
		api.collections.brands.queries.getCurrent,
	);

	const { data: theme, isPending: isLoadingTheme } = useCachedRichQuery(
		api.collections.brands.themes.queries.getById,
		brand?.defaultThemeId
			? {
					id: brand.defaultThemeId,
				}
			: "skip",
	);

	useHotkeys(
		"meta+s",
		() => {
			if (onSave && !isSaving && hasChanges) {
				onSave();
			}
		},
		{
			preventDefault: true,
		},
	);

	const { data: allThemes, isPending: isLoadingAllThemes } = useCachedRichQuery(
		api.collections.brands.themes.queries.getAll,
		!brand?.defaultThemeId && !isLoadingTheme
			? {
					showHidden: true,
				}
			: "skip",
	);

	const [previewMode, setPreviewMode] = useState<"light" | "dark">(
		currentTheme === "dark" ? "dark" : "light",
	);

	// Use form values for preview if available, otherwise fall back to saved brand data
	const previewData = useMemo(() => {
		return {
			name: formValues?.name || brand?.name || "",
			website: formValues?.website || brand?.website,
			description: formValues?.description || brand?.description,
			persona: formValues?.persona || brand?.persona,
			logo:
				previewMode === "dark"
					? formValues?.logoDark || brand?.logoDark
					: formValues?.logo || brand?.logo,
			favicon: formValues?.favicon || brand?.seo?.favicon,
		};
	}, [brand, formValues, previewMode]);
	const themeData = useMemo(() => {
		if (
			!theme &&
			(!allThemes || allThemes.length === 0) &&
			!isLoadingTheme &&
			!isLoadingAllThemes
		) {
			return null;
		}

		if (theme) {
			const fonts = {
				sans: theme.fonts?.find((f) => f.family === "sans")?.name || "Inter",
				serif:
					theme.fonts?.find((f) => f.family === "serif")?.name || "Georgia",
				mono:
					theme.fonts?.find((f) => f.family === "mono")?.name ||
					"JetBrains Mono",
			};
			return {
				fonts,
				darkTheme: theme.darkTheme,
				lightTheme: theme.lightTheme,
				template: theme.template,
			};
		}

		const firstTheme = allThemes?.[0];

		if (firstTheme) {
			const fonts = {
				sans:
					firstTheme.fonts?.find((f) => f.family === "sans")?.name || "Inter",
				serif:
					firstTheme.fonts?.find((f) => f.family === "serif")?.name ||
					"Georgia",
				mono:
					firstTheme.fonts?.find((f) => f.family === "mono")?.name ||
					"JetBrains Mono",
			};
			return {
				fonts,
				darkTheme: firstTheme.darkTheme,
				lightTheme: firstTheme.lightTheme,
				template: firstTheme.template,
			};
		}

		return null;
	}, [theme, allThemes, isLoadingTheme, isLoadingAllThemes]);

	if (isLoadingBrand || !themeData || !currentTheme) {
		return (
			<div className="relative flex-1 h-full p-6 overflow-hidden bg-muted/30">
				<DottedGridBackground isDark={previewMode === "dark"} />
				<div className="relative z-10 flex items-center justify-center h-full bg-muted/30">
					<div className="space-y-4 text-center">
						<Skeleton className="w-48 h-8 mx-auto" />
						<Skeleton className="w-64 h-4 mx-auto" />
						<div className="max-w-4xl mx-auto overflow-hidden border rounded-lg shadow-xl bg-background">
							<div className="px-4 py-3 border-b bg-muted/50">
								<Skeleton className="w-full h-6" />
							</div>
							<div className="p-8 space-y-6">
								<Skeleton className="w-3/4 h-12 mx-auto" />
								<Skeleton className="w-full h-6" />
								<Skeleton className="w-5/6 h-6" />
								<div className="flex justify-center gap-4">
									<Skeleton className="w-32 h-10" />
									<Skeleton className="w-32 h-10" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!previewData) {
		return (
			<div className="relative flex-1 p-6 overflow-hidden bg-muted/30">
				<DottedGridBackground isDark={previewMode === "dark"} />
				<div className="relative z-10 flex items-center justify-center h-full">
					<div className="space-y-4 text-center">
						<h3 className="text-lg font-medium text-muted-foreground">
							No Brand Data Available
						</h3>
						<p className="text-sm text-muted-foreground">
							Configure your brand identity to see the preview
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col h-full max-h-full overflow-hidden bg-muted">
			{/* Header */}
			<div className="relative z-10 px-6 py-4 border-b bg-background/95 backdrop-blur">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold">Brand Preview</h2>
						<p className="text-sm text-muted-foreground">
							See how your brand identity appears across platforms
							{hasChanges && (
								<span className="ml-1 font-medium text-brand">
									• Live Preview
								</span>
							)}
						</p>
					</div>
					<Button
						variant="outline"
						onClick={async () => {
							if (onSave) {
								await onSave();
							}
						}}
						disabled={!hasChanges || isSaving}
						size="sm"
						className="font-medium"
					>
						{isSaving ? (
							<>
								<Spinner size="sm" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</Button>
				</div>
			</div>

			{/* Preview Content */}
			<div className="relative flex flex-col flex-1 gap-4 overflow-hidden bg-muted">
				<DottedGridBackground isDark={previewMode === "dark"} />

				<div className="relative z-10 h-full p-8">
					<BrowserPreview
						previewMode={previewMode}
						brandData={previewData}
						onThemeToggle={(checked: boolean) =>
							setPreviewMode(checked ? "dark" : "light")
						}
						themeData={themeData}
					/>
				</div>
			</div>
		</div>
	);
};

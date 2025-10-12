"use client";

import { api, type Id, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useMemo, useState } from "react";
import { ThemeTabs } from "@/components/navigation/brand/themes-tabs";
import { ThemeSettingsSheet } from "@/components/sheets/settings/themes/sheet";
import { NewThemeModal } from "./modals/new-theme/modal";
import { Theme } from "./theme/theme";

export const Themes = ({
	rightPanelSize,
	panelId,
}: {
	rightPanelSize: number;
	panelId: string;
}) => {
	const [id, setId] = useState<Id<"themes">>();

	const { data: themes, isPending: isLoading } = useCachedRichQuery(
		api.collections.brands.themes.queries.getAll,
		{
			showHidden: false,
		},
	);

	const memoizedThemes = useMemo(
		() =>
			themes?.map((theme) => ({
				id: theme._id,
				name: theme.name,
			})) ?? [],
		[themes],
	);

	const tabs = useMemo(() => {
		return (
			memoizedThemes?.map((theme) => ({
				value: theme.id,
				label: theme.name,
			})) ?? []
		);
	}, [memoizedThemes]);

	useEffect(() => {
		if (themes && themes.length > 0 && !id) {
			setId(themes[0]._id);
		}
	}, [themes, id]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center flex-1">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="relative flex flex-col flex-1 max-w-full max-h-full overflow-hidden">
			<ThemeTabs tabs={tabs} id={id} setId={setId} />
			{id && (
				<Theme themeId={id} rightPanelSize={rightPanelSize} id={panelId} />
			)}
			<NewThemeModal />
			<ThemeSettingsSheet />
		</div>
	);
};

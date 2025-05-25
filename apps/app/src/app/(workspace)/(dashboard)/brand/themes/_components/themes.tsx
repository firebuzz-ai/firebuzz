"use client";

import { ThemeSettingsSheet } from "@/components/sheets/settings/themes/sheet";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useState } from "react";
import { NewThemeModal } from "./modals/new-theme/modal";
import { ThemeTabs } from "./tabs";
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
    }
  );

  const tabs =
    themes?.map((theme) => ({
      value: theme._id,
      label: theme.name,
    })) ?? [];

  useEffect(() => {
    if (themes && themes.length > 0) {
      setId(themes[0]._id);
    }
  }, [themes]);

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

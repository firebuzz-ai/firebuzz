"use client";

import { type Doc, api, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { ArrowLeft } from "@firebuzz/ui/icons/lucide";
import { CountryMultiSelect } from "../value-selectors/country-multi-select";

interface GdprAdvancedSettingsProps {
  gdprSettings: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"];
  onGdprChange: (
    gdpr: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"]
  ) => void;
  onBack: () => void;
  campaign: Doc<"campaigns">;
}

export const GdprAdvancedSettings = ({
  gdprSettings,
  onGdprChange,
  onBack,
  campaign,
}: GdprAdvancedSettingsProps) => {
  const updateCampaignSettings = useMutation(
    api.collections.campaigns.mutations.updateCampaignSettings
  ).withOptimisticUpdate((localStore, args) => {
    // Get the current campaign data
    const existingCampaign = localStore.getQuery(
      api.collections.campaigns.queries.getById,
      { id: campaign._id }
    );

    if (existingCampaign) {
      // Update the campaign settings optimistically
      localStore.setQuery(
        api.collections.campaigns.queries.getById,
        { id: campaign._id },
        {
          ...existingCampaign,
          campaignSettings: {
            ...existingCampaign.campaignSettings,
            ...args.campaignSettings,
          },
        }
      );
    }
  });

  const handleGdprChange = async (
    updatedGdpr: NonNullable<Doc<"campaigns">["campaignSettings"]>["gdpr"]
  ) => {
    try {
      await updateCampaignSettings({
        campaignId: campaign._id,
        campaignSettings: { gdpr: updatedGdpr },
      });
      onGdprChange(updatedGdpr);
    } catch (error) {
      console.error("Failed to update GDPR settings:", error);
    }
  };
  const handleToggle =
    (field: keyof typeof gdprSettings) => (value: boolean) => {
      const updatedGdpr = {
        ...gdprSettings,
        [field]: value,
      };
      handleGdprChange(updatedGdpr);
    };

  const handleCountriesChange = (countries: string[]) => {
    const updatedGdpr = {
      ...gdprSettings,
      includedCountries: countries,
    };
    handleGdprChange(updatedGdpr);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
        <Button
          size="iconSm"
          variant="outline"
          onClick={onBack}
          className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex-1">
          <div className="flex flex-col">
            <div className="text-lg font-semibold leading-tight">
              GDPR Advanced Settings
            </div>
            <div className="text-sm leading-tight text-muted-foreground">
              Configure detailed privacy and compliance options
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-4">
          {/* Advanced Settings */}
          <div className="space-y-4">
            {/* Geo Location Detection */}
            <div className="flex gap-5 justify-between items-center p-3 rounded-md border bg-muted">
              <div className="">
                <Label htmlFor="gdpr-geo" className="text-sm font-medium">
                  Geo-location Detection
                </Label>
                <p className="text-xs text-muted-foreground">
                  {gdprSettings.geoLocation
                    ? "Automatically detect visitor location and show consent banners to visitors from the EU."
                    : "Show consent banners to visitors to all visitors."}
                </p>
              </div>
              <Switch
                id="gdpr-geo"
                checked={gdprSettings.geoLocation}
                onCheckedChange={handleToggle("geoLocation")}
                disabled={!gdprSettings.enabled}
              />
            </div>

            {/* Localization */}
            <div className="flex gap-4 justify-between items-center p-3 rounded-md border bg-muted">
              <div className="">
                <Label
                  htmlFor="gdpr-localization"
                  className="text-sm font-medium"
                >
                  Localization
                </Label>
                <p className="text-xs text-muted-foreground">
                  {gdprSettings.localization
                    ? "Show consent banners in the visitor's local language."
                    : "Show consent banners in the default language."}
                </p>
              </div>
              <Switch
                id="gdpr-localization"
                checked={gdprSettings.localization}
                onCheckedChange={handleToggle("localization")}
                disabled={!gdprSettings.enabled}
              />
            </div>

            {/* Do Not Track */}
            <div className="flex gap-5 justify-between items-center p-3 rounded-md border bg-muted">
              <div className="">
                <Label htmlFor="gdpr-dnt" className="text-sm font-medium">
                  Respect "Do Not Track"
                </Label>
                <p className="text-xs text-muted-foreground">
                  {gdprSettings.respectDNT
                    ? "Honor browser Do Not Track (DNT) header and limit tracking accordingly."
                    : "Do not honor browser Do Not Track (DNT) header and track visitors accordingly."}
                </p>
              </div>
              <Switch
                id="gdpr-dnt"
                checked={gdprSettings.respectDNT}
                onCheckedChange={handleToggle("respectDNT")}
                disabled={!gdprSettings.enabled}
              />
            </div>
            {/* Country Targeting */}
            {gdprSettings.geoLocation && (
              <>
                <Separator />

                <div className="space-y-2">
                  <div className="space-y-2">
                    {gdprSettings.enabled ? (
                      <CountryMultiSelect
                        label="Include More Countries"
                        values={gdprSettings.includedCountries || []}
                        onChange={handleCountriesChange}
                        placeholder="All EU countries (default)"
                        maxHeight={250}
                      />
                    ) : (
                      <div className="p-4 rounded-md border border-dashed bg-muted/30">
                        <p className="text-sm text-center text-muted-foreground">
                          Enable GDPR compliance to configure country targeting
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

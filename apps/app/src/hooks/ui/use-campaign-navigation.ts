import { parseAsStringEnum, useQueryStates } from "nuqs";

export type CampaignScreen =
  | "overview"
  | "custom-events"
  | "traffic"
  | "segment"
  | "ab-test"
  | "variant"
  | "gdpr-settings";

export type CampaignHighlight = "ctaLink";

export const useCampaignNavigation = () => {
  return useQueryStates(
    {
      screen: parseAsStringEnum<CampaignScreen>([
        "overview",
        "custom-events",
        "traffic",
        "segment",
        "ab-test",
        "variant",
        "gdpr-settings",
      ]),
      highlight: parseAsStringEnum<CampaignHighlight>(["ctaLink"]),
    },
    {
      urlKeys: {
        screen: "screen",
        highlight: "highlight",
      },
    }
  );
};

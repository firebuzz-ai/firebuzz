import {
  AppWindowMac,
  ArrowUpDown,
  CircleArrowOutDownRight,
  Notebook,
  Split,
  Target,
  TestTube,
} from "@firebuzz/ui/icons/lucide";

export const CampaignNodeIcons = {
  "traffic-badge": <CircleArrowOutDownRight className="!size-3" />,
  traffic: <ArrowUpDown className="!size-3" />,
  "ab-test": <TestTube className="!size-3" />,
  segment: <Split className="!size-3" />,
  "advanced-targeting": <Target className="!size-3" />,
  variant: <AppWindowMac className="!size-3" />,
  note: <Notebook className="!size-3" />,
};

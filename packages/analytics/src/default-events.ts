export const DEFAULT_CAMPAIGN_EVENTS = [
	{
		event_id: "form-submission",
		event_value: 1,
		event_value_type: "static" as const,
		event_type: "conversion" as const,
		isCustom: false,
	},
	{
		event_id: "external-link-click",
		event_value: 1,
		event_value_type: "static" as const,
		event_type: "engagement" as const,
		isCustom: false,
	},
	{
		event_id: "page-view",
		event_value: 1,
		event_value_type: "static" as const,
		event_type: "engagement" as const,
		isCustom: false,
	},
	{
		event_id: "scroll-threshold",
		event_value: 1,
		event_value_type: "static" as const,
		event_type: "engagement" as const,
		isCustom: false,
	},
] as const;

import { DEFAULT_CAMPAIGN_EVENTS } from "./default-events";
import type { EventConfig } from "./types";

export type { EventConfig };

/**
 * Merge default events with primary goal override and custom events
 */
export function mergeEventConfiguration({
	primaryGoal,
	customEvents = [],
	enableDefaultEvents = true,
}: {
	primaryGoal: EventConfig;
	customEvents?: EventConfig[];
	enableDefaultEvents?: boolean;
}): EventConfig[] {
	const allEvents: EventConfig[] = [];

	// Add default events if enabled
	if (enableDefaultEvents) {
		for (const defaultEvent of DEFAULT_CAMPAIGN_EVENTS) {
			// Check if primary goal overrides this default event
			if (primaryGoal.event_id === defaultEvent.event_id) {
				// Use primary goal configuration instead of default
				allEvents.push({
					event_id: primaryGoal.event_id,
					event_type: primaryGoal.event_type,
					event_value: primaryGoal.event_value, // Primary goal's value overrides default
					event_value_type: primaryGoal.event_value_type, // Primary goal's value type overrides default
					isCustom: primaryGoal.isCustom,
				});
			} else {
				// Use default event configuration
				allEvents.push({
					event_id: defaultEvent.event_id,
					event_type: defaultEvent.event_type,
					event_value: defaultEvent.event_value,
					event_value_type: defaultEvent.event_value_type,
					isCustom: defaultEvent.isCustom,
				});
			}
		}
	}

	// Add primary goal if it's not already included (i.e., it's a custom event)
	const primaryGoalExists = allEvents.some(
		(event) => event.event_id === primaryGoal.event_id,
	);
	if (!primaryGoalExists) {
		allEvents.push(primaryGoal);
	}

	// Add custom events (excluding duplicates)
	for (const customEvent of customEvents) {
		const eventExists = allEvents.some(
			(event) => event.event_id === customEvent.event_id,
		);
		if (!eventExists) {
			allEvents.push(customEvent);
		}
	}

	return allEvents;
}

/**
 * Get event configuration by event_id
 */
export function getEventConfig(
	events: EventConfig[],
	eventId: string,
): EventConfig | undefined {
	return events.find((event) => event.event_id === eventId);
}

/**
 * Check if an event is the primary goal
 */
export function isPrimaryGoal(
	eventId: string,
	primaryGoal: EventConfig,
): boolean {
	return eventId === primaryGoal.event_id;
}

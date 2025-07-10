import { AddOns } from "./_components/add-ons";
import { CurrentPlan } from "./_components/current-plan";

export default function SubscriptionPlanSettings() {
	return (
		<div className="flex overflow-y-auto flex-col flex-1 max-h-full">
			<CurrentPlan />
			<AddOns />
		</div>
	);
}

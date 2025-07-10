import { SubscriptionSettingsTabs } from "@/components/navigation/settings/subscription/tabs";

export default function SubscriptionSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<SubscriptionSettingsTabs />
			<div className="flex overflow-hidden flex-1 max-h-full">{children}</div>
		</div>
	);
}

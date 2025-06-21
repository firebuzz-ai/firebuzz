import { SubscriptionSettingsTabs } from "@/components/navigation/settings/subscription/tabs";

export default function SubscriptionSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<SubscriptionSettingsTabs />
			<div className="flex flex-1">{children}</div>
		</div>
	);
}

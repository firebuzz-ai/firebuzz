import { SettingsTopbar } from "@/components/navigation/settings/topbar";

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<SettingsTopbar />
			<div className="flex flex-1"> {children}</div>
		</div>
	);
}

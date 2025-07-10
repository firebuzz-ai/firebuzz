import { AccountSettingsTabs } from "@/components/navigation/settings/account/tabs";
import { ProfileFormProvider } from "./profile/_components/form-context";

export default function AccountSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<ProfileFormProvider>
				<AccountSettingsTabs />
				<div className="flex overflow-hidden flex-1">{children}</div>
			</ProfileFormProvider>
		</div>
	);
}

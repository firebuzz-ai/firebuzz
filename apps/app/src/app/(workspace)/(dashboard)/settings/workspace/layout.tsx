import { WorkspaceSettingsTabs } from "@/components/navigation/settings/workspace/tabs";
import { WorkspaceGeneralFormProvider } from "./general/_components/form-context";

export default function WorkspaceSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<WorkspaceGeneralFormProvider>
				<WorkspaceSettingsTabs />
				<div className="flex overflow-hidden flex-1">{children}</div>
			</WorkspaceGeneralFormProvider>
		</div>
	);
}

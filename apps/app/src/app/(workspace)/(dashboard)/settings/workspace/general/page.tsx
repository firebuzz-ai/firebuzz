import { DangerZone } from "./_components/danger-zone";
import { WorkspaceGeneralForm } from "./_components/form";

export default function WorkspaceGeneralSettings() {
	return (
		<div className="flex flex-col flex-1">
			<WorkspaceGeneralForm />
			<DangerZone />
		</div>
	);
}

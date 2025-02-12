import { WorkspaceProviders } from "@/components/providers/dashboard-providers";

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
	return <WorkspaceProviders>{children}</WorkspaceProviders>;
};

export default WorkspaceLayout;

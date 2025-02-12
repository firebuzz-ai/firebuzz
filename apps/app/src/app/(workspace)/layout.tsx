import { WorkspaceProviders } from "@/components/providers/workspace";

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
	return <WorkspaceProviders>{children}</WorkspaceProviders>;
};

export default WorkspaceLayout;

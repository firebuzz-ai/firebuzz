import { NewDocumentModal } from "@/app/(workspace)/(dashboard)/storage/documents/_components/modals/new-document/modal";
import { WorkspaceProviders } from "@/components/providers/workspace";

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <WorkspaceProviders>
      {children}
      <NewDocumentModal />
    </WorkspaceProviders>
  );
};

export default WorkspaceLayout;

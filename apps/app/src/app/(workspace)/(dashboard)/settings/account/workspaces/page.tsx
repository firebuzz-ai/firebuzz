"use client";

import { NewWorkspaceModal } from "@/components/modals/workspaces/workspace-modal";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { WorkspaceInvitations } from "./_components/workspace-invitations";
import { WorkspacesList } from "./_components/workspaces-list";

export default function WorkspacesPage() {
  const { isLoading: isWorkspaceLoading } = useWorkspace();

  if (isWorkspaceLoading) {
    return (
      <div className="flex flex-1 justify-center items-center w-full h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <WorkspacesList />
      <WorkspaceInvitations />

      {/* Modals */}
      <NewWorkspaceModal />
    </div>
  );
}

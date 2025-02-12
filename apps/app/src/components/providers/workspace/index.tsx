import type React from "react";
import { ProjectProvider } from "./project";
import { UserProvider } from "./user";
import { WorkspaceProvider } from "./workspace";

export const WorkspaceProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <UserProvider>
      <WorkspaceProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </WorkspaceProvider>
    </UserProvider>
  );
};

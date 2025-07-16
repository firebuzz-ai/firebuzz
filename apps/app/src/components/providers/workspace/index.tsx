import type React from "react";
import { ProjectProvider } from "./project";
import { RouterProvider } from "./router";
import { SubscriptionProvider } from "./subscription";
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
				<SubscriptionProvider>
					<ProjectProvider>
						<RouterProvider>{children}</RouterProvider>
					</ProjectProvider>
				</SubscriptionProvider>
			</WorkspaceProvider>
		</UserProvider>
	);
};

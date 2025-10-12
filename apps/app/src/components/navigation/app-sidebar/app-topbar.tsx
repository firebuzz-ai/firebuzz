"use client";

import { api, type Id, useCachedRichQuery } from "@firebuzz/convex";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@firebuzz/ui/components/ui/breadcrumb";
import { SidebarTrigger } from "@firebuzz/ui/components/ui/sidebar";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const AppTopbar = () => {
	const pathname = usePathname();
	const isProjectPath = pathname.includes("/project");
	const projectId = useMemo(() => {
		if (isProjectPath) {
			return pathname.split("/")[2] as Id<"projects">;
		}
		return null;
	}, [pathname, isProjectPath]);
	const { data: currentProject, isPending: isProjectLoading } =
		useCachedRichQuery(
			api.collections.projects.queries.getById,
			projectId
				? {
						id: projectId,
					}
				: "skip",
		);

	const breadcrumbItems = useMemo(() => {
		if (currentProject) {
			return ["project", currentProject.title];
		}
		return pathname.split("/").slice(1) ?? [];
	}, [pathname, currentProject]);

	const isLoading = isProjectPath && isProjectLoading;

	return (
		<div className="flex items-center justify-between p-4 border-b border-border">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<SidebarTrigger />
					</BreadcrumbItem>
					{isLoading ? (
						<BreadcrumbPage>
							<Skeleton className="w-20 h-4" />
						</BreadcrumbPage>
					) : (
						breadcrumbItems.flatMap((item, index, array) => {
							const isLast = index === array.length - 1;
							return [
								<BreadcrumbSeparator key={`sep-${item}`} />,
								<BreadcrumbItem key={`item-${item}`}>
									{isLast ? (
										<BreadcrumbPage>
											{item
												.replace(/-/g, " ")
												.replace(/\b\w/g, (char) => char.toUpperCase())}
										</BreadcrumbPage>
									) : (
										<BreadcrumbLink
											href={`/${breadcrumbItems.slice(0, index + 1).join("/")}`}
										>
											{item
												.replace(/-/g, " ")
												.replace(/\b\w/g, (char) => char.toUpperCase())}
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>,
							];
						})
					)}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
};

export default AppTopbar;

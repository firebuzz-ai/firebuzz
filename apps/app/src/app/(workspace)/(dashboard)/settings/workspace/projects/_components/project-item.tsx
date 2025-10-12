import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@firebuzz/ui/components/ui/alert-dialog";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	ArrowRightLeft,
	MoreHorizontal,
	Settings,
	Trash,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useProjectModal } from "@/hooks/ui/use-project-modal";

export const ProjectItem = ({
	project,
	isCurrent,
}: {
	project: Doc<"projects">;
	isCurrent: boolean;
}) => {
	const [, setProjectModal] = useProjectModal();
	const { changeProject } = useProject();
	const { currentWorkspace } = useWorkspace();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const deleteProject = useMutation(
		api.collections.projects.mutations.deletePermanent,
	);

	const handleEdit = () => {
		setProjectModal({ edit: { project } });
	};

	const handleSwitch = () => {
		changeProject(project._id);
	};

	const handleDelete = async () => {
		try {
			await deleteProject({ id: project._id });
			toast.success("Project deleted successfully");
			setShowDeleteDialog(false);
		} catch (error) {
			toast.error("Failed to delete project");
			console.error("Delete project error:", error);
		}
	};

	return (
		<>
			<Card className="relative transition-all duration-200 cursor-pointer group hover:shadow-md bg-muted">
				<CardContent className="p-4">
					<div className="space-y-3 w-full min-w-0">
						{/* Top */}
						<div className="flex gap-2 items-center">
							<ColoredIconPreview
								// @ts-expect-error
								icon={project.icon}
								// @ts-expect-error
								color={project.color}
								iconClassName="size-5"
								className="size-8"
							/>

							{/* Project name */}
							<div className="flex-1 min-w-0 leading-none">
								<h3 className="font-medium truncate" title={project.title}>
									{project.title}
								</h3>
								<div className="text-xs text-muted-foreground">
									{currentWorkspace?.title}
								</div>
							</div>

							{/* Right Part */}
							<div className="flex gap-2 items-center">
								{isCurrent && (
									<Badge variant="brand" className="text-xs">
										Current
									</Badge>
								)}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="iconXs"
											onClick={(e) => {
												e.stopPropagation();
											}}
										>
											<MoreHorizontal className="size-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent side="bottom" align="end">
										<DropdownMenuItem onClick={handleEdit}>
											<Settings className="size-3.5" />
											Edit Project
										</DropdownMenuItem>
										<DropdownMenuItem onClick={handleSwitch}>
											<ArrowRightLeft className="size-3.5" />
											Switch Project
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => setShowDeleteDialog(true)}
											className="text-destructive focus:text-destructive"
										>
											<Trash className="size-3.5" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Are you sure you want to delete this project?
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							All campaigns, landing pages, and associated data will be
							permanently deleted.
							<span className="font-medium"> This action is irreversible.</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Project
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

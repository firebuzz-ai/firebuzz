"use client";

import { useProject } from "@/hooks/auth/use-project";
import type { Id } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useMemo } from "react";

interface ProjectSelectionProps {
	deleteAmount: number;
	selectedProjects: Id<"projects">[];
	onSelectionChange: (selectedProjects: Id<"projects">[]) => void;
	onConfirm: () => void;
	onCancel: () => void;
	isLoading: boolean;
}

export const ProjectSelection = ({
	deleteAmount,
	selectedProjects,
	onSelectionChange,
	onConfirm,
	onCancel,
	isLoading,
}: ProjectSelectionProps) => {
	const { projects, currentProject } = useProject();

	// Filter out current project (cannot be deleted)
	const selectableProjects = useMemo(() => {
		return (
			projects?.filter((project) => project._id !== currentProject?._id) || []
		);
	}, [projects, currentProject]);

	const handleProjectToggle = (projectId: Id<"projects">) => {
		if (selectedProjects.includes(projectId)) {
			onSelectionChange(selectedProjects.filter((id) => id !== projectId));
		} else {
			if (selectedProjects.length < deleteAmount) {
				onSelectionChange([...selectedProjects, projectId]);
			}
		}
	};

	const isSelectionComplete = selectedProjects.length === deleteAmount;

	if (!selectableProjects.length) {
		return (
			<div className="space-y-4">
				<div className="p-6 text-sm text-center text-muted-foreground">
					No projects available for deletion.
				</div>
				<div className="flex justify-between items-center px-4 py-4 border-t">
					<Button
						size="sm"
						className="w-full"
						variant="outline"
						onClick={onCancel}
					>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="px-4 pt-4">
				<h3 className="text-sm font-medium">Select Projects to Delete</h3>
				{currentProject && (
					<p className="mt-1 text-xs text-muted-foreground">
						Note: Your current project "{currentProject.title}" cannot be
						deleted.
					</p>
				)}
			</div>

			{/* Project List */}
			<div className="overflow-y-auto px-4 space-y-2 max-h-64">
				{selectableProjects.map((project) => {
					const isSelected = selectedProjects.includes(project._id);
					const isDisabled =
						!isSelected && selectedProjects.length >= deleteAmount;

					return (
						<div
							key={project._id}
							className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
								isSelected
									? "bg-destructive/10 border-destructive/20"
									: "hover:bg-muted/50"
							} ${isDisabled ? "opacity-50" : ""}`}
						>
							<Checkbox
								checked={isSelected}
								onCheckedChange={() => handleProjectToggle(project._id)}
								disabled={isDisabled}
							/>

							<ColoredIconPreview
								// @ts-ignore
								icon={project.icon}
								// @ts-ignore
								color={project.color}
								iconClassName="size-4"
								className="size-8"
							/>

							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{project.title}</p>
								<p className="text-xs truncate text-muted-foreground">
									Project
								</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* Selection Status */}
			<div className="text-xs text-center text-muted-foreground">
				{selectedProjects.length} of {deleteAmount} project
				{deleteAmount > 1 ? "s" : ""} selected
			</div>

			{/* Actions */}
			<div className="flex justify-between items-center px-4 py-4 border-t">
				<Button
					onClick={onConfirm}
					size="sm"
					disabled={!isSelectionComplete || isLoading}
					variant="destructive"
					className="w-full"
				>
					{isLoading ? (
						<Spinner size="xs" />
					) : (
						`Delete ${deleteAmount} Project${deleteAmount > 1 ? "s" : ""}`
					)}
				</Button>
			</div>
		</div>
	);
};

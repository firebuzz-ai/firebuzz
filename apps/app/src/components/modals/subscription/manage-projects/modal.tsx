"use client";

import {
	api,
	ConvexError,
	type Id,
	useAction,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowLeft, Minus, Plus } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useProject } from "@/hooks/auth/use-project";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useManageProjects } from "@/hooks/ui/use-manage-projects";
import { ProjectSelection } from "./project-selection";

type ModalStep = "projects" | "selection";

export const ManageProjectsModal = () => {
	const [state, setState] = useManageProjects();
	const {
		baseProjectsCount,
		extraProjectsCount: currentExtraProjects,
		projectLimit,
		interval,
	} = useSubscription();
	const { projects } = useProject();
	const { user } = useUser();
	const [isLoading, setIsLoading] = useState(false);
	const [currentStep, setCurrentStep] = useState<ModalStep>("projects");
	const [selectedProjectsToDelete, setSelectedProjectsToDelete] = useState<
		Id<"projects">[]
	>([]);

	const isAdmin = useMemo(() => {
		return user?.currentRole === "org:admin";
	}, [user]);

	// Get available project add-on products
	const { data: availableProducts } = useCachedRichQuery(
		api.collections.stripe.products.queries.getAddOnProducts,
		{},
	);

	// Current project count from projects
	const currentProjectCount = useMemo(() => {
		return projects?.length || 0;
	}, [projects]);

	// New extra projects state (local UI state)
	const [newExtraProjects, setNewExtraProjects] =
		useState(currentExtraProjects);

	// New total project limit
	const newProjectLimit = useMemo(() => {
		return projectLimit + newExtraProjects;
	}, [projectLimit, newExtraProjects]);

	// Get project add-on pricing
	const projectAddOnProduct = useMemo(() => {
		const product = availableProducts?.find(
			(product) =>
				product.metadata?.type === "add-on" &&
				product.metadata?.addonType === "extra-project",
		);

		return product;
	}, [availableProducts]);

	const subscriptionIntervalPrice = useMemo(() => {
		if (!projectAddOnProduct?.prices) return null;
		return projectAddOnProduct.prices.find(
			(price) => price.interval === interval && price.active,
		);
	}, [projectAddOnProduct, interval]);

	const pricePerProject = useMemo(() => {
		if (!subscriptionIntervalPrice?.unitAmount) return 0;
		return subscriptionIntervalPrice.unitAmount / 100;
	}, [subscriptionIntervalPrice]);

	const currentTotalPrice = useMemo(() => {
		return pricePerProject * currentExtraProjects;
	}, [pricePerProject, currentExtraProjects]);

	const newTotalPrice = useMemo(() => {
		return pricePerProject * newExtraProjects;
	}, [pricePerProject, newExtraProjects]);

	const priceDifference = useMemo(() => {
		return newTotalPrice - currentTotalPrice;
	}, [newTotalPrice, currentTotalPrice]);

	const isDecreasing = useMemo(() => {
		return newProjectLimit < projectLimit;
	}, [newProjectLimit, projectLimit]);

	const requiresProjectDeletion = useMemo(() => {
		return isDecreasing && newProjectLimit < currentProjectCount;
	}, [isDecreasing, newProjectLimit, currentProjectCount]);

	const deleteAmount = useMemo(() => {
		return requiresProjectDeletion ? currentProjectCount - newProjectLimit : 0;
	}, [requiresProjectDeletion, currentProjectCount, newProjectLimit]);

	const updateProjects = useAction(api.lib.stripe.updateProjectAddOns);
	const deleteProject = useMutation(
		api.collections.projects.mutations.deletePermanent,
	);

	useHotkeys(
		"meta+s",
		async () => {
			if (currentStep === "projects") {
				await handleProjectsStep();
			} else if (currentStep === "selection") {
				await handleSelectionStep();
			}
		},
		{
			preventDefault: true,
			enabled: state.manageProjects ?? false,
		},
	);

	const handleProjectsStep = async () => {
		if (!isAdmin) {
			toast.error("You are not authorized to manage projects.", {
				description: "Please contact your administrator to manage projects.",
				id: "manage-projects",
			});
			return;
		}

		if (newExtraProjects === currentExtraProjects) {
			toast.error("No changes made to project count.", {
				description: "Please adjust the number of projects.",
				id: "manage-projects",
			});
			return;
		}

		if (newExtraProjects < 0) {
			toast.error("Cannot have negative extra projects.", {
				description: "Please select a valid number of extra projects.",
				id: "manage-projects",
			});
			return;
		}

		// If decreasing projects and requires project deletion, go to project selection
		if (requiresProjectDeletion) {
			setCurrentStep("selection");
			return;
		}

		// If just changing projects without deletion, update directly
		try {
			setIsLoading(true);

			await updateProjects({
				newExtraProjectCount: newExtraProjects,
			});

			toast.success("Projects updated successfully!", {
				description: `${newProjectLimit} project${newProjectLimit > 1 ? "s" : ""} available.`,
				id: "manage-projects",
			});

			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update projects.", {
					description: error.data,
					id: "manage-projects",
				});
			} else {
				toast.error("Failed to update projects.", {
					description: "Please try again.",
					id: "manage-projects",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleSelectionStep = async () => {
		if (!isAdmin) {
			toast.error("You are not authorized to manage projects.", {
				description: "Please contact your administrator to manage projects.",
				id: "manage-projects",
			});
			return;
		}

		if (selectedProjectsToDelete.length !== deleteAmount) {
			toast.error("Please select the required number of projects.", {
				description: `You need to select ${deleteAmount} project${deleteAmount > 1 ? "s" : ""} to delete.`,
				id: "manage-projects",
			});
			return;
		}

		try {
			setIsLoading(true);

			// Delete selected projects first
			for (const projectId of selectedProjectsToDelete) {
				await deleteProject({ id: projectId });
			}

			// Then update project count
			await updateProjects({
				newExtraProjectCount: newExtraProjects,
			});

			toast.success("Projects updated successfully!", {
				description: `${newProjectLimit} project${newProjectLimit > 1 ? "s" : ""} available, ${deleteAmount} project${deleteAmount > 1 ? "s" : ""} deleted.`,
				id: "manage-projects",
			});

			setState(null);
		} catch (error) {
			console.error(error);
			if (error instanceof ConvexError) {
				toast.error("Failed to update projects and delete selected projects.", {
					description: error.data,
					id: "manage-projects",
				});
			} else {
				toast.error("Failed to update projects and delete selected projects.", {
					description: "Please try again.",
					id: "manage-projects",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToProjects = () => {
		setCurrentStep("projects");
		setSelectedProjectsToDelete([]);
	};

	const handleCancel = () => {
		setState(null);
	};

	if (!state.manageProjects) return null;

	return (
		<Dialog
			open={state.manageProjects ?? false}
			onOpenChange={(value) => {
				setState(value ? { manageProjects: true } : null);
			}}
		>
			<DialogContent
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="sm:max-w-lg w-full flex flex-col !gap-0 !p-0"
			>
				<DialogHeader className="px-4 py-4 border-b">
					<div className="w-full">
						<div className="flex gap-2 items-center">
							{currentStep === "selection" && (
								<Button
									variant="ghost"
									size="iconXs"
									onClick={handleBackToProjects}
									disabled={isLoading}
								>
									<ArrowLeft className="w-4 h-4" />
								</Button>
							)}
							<DialogTitle>
								{currentStep === "projects"
									? "Manage Projects"
									: "Select Projects to Delete"}
							</DialogTitle>
						</div>
						<DialogDescription>
							{currentStep === "projects"
								? "Adjust the number of projects available for your workspace."
								: "Choose which projects to delete when decreasing project limit."}
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="flex flex-col">
					{currentStep === "projects" ? (
						<div className="px-4 py-4 space-y-4">
							{/* Current Plan Info */}
							<div className="p-4 rounded-lg border bg-muted">
								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Base Projects</span>
										<span className="text-sm">{baseProjectsCount}</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Extra Projects</span>
										<span className="text-sm">{currentExtraProjects}</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">
											Current Projects
										</span>
										<span className="text-sm">{currentProjectCount}</span>
									</div>
									<Separator />
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">
											Price per Extra Project
										</span>
										<span className="text-sm">
											${pricePerProject.toFixed(2)}/{interval}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Current Total</span>
										<span className="text-sm font-semibold">
											${currentTotalPrice.toFixed(2)}/{interval}
										</span>
									</div>
								</div>
							</div>

							{/* Project Selector */}
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Extra Projects</span>
									<div className="flex gap-3 items-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												const newValue = Math.max(0, newExtraProjects - 1);
												setNewExtraProjects(newValue);
											}}
											disabled={newExtraProjects <= 0 || isLoading}
										>
											<Minus className="w-4 h-4" />
										</Button>
										<span className="text-lg font-semibold min-w-[2ch] text-center">
											{newExtraProjects}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												const newValue = newExtraProjects + 1;
												setNewExtraProjects(newValue);
											}}
											disabled={isLoading}
										>
											<Plus className="w-4 h-4" />
										</Button>
									</div>
								</div>
								<div className="text-xs text-muted-foreground">
									Total projects: {newProjectLimit} ({baseProjectsCount} base +{" "}
									{newExtraProjects} extra)
								</div>
							</div>

							{/* Price Summary */}
							<div className="p-4 space-y-2 rounded-lg border">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">New Total</span>
									<span className="text-sm font-semibold">
										${newTotalPrice.toFixed(2)}/{interval}
									</span>
								</div>
								{priceDifference !== 0 && (
									<>
										<div className="flex justify-between items-center">
											<span className="text-sm font-medium">
												{priceDifference > 0 ? "Additional Cost" : "Savings"}
											</span>
											<span
												className={`text-sm font-semibold ${
													priceDifference > 0
														? "text-red-600"
														: "text-emerald-600"
												}`}
											>
												{priceDifference > 0 ? "+" : ""}$
												{priceDifference.toFixed(2)}/{interval}
											</span>
										</div>
										<Separator />
										<div className="space-y-1">
											<p className="text-xs font-medium text-muted-foreground">
												💡 Billing Impact
											</p>
											<p className="text-xs text-muted-foreground">
												{priceDifference > 0
													? "You'll be charged a prorated amount for the remaining days in your current billing period."
													: "You'll receive a prorated credit for the remaining days in your current billing period."}
											</p>
										</div>
									</>
								)}
							</div>

							{/* Warning for project deletion */}
							{requiresProjectDeletion && (
								<InfoBox variant="destructive">
									<p className="text-sm font-medium">
										You will need to delete {deleteAmount} project
										{deleteAmount > 1 ? "s" : ""}
									</p>
									<p className="text-xs text-muted-foreground">
										You currently have {currentProjectCount} projects but are
										reducing to {newProjectLimit} projects.
									</p>
								</InfoBox>
							)}

							{/* Info for project decrease without deletion */}
							{isDecreasing && !requiresProjectDeletion && (
								<InfoBox variant="default">
									<p className="text-sm font-medium">
										No project deletion required
									</p>
									<p className="text-xs text-muted-foreground">
										You have {currentProjectCount} projects and will have{" "}
										{newProjectLimit} projects available.
									</p>
								</InfoBox>
							)}
						</div>
					) : (
						<ProjectSelection
							deleteAmount={deleteAmount}
							selectedProjects={selectedProjectsToDelete}
							onSelectionChange={setSelectedProjectsToDelete}
							onConfirm={handleSelectionStep}
							onCancel={handleBackToProjects}
							isLoading={isLoading}
						/>
					)}
				</div>

				{/* Footer - only show for projects step */}
				{currentStep === "projects" && (
					<div className="px-4 py-4 pt-4 border-t">
						<Button
							size="sm"
							variant="outline"
							className="w-full"
							onClick={
								currentStep === "projects" ? handleProjectsStep : handleCancel
							}
							disabled={isLoading || newExtraProjects === currentExtraProjects}
						>
							{isLoading ? (
								<Spinner size="xs" />
							) : (
								<>
									{requiresProjectDeletion
										? "Continue to Project Selection"
										: "Update Projects"}
									<ButtonShortcut>⌘S</ButtonShortcut>
								</>
							)}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

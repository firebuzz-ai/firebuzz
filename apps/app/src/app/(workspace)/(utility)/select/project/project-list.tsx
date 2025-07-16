"use client";

import { ProjectModal } from "@/components/modals/projects/project-modal";
import { useRouterContext } from "@/components/providers/workspace/router";
import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useProjectModal } from "@/hooks/ui/use-project-modal";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import type { ColorPickerColorType } from "@firebuzz/ui/components/ui/color-picker";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import type { IconPickerIconType } from "@firebuzz/ui/components/ui/icon-picker";
import {
	ArrowRightIcon,
	ArrowRightLeft,
	Plus,
} from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import Link from "next/link";

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.2,
		},
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

const header = {
	hidden: { opacity: 0, y: -20 },
	show: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
		},
	},
};

export const ProjectList = () => {
	const { projects, changeProject } = useProject();
	const { currentWorkspace } = useWorkspace();
	const [, setProjectModal] = useProjectModal();
	const { setIsCheckDone } = useRouterContext();

	const handleCreateProject = () => {
		setProjectModal({ create: true });
	};

	return (
		<>
			<div className="flex flex-col flex-1 justify-center items-center">
				<motion.div
					variants={container}
					initial="hidden"
					animate="show"
					className="container py-8 mx-auto max-w-2xl"
				>
					{/* Header */}
					<motion.div variants={header} className="">
						<h2 className="text-2xl font-bold tracking-tight">
							Select Project
						</h2>
						<p className="text-muted-foreground">
							Choose a project to continue or create a new one
						</p>
					</motion.div>

					{/* Project List */}
					<motion.div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
						{projects.map((project) => (
							<motion.button
								key={project._id}
								variants={item}
								onClick={() => {
									changeProject(project._id);
									setIsCheckDone(false);
								}}
								className={buttonVariants({
									variant: "outline",
									className: "flex justify-start items-center h-12 text-left",
								})}
							>
								<ColoredIconPreview
									icon={project.icon as IconPickerIconType}
									color={project.color as ColorPickerColorType}
									iconClassName="size-5"
									className="size-8"
								/>
								<div className="flex flex-1 justify-between items-center">
									<div>
										<h3 className="font-semibold">{project.title}</h3>
										<p className="text-xs text-muted-foreground">
											{currentWorkspace?.title}
										</p>
									</div>
									<ArrowRightIcon className="size-3" />
								</div>
							</motion.button>
						))}
					</motion.div>

					{/* Buttons */}
					<motion.div
						className="flex gap-4 justify-between items-center mt-8 w-full"
						variants={item}
					>
						<button
							type="button"
							className={buttonVariants({
								variant: "outline",
								size: "sm",
								className: "flex flex-1 gap-2 justify-center items-center",
							})}
							onClick={handleCreateProject}
						>
							Create New Project <Plus className="size-3" />
						</button>
						<Link
							className={buttonVariants({
								variant: "outline",
								size: "sm",
								className: "flex flex-1 gap-2 justify-center items-center",
							})}
							href="/select/workspace"
						>
							Change Workspace <ArrowRightLeft className="size-3" />
						</Link>
					</motion.div>
				</motion.div>
			</div>
			<ProjectModal />
		</>
	);
};

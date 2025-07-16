"use client";

import { NewWorkspaceModal } from "@/components/modals/workspaces/workspace-modal";
import { useRouterContext } from "@/components/providers/workspace/router";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { useNewWorkspaceModal } from "@/hooks/ui/use-new-workspace-modal";
import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ArrowRightIcon, Plus } from "@firebuzz/ui/icons/lucide";
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

export const WorkspaceList = () => {
	const { workspaces, changeWorkspace } = useWorkspace();
	const [, setNewWorkspaceModal] = useNewWorkspaceModal();
	const { setIsCheckDone } = useRouterContext();
	const getWorkspaceInitials = (title: string) => {
		return title
			.split(" ")
			.map((word) => word[0])
			.join("");
	};

	const handleCreateWorkspace = () => {
		setNewWorkspaceModal({ create: true });
	};

	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	return (
		<>
			<motion.div
				variants={container}
				initial="hidden"
				animate="show"
				className="container py-8 mx-auto max-w-2xl"
			>
				{/* Header */}
				<motion.div variants={header} className="">
					<h2 className="text-2xl font-bold tracking-tight">
						Select Workspace
					</h2>
					<p className="text-muted-foreground">
						Choose a workspace to continue or create a new one
					</p>
				</motion.div>

				{/* Workspace List */}
				<motion.div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
					{workspaces.map((workspace) => (
						<motion.button
							key={workspace._id}
							variants={item}
							onClick={() => {
								changeWorkspace(workspace._id);
								setIsCheckDone(false);
							}}
							className={buttonVariants({
								variant: "outline",
								className: "flex justify-start items-center h-12 text-left",
							})}
						>
							<Avatar className="size-9">
								<AvatarImage
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${workspace.logo}`}
									alt="Logo preview"
								/>
								<AvatarFallback className="text-xs">
									{getWorkspaceInitials(workspace.title)}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-1 justify-between items-center">
								<div>
									<h3 className="font-semibold">{workspace.title}</h3>
									<p className="text-xs capitalize text-muted-foreground">
										{workspace.workspaceType}
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
						onClick={handleCreateWorkspace}
					>
						Create New Workspace <Plus className="size-3" />
					</button>
					<Link
						className={buttonVariants({
							variant: "outline",
							size: "sm",
							className: "flex flex-1 gap-2 justify-center items-center",
						})}
						href="/join/workspace"
					>
						Join a Team <ArrowRightIcon className="size-3" />
					</Link>
				</motion.div>
			</motion.div>
			<NewWorkspaceModal />
		</>
	);
};

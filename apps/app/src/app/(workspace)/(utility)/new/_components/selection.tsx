"use client";

import { AnimatedButton } from "@/components/reusables/animated-button";
import { useUser } from "@/hooks/auth/use-user";
import { useAuth } from "@clerk/nextjs";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ExternalLink, LogOut } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SelectionProps {
	handleFadeout: () => void;
}

export const Selection: React.FC<SelectionProps> = ({ handleFadeout }) => {
	const { signOut } = useAuth();
	const router = useRouter();
	const { user } = useUser();
	const [isVisible, setIsVisible] = useState(true);
	const [isCreating, setIsCreating] = useState(false);

	const createWorkspace = useMutation(
		api.collections.workspaces.mutations.createPersonalWorkspace,
	);

	const startFadeout = useCallback(() => {
		setIsVisible(false);
		handleFadeout();
	}, [handleFadeout]);

	const handleCreate = useCallback(async () => {
		setIsCreating(true);
		try {
			// Create workspace
			await createWorkspace({
				title: `${user?.firstName ?? "My"} Workspace`,
			});

			startFadeout();
		} catch (error) {
			console.log(error);
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else {
				toast.error("An error occurred while creating your workspace");
			}
		} finally {
			setIsCreating(false);
		}
	}, [createWorkspace, startFadeout, user]);

	const handleJoin = useCallback(() => {
		router.push("/join");
	}, [router]);

	useHotkeys("enter", handleCreate);
	useHotkeys("meta+j", handleJoin);

	const renderSelectionView = () => (
		<motion.div
			key="selection"
			initial={{ opacity: 0, y: 50, scale: 0.9 }}
			animate={{
				opacity: 1,
				y: 0,
				scale: 1,
				transition: { duration: 0.6, ease: "easeOut", delay: 0.4 },
			}}
			exit={{ opacity: 0, y: -50, scale: 0.9 }}
			className="relative z-20 space-y-8 text-center"
		>
			<div className="space-y-4">
				{/* Brand Icon */}
				<div className="flex justify-center">
					<div className="flex justify-center items-center p-2 rounded-lg border size-16 bg-muted">
						<Icon className="size-10" />
					</div>
				</div>

				<div className="space-y-1">
					<h1 className="text-4xl font-bold tracking-tight">
						Welcome to Firebuzz
					</h1>
					<p className="text-lg text-muted-foreground">
						How would you like to get started?
					</p>
				</div>
			</div>

			<div className="space-y-4">
				<AnimatedButton
					disabled={isCreating}
					className="flex gap-2 items-center w-full"
					variant="outline"
					onClick={handleCreate}
				>
					{isCreating ? (
						<div className="flex gap-2 items-center">
							<Spinner size="sm" className="mb-0.5" />
							Creating...
						</div>
					) : (
						<>
							Create a Workspace
							<ButtonShortcut>Return</ButtonShortcut>
						</>
					)}
				</AnimatedButton>

				<div className="flex gap-4 items-center">
					<div className="flex-1 h-px bg-border" />
					<span className="text-sm text-muted-foreground">or</span>
					<div className="flex-1 h-px bg-border" />
				</div>

				<Button className="w-full" variant="outline" onClick={handleJoin}>
					Join a Workspace <ButtonShortcut>⌘+J</ButtonShortcut>
				</Button>
			</div>

			<div className="pt-8 space-y-4">
				<p className="text-xs text-muted-foreground">
					You can always switch between workspaces or create new later
				</p>
			</div>
		</motion.div>
	);

	return (
		<div className="flex relative z-10 flex-col flex-1 px-4">
			{/* Main content container */}
			<div className="flex flex-col flex-1 justify-center items-center">
				<div className="w-full max-w-sm">
					<AnimatePresence mode="wait">
						{isVisible && renderSelectionView()}

						{isVisible && (
							<motion.div
								key="footer"
								initial={{ opacity: 0, y: 50 }}
								animate={{
									opacity: 1,
									y: 0,
									transition: { duration: 0.3, ease: "easeOut", delay: 0.6 },
								}}
								exit={{ opacity: 0 }}
								className="absolute right-4 left-4 bottom-10 z-10"
							>
								<div className="flex overflow-hidden items-stretch mx-auto w-full max-w-sm h-full rounded-lg border bg-muted">
									<Button
										onClick={() => signOut()}
										size="sm"
										variant="outline"
										className="w-full text-xs rounded-none border-none text-muted-foreground"
									>
										Log out <LogOut className="!size-3" />
									</Button>
									<div className="w-[2px] h-8 bg-border" />
									<Button
										onClick={() =>
											window.open("https://firebuzz.com", "_blank")
										}
										size="sm"
										variant="outline"
										className="w-full text-xs rounded-none border-none text-muted-foreground"
									>
										Go to firebuzz.com <ExternalLink className="!size-3" />
									</Button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};

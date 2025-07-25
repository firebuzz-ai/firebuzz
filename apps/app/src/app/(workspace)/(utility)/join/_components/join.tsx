"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import type { UserOrganizationInvitationResource } from "@clerk/types";
import { api, useMutation } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ArrowLeft, ExternalLink, LogOut } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { memo, useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const Join: React.FC = memo(() => {
	const { signOut } = useAuth();
	const router = useRouter();
	const [isJoining, setIsJoining] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const updateUserCurrentWorkspace = useMutation(
		api.collections.users.mutations.updateCurrentWorkspaceByExternalId,
	);

	const { userInvitations, userMemberships, setActive } = useOrganizationList({
		userInvitations: {
			infinite: true,
			status: "pending",
			pageSize: 5,
		},
		userMemberships: true,
	});

	const handleBack = useCallback(() => {
		router.push("/new");
	}, [router]);

	const handleRefresh = useCallback(async () => {
		if (userInvitations?.revalidate) {
			setIsRefreshing(true);
			await userInvitations.revalidate();
			setIsRefreshing(false);
		}
	}, [userInvitations]);

	const handleAcceptInvitation = useCallback(
		async (invitation: UserOrganizationInvitationResource) => {
			try {
				setIsJoining(true);
				toast.loading("Accepting invitation...", { id: "accept-invitation" });

				await invitation.accept();

				if (userMemberships?.revalidate && setActive) {
					const membershipPromise = userMemberships.revalidate();
					const updatePromise = updateUserCurrentWorkspace({
						currentWorkspaceExternalId: invitation.publicOrganizationData.id,
					});

					const setActivePromise = setActive({
						organization: invitation.publicOrganizationData.id,
					});

					await Promise.all([
						membershipPromise,
						updatePromise,
						setActivePromise,
					]);
				}

				toast.success("Invitation accepted!", { id: "accept-invitation" });

				router.push("/select/project");

				setIsJoining(false);
			} catch (error) {
				console.error("Error accepting invitation:", error);
				toast.error("Failed to accept invitation", { id: "accept-invitation" });
				setIsJoining(false);
			}
		},
		[userMemberships, updateUserCurrentWorkspace, router, setActive],
	);

	useHotkeys("escape", handleBack);

	return (
		<div className="flex relative z-10 flex-col flex-1 px-4">
			{/* Main content container */}
			<div className="flex flex-col flex-1 justify-center items-center">
				<div className="w-full max-w-sm">
					<AnimatePresence mode="wait">
						<motion.div
							key="join"
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
										Join a Workspace
									</h1>
									<p className="text-lg text-muted-foreground">
										Select a workspace invitation to join
									</p>
								</div>
							</div>

							<div className="space-y-4">
								{userInvitations?.data?.length ? (
									userInvitations.data.map((invitation) => (
										<Button
											key={invitation.id}
											onClick={() => handleAcceptInvitation(invitation)}
											disabled={isJoining}
											className="w-full"
											variant="outline"
										>
											{isJoining ? (
												<div className="flex gap-2 items-center">
													<Spinner size="sm" className="mb-0.5" />
													Joining...
												</div>
											) : (
												<>Join {invitation.publicOrganizationData.name}</>
											)}
										</Button>
									))
								) : (
									<div className="py-8 text-center">
										<p className="text-muted-foreground">
											No workspace invitations found. You can contact your
											manager to get an invitation or go back to create your own
											workspace.
										</p>
									</div>
								)}

								<div className="flex gap-4 pt-4">
									<Button
										variant="outline"
										size="sm"
										onClick={handleBack}
										className="flex gap-2 items-center w-full"
									>
										<ArrowLeft className="size-3.5" />
										Back to selection <ButtonShortcut>Esc</ButtonShortcut>
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										className="flex gap-2 items-center w-full"
									>
										{isRefreshing ? (
											<div className="flex gap-2 items-center">
												<Spinner size="sm" className="mb-0.5" />
												Refreshing...
											</div>
										) : (
											<>
												Refresh <ButtonShortcut>⌘+R</ButtonShortcut>
											</>
										)}
									</Button>
								</div>
							</div>
						</motion.div>

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
									onClick={() => window.open("https://firebuzz.com", "_blank")}
									size="sm"
									variant="outline"
									className="w-full text-xs rounded-none border-none text-muted-foreground"
								>
									Go to firebuzz.com <ExternalLink className="!size-3" />
								</Button>
							</div>
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
});

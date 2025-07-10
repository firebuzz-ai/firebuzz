"use client";

import { useUser } from "@clerk/nextjs";
import type { ExternalAccountResource } from "@clerk/types";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	CheckCheck,
	MoreHorizontal,
	Trash,
	XCircle,
} from "@firebuzz/ui/icons/lucide";
import { AppleCustomIcon, GoogleIcon } from "@firebuzz/ui/icons/social";
import { useState } from "react";

const getProviderIcon = (provider: string) => {
	switch (provider) {
		case "google":
			return <GoogleIcon />;
		case "apple":
			return <AppleCustomIcon />;
		default:
			return null;
	}
};

export const SocialConnections = () => {
	const { user, isLoaded } = useUser();
	const [isRemoving, setIsRemoving] = useState<string | null>(null);

	const handleRemoveConnection = async (
		externalAccount: ExternalAccountResource,
	) => {
		setIsRemoving(externalAccount.id);
		try {
			await externalAccount.destroy();
			await user?.reload();
		} catch (error) {
			console.error("Error removing connection:", error);
		} finally {
			setIsRemoving(null);
		}
	};

	if (!isLoaded) {
		return (
			<div className="flex justify-center items-center p-6">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	const connectedAccounts = user.externalAccounts.filter(
		(account) => account.provider === "google" || account.provider === "apple",
	);

	return (
		<div className="p-6 space-y-6 w-full border-b">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Social accounts</h2>
				<p className="text-sm text-muted-foreground">
					Manage your linked social accounts for sign-in.
				</p>
			</div>

			<div className="max-w-xl">
				{/* Connected Accounts */}
				{connectedAccounts.length > 0 ? (
					<div className="space-y-3">
						{connectedAccounts.map((externalAccount) => {
							const isVerified =
								externalAccount.verification?.status === "verified";
							const isCurrentlyRemoving = isRemoving === externalAccount.id;

							return (
								<Card
									key={externalAccount.id}
									className="transition-all duration-200 hover:shadow-md bg-muted"
								>
									<CardContent className="p-4">
										<div className="space-y-3 w-full min-w-0">
											{/* Top */}
											<div className="flex gap-3 items-center">
												<div className="flex justify-center items-center p-2 rounded-md border bg-muted size-10">
													{getProviderIcon(externalAccount.provider)}
												</div>

												{/* Provider Info */}
												<div className="flex flex-col flex-1 min-w-0">
													<div className="flex gap-2 items-center">
														<h3 className="font-medium capitalize">
															{externalAccount.provider}
														</h3>
														<Tooltip>
															<TooltipTrigger className="p-1 rounded-md border bg-muted">
																{isVerified ? (
																	<CheckCheck className="size-3.5 text-emerald-500" />
																) : (
																	<XCircle className="size-3.5 text-amber-500" />
																)}
															</TooltipTrigger>
															<TooltipContent>
																{isVerified ? "Verified" : "Unverified"}
															</TooltipContent>
														</Tooltip>
													</div>
													<p className="text-sm text-muted-foreground">
														{externalAccount.emailAddress ||
															`${externalAccount.provider} account`}
													</p>
												</div>

												{/* Right Part */}
												<div className="flex gap-2 items-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="iconXs"
																disabled={isCurrentlyRemoving}
															>
																{isCurrentlyRemoving ? (
																	<Spinner size="xs" />
																) : (
																	<MoreHorizontal className="size-3.5" />
																)}
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent side="bottom" align="end">
															<DropdownMenuItem
																onClick={() =>
																	handleRemoveConnection(externalAccount)
																}
																className="text-destructive focus:text-destructive"
															>
																<Trash className="size-3.5" />
																Remove connection
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				) : (
					<div className="p-8 text-center text-muted-foreground">
						<p>No social accounts connected</p>
						<p className="text-sm">
							You can connect social accounts during sign-in
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

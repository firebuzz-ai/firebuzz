"use client";

import { useConfigureDomainModal } from "@/hooks/ui/use-configure-domain-modal";
import { type Doc, api, useAction, useCachedQuery } from "@firebuzz/convex";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	CheckCheck,
	Clock,
	Globe,
	MoreHorizontal,
	RefreshCw,
	Settings,
	Shield,
	ShieldCheck,
	Trash,
	XCircle,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

interface DomainItemProps {
	domain: Doc<"domains">;
}

export const DomainItem = ({ domain }: DomainItemProps) => {
	const [, setConfigureModal] = useConfigureDomainModal();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const deleteDomain = useAction(
		api.collections.domains.actions.deleteCustomDomain,
	);

	const syncWithCloudflare = useAction(
		api.collections.domains.actions.syncWithCloudflare,
	);

	// Fetch project information
	const projectData = useCachedQuery(api.collections.projects.queries.getById, {
		id: domain.projectId,
	});

	const statusIcon = useMemo(() => {
		const getIconComponent = () => {
			switch (domain.status) {
				case "active":
					return <CheckCheck className="text-emerald-500 size-3.5" />;
				case "pending":
					return <Clock className="text-yellow-500 size-3.5" />;
				case "blocked":
				case "test_blocked":
				case "test_failed":
					return <XCircle className="text-red-500 size-3.5" />;
				default:
					return <Clock className="text-gray-500 size-3.5" />;
			}
		};

		return (
			<AnimatePresence mode="wait">
				<motion.div
					key={domain.status}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="flex justify-center items-center"
				>
					{getIconComponent()}
				</motion.div>
			</AnimatePresence>
		);
	}, [domain.status]);

	const sslStatusIcon = useMemo(() => {
		const getIconComponent = () => {
			switch (domain.sslStatus) {
				case "active":
				case "staging_active":
					return <ShieldCheck className="text-emerald-500 size-3.5" />;
				case "pending_validation":
				case "pending_issuance":
				case "pending_deployment":
					return <Clock className="text-yellow-500 size-3.5" />;
				case "expired":
				case "deleted":
					return <XCircle className="text-red-500 size-3.5" />;
				default:
					return <Shield className="text-gray-500 size-3.5" />;
			}
		};

		return (
			<AnimatePresence mode="wait">
				<motion.div
					key={domain.sslStatus}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="flex justify-center items-center"
				>
					{getIconComponent()}
				</motion.div>
			</AnimatePresence>
		);
	}, [domain.sslStatus]);

	const handleConfigure = () => {
		setConfigureModal({
			domain,
			isOpen: true,
		});
	};

	const handleDelete = async () => {
		try {
			await deleteDomain({ customDomainId: domain._id });
			toast.success("Domain deleted successfully");
			setShowDeleteDialog(false);
		} catch (error) {
			toast.error("Failed to delete domain");
			console.error("Delete domain error:", error);
		}
	};

	const handleRefresh = async (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsRefreshing(true);

		try {
			await syncWithCloudflare({ customDomainId: domain._id });
		} catch (error) {
			toast.error("Failed to sync domain status");
			console.error("Sync domain error:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<>
			<Card className="relative transition-all duration-200 group hover:shadow-md bg-muted">
				<CardContent className="p-4">
					<div className="space-y-3 w-full min-w-0">
						{/* Top */}
						<div className="flex gap-2 items-center">
							<div className="p-1 rounded-md border bg-muted">
								<Globe className="flex-shrink-0 text-muted-foreground size-3.5" />
							</div>

							{/* Domain name */}
							<div className="flex flex-1 gap-2 items-center min-w-0">
								<h3 className="font-medium truncate" title={domain.hostname}>
									{domain.hostname}
								</h3>
							</div>

							{/* Right Part */}
							<div className="flex gap-2 items-center">
								<Badge variant="outline" className="text-xs bg-muted">
									{projectData?.title}
								</Badge>
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
										<DropdownMenuItem onClick={handleConfigure}>
											<Settings className="size-3.5" />
											Configure
										</DropdownMenuItem>
										<DropdownMenuItem onClick={handleRefresh}>
											<RefreshCw className="size-3.5" />
											Verify
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
						<Separator className="w-full" />
						{/* Bottom */}
						<div className="flex-1 min-w-0">
							<div className="flex flex-1 gap-2 items-center mt-1">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="flex-1 !px-0 !py-0 flex gap-1 items-strech justify-start"
											onClick={handleRefresh}
											disabled={isRefreshing}
										>
											<div className="flex flex-shrink-0 justify-center items-center px-2 h-full border-r">
												{!isRefreshing ? (
													statusIcon
												) : (
													<Spinner size="xs" className="mb-0.5" />
												)}
											</div>
											<div className="pl-2 text-xs capitalize whitespace-nowrap">
												{domain.status === "active"
													? "Domain Verified"
													: domain.status === "blocked"
														? "Domain Blocked"
														: domain.status === "test_blocked"
															? "Domain Blocked"
															: domain.status === "test_failed"
																? "Failed"
																: "Pending"}
											</div>
										</Button>
									</TooltipTrigger>
									<TooltipContent>Check verification status</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="flex-1 !px-0 !py-0 flex gap-1 items-strech justify-start"
											onClick={handleRefresh}
											disabled={isRefreshing}
										>
											<div className="flex flex-shrink-0 justify-center items-center px-2 h-full border-r">
												{!isRefreshing ? (
													sslStatusIcon
												) : (
													<Spinner size="xs" className="mb-0.5" />
												)}
											</div>
											<div className="pl-2 text-xs capitalize whitespace-nowrap">
												{domain.sslStatus === "active"
													? "SSL Active"
													: domain.sslStatus === "expired"
														? "SSL Expired"
														: domain.sslStatus === "deleted"
															? "SSL Deleted"
															: "SSL Pending"}
											</div>
										</Button>
									</TooltipTrigger>
									<TooltipContent>Check SSL status</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Are you sure you want to delete this domain?
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							All landing pages published with this domain will become
							unreachable.
							<span className="font-medium"> This action is irreversible.</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Domain
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

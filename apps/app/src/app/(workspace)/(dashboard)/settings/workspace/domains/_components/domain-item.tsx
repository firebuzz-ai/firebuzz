"use client";

import { useConfigureDomainModal } from "@/hooks/ui/use-configure-domain-modal";
import { type Doc, type Id, api, useAction } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
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
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";

interface DomainItemProps {
	domain: Doc<"domains">;
	selected: boolean;
	setSelected: (fn: (prev: Id<"domains">[]) => Id<"domains">[]) => void;
}

export const DomainItem = ({
	domain,
	selected,
	setSelected,
}: DomainItemProps) => {
	const [, setConfigureModal] = useConfigureDomainModal();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const deleteDomain = useAction(
		api.collections.domains.actions.deleteCustomDomain,
	);

	const syncWithCloudflare = useAction(
		api.collections.domains.actions.syncWithCloudflare,
	);

	const statusIcon = useMemo(() => {
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
	}, [domain.status]);

	const sslStatusIcon = useMemo(() => {
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
	}, [domain.sslStatus]);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (e.metaKey || e.ctrlKey) {
			// Multi-select with cmd/ctrl
			setSelected((prev) => {
				if (prev.includes(domain._id)) {
					return prev.filter((id) => id !== domain._id);
				}
				return [...prev, domain._id];
			});
		} else {
			// Single select
			setSelected((prev) => {
				if (prev.includes(domain._id) && prev.length === 1) {
					return [];
				}
				return [domain._id];
			});
		}
	};

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setConfigureModal({
			domain,
			isOpen: true,
		});
	};

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
			toast.success("Domain status synced successfully");
		} catch (error) {
			toast.error("Failed to sync domain status");
			console.error("Sync domain error:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<Card
			className={cn(
				"group relative cursor-pointer transition-all duration-200 hover:shadow-md",
				selected && "ring-2 ring-brand shadow-md",
			)}
			onClick={handleClick}
			onDoubleClick={handleDoubleClick}
		>
			<CardContent className="p-4">
				<div className="flex justify-between items-start">
					<div className="space-y-2 w-full min-w-0">
						<div className="flex gap-2 items-center">
							<div className="p-1 rounded-md border bg-muted">
								<Globe className="flex-shrink-0 text-muted-foreground size-3.5" />
							</div>

							<h3 className="font-medium truncate" title={domain.hostname}>
								{domain.hostname}
							</h3>
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex gap-2 items-center mt-1">
								<div className="flex flex-1 gap-1 items-center">
									{statusIcon}
									<span className="text-xs capitalize whitespace-nowrap text-muted-foreground">
										Verification: {domain.status}
									</span>
								</div>
								<div className="flex flex-1 gap-1 items-center">
									{sslStatusIcon}
									<span className="text-xs capitalize whitespace-nowrap text-muted-foreground">
										SSL: {domain.sslStatus.replace("_", " ")}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex gap-1 items-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="iconXs"
									onClick={handleRefresh}
									disabled={isRefreshing}
								>
									<RefreshCw
										className={cn("size-3.5", isRefreshing && "animate-spin")}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="left">
								<p>Check Status</p>
							</TooltipContent>
						</Tooltip>

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
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleDelete}>
									<Trash className="size-3.5" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

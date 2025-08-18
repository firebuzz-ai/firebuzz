"use client";

import { useConfigureProjectDomainModal } from "@/hooks/ui/use-configure-project-domain-modal";
import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	CheckCheck,
	Globe2,
	MoreHorizontal,
	Settings,
	ShieldCheck,
} from "@firebuzz/ui/icons/lucide";

interface ProjectDomainItemProps {
	domain: Doc<"projectDomains">;
}

export const ProjectDomainItem = ({ domain }: ProjectDomainItemProps) => {
	const [, setModal] = useConfigureProjectDomainModal();

	const handleConfigure = () => {
		setModal({
			configure: true,
			domain,
		});
	};

	return (
		<Card className="relative transition-all duration-200 group hover:shadow-md bg-muted">
			<CardContent className="p-4">
				<div className="space-y-3 w-full min-w-0">
					{/* Top */}
					<div className="flex gap-2 items-center">
						<div className="p-1 rounded-md border bg-muted">
							<Globe2 className="flex-shrink-0 text-muted-foreground size-3.5" />
						</div>

						{/* Domain name */}
						<div className="flex flex-1 gap-2 items-center min-w-0">
							<h3
								className="font-medium truncate"
								title={`${domain.subdomain}.${domain.domain}`}
							>
								{domain.subdomain}.{domain.domain}
							</h3>
						</div>

						{/* Right Part */}
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
							</DropdownMenuContent>
						</DropdownMenu>
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
										className="flex-1 !px-0 !py-0 flex gap-1 items-strech justify-start pointer-events-none"
										disabled
									>
										<div className="flex flex-shrink-0 justify-center items-center px-2 h-full border-r">
											<CheckCheck className="text-emerald-500 size-3.5" />
										</div>
										<div className="pl-2 text-xs capitalize whitespace-nowrap">
											Domain Verified
										</div>
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									Project domain is always verified
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="flex-1 !px-0 !py-0 flex gap-1 items-strech justify-start pointer-events-none"
										disabled
									>
										<div className="flex flex-shrink-0 justify-center items-center px-2 h-full border-r">
											<ShieldCheck className="text-emerald-500 size-3.5" />
										</div>
										<div className="pl-2 text-xs capitalize whitespace-nowrap">
											SSL Active
										</div>
									</Button>
								</TooltipTrigger>
								<TooltipContent>SSL is automatically managed</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

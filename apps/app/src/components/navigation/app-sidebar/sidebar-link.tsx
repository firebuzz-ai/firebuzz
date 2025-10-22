"use client";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { SidebarMenuSubButton } from "@firebuzz/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const SidebarLink = ({
	href,
	label,
	icon,
	isComingSoon = false,
}: {
	href: string;
	label: string;
	icon?: React.ReactNode;
	isComingSoon?: boolean;
}) => {
	const pathname = usePathname();
	const isActive = pathname.startsWith(href);

	return (
		<SidebarMenuSubButton asChild isActive={isActive}>
			{isComingSoon ? (
				<div className="flex gap-2 items-center opacity-50 cursor-default select-none">
					{label}
					<Badge variant="outline">Soon</Badge>
				</div>
			) : (
				<Link href={href}>
					{icon && icon}
					{label}
				</Link>
			)}
		</SidebarMenuSubButton>
	);
};

"use client";
import { SidebarMenuSubButton } from "@firebuzz/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const SidebarLink = ({
	href,
	label,
	icon,
}: {
	href: string;
	label: string;
	icon?: React.ReactNode;
}) => {
	const pathname = usePathname();
	const isActive = pathname.startsWith(href);

	return (
		<SidebarMenuSubButton asChild isActive={isActive}>
			<Link href={href}>
				{icon && icon}
				{label}
			</Link>
		</SidebarMenuSubButton>
	);
};

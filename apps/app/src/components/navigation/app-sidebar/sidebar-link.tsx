"use client";
import { SidebarMenuSubButton } from "@firebuzz/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const SidebarLink = ({
	href,
	label,
}: {
	href: string;
	label: string;
}) => {
	const pathname = usePathname();
	const isActive = pathname === href;
	return (
		<SidebarMenuSubButton asChild isActive={isActive}>
			<Link href={href}>{label}</Link>
		</SidebarMenuSubButton>
	);
};

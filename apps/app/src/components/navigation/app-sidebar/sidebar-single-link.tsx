"use client";
import { SidebarMenuButton } from "@firebuzz/ui/components/ui/sidebar";
import Link from "next/link";

import { usePathname } from "next/navigation";
import type React from "react";

export const SidebarSingleLink = ({
	href,
	label,
	icon,
}: {
	href: string;
	label: string;
	icon: React.ReactNode;
}) => {
	const pathname = usePathname();
	const isActive = pathname.startsWith(href);
	return (
		<SidebarMenuButton asChild tooltip={label} isActive={isActive}>
			<Link href={href} className="flex items-center w-full gap-2">
				{icon && icon}
				{label}
			</Link>
		</SidebarMenuButton>
	);
};

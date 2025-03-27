"use client";
import { CollapsibleTrigger } from "@firebuzz/ui/components/ui/collapsible";
import { SidebarMenuButton } from "@firebuzz/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

export const SidebarGroupButton = forwardRef<
	HTMLButtonElement,
	{
		children: React.ReactNode;
		title: string;
		url: string;
	}
>(({ children, title, url }, ref) => {
	const pathname = usePathname();
	const isActive = pathname.startsWith(url);

	return (
		<CollapsibleTrigger asChild>
			<SidebarMenuButton ref={ref} tooltip={title} isActive={isActive}>
				{children}
			</SidebarMenuButton>
		</CollapsibleTrigger>
	);
});

SidebarGroupButton.displayName = "SidebarGroupButton";

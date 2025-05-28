"use client";
import { CollapsibleTrigger } from "@firebuzz/ui/components/ui/collapsible";
import {
  SidebarMenuButton,
  useSidebar,
} from "@firebuzz/ui/components/ui/sidebar";
import { ChevronRight } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

export const SidebarGroupButton = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    url: string;
    icon: React.ReactNode;
    hasChildren?: boolean;
  }
>(({ icon, title, url, hasChildren }, ref) => {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isActive = pathname.startsWith(url);

  if (state === "expanded") {
    return (
      <CollapsibleTrigger asChild>
        <SidebarMenuButton
          ref={ref}
          tooltip={title}
          isActive={isActive}
          hasChildren={hasChildren}
        >
          {icon && icon}
          <span>{title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
    );
  }

  return (
    <SidebarMenuButton asChild ref={ref} tooltip={title} isActive={isActive}>
      <Link href={url}>
        {icon && icon}
        <span>{title}</span>
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </Link>
    </SidebarMenuButton>
  );
});

SidebarGroupButton.displayName = "SidebarGroupButton";

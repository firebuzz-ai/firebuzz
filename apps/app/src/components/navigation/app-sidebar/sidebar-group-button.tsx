"use client";
import { CollapsibleTrigger } from "@firebuzz/ui/components/ui/collapsible";
import {
  SidebarMenuButton,
  useSidebar,
} from "@firebuzz/ui/components/ui/sidebar";
import { ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

export const SidebarGroupButton = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    url: string;
    icon: React.ReactNode;
  }
>(({ icon, title, url }, ref) => {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isActive =
    (pathname.startsWith(url) &&
      pathname.split("/").length === url.split("/").length) ||
    (state === "collapsed" && pathname.startsWith(url));

  if (state === "expanded") {
    return (
      <CollapsibleTrigger asChild>
        <SidebarMenuButton ref={ref} tooltip={title} isActive={isActive}>
          {icon && icon}
          <span>{title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </SidebarMenuButton>
      </CollapsibleTrigger>
    );
  }

  return (
    <SidebarMenuButton
      asChild
      ref={ref}
      tooltip={title}
      isActive={isActive}
      className={cn({ isActive: "!text-brand" })}
    >
      <Link className={cn({ isActive: "!text-brand" })} href={url}>
        {icon && icon}
        <span>{title}</span>
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </Link>
    </SidebarMenuButton>
  );
});

SidebarGroupButton.displayName = "SidebarGroupButton";

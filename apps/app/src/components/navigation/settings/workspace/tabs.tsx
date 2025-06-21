"use client";

import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import {
  AnimatedTabs,
  type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Building, FolderOpen, Globe, Users } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const TABS: TabItem[] = [
  {
    value: "general",
    href: "/settings/workspace/general",
    icon: Building,
    label: "General",
  },
  {
    value: "team",
    href: "/settings/workspace/team",
    icon: Users,
    label: "Team",
  },
  {
    value: "projects",
    href: "/settings/workspace/projects",
    icon: FolderOpen,
    label: "Projects",
  },
  {
    value: "domains",
    href: "/settings/workspace/domains",
    icon: Globe,
    label: "Domains",
  },
];

export const WorkspaceSettingsTabs = () => {
  const pathname = usePathname();
  const [, setNewDomainModal] = useNewDomainModal();

  const currentTab = useMemo(() => {
    if (pathname.includes("/domains")) return "domains";
    if (pathname.includes("/team")) return "team";
    if (pathname.includes("/projects")) return "projects";
    return "general";
  }, [pathname]);

  const buttonConfig = useMemo(() => {
    switch (currentTab) {
      case "domains":
        return {
          title: "Add Domain",
          show: true,
        };
      default:
        return {
          title: "",
          show: false,
        };
    }
  }, [currentTab]);

  const handleButtonClick = useCallback(() => {
    if (currentTab === "domains") {
      setNewDomainModal({ create: true });
    }
  }, [currentTab, setNewDomainModal]);

  // Handle keyboard shortcut ⌘N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "n" &&
        currentTab === "domains"
      ) {
        e.preventDefault();
        handleButtonClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleButtonClick, currentTab]);

  return (
    <div className="relative flex items-center justify-between px-2 border-b">
      {/* Tabs */}
      <AnimatedTabs
        tabs={TABS}
        asLinks
        currentPath={pathname}
        indicatorPadding={0}
        tabsContainerClassName="flex items-center gap-2"
        linkComponent={Link}
        withBorder={false}
        indicatorRelativeToParent
      />

      {/* Buttons */}
      {buttonConfig.show && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleButtonClick}>
            {buttonConfig.title}
            <ButtonShortcut>⌘N</ButtonShortcut>
          </Button>
        </div>
      )}
    </div>
  );
};

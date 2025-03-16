"use client";

import {
  ConvexError,
  type Id,
  api,
  useMutation,
  useQuery,
} from "@firebuzz/convex";
import {
  Button,
  ButtonShortcut,
  buttonVariants,
} from "@firebuzz/ui/components/ui/button";
import { ChartBar, Settings, Table, Workflow } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef } from "react";

interface CampaignTabsProps {
  id: string;
}

interface TabButtonProps {
  href: string;
  children: React.ReactNode;
  active: boolean;
}

const TabButton = React.forwardRef<HTMLAnchorElement, TabButtonProps>(
  ({ href, children, active }, ref) => {
    return (
      <Link
        ref={ref}
        className={buttonVariants({
          variant: active ? "outline" : "ghost",
          className: cn(
            "!h-8 !px-2 flex items-center gap-1 !border",
            active
              ? "bg-muted text-foreground"
              : "text-muted-foreground !border-transparent"
          ),
        })}
        href={href}
      >
        {children}
      </Link>
    );
  }
);
TabButton.displayName = "TabButton";

const TABS = [
  {
    slug: "edit",
    icon: Workflow,
    label: "Edit",
  },
  {
    slug: "data",
    icon: Table,
    label: "Data",
  },
  {
    slug: "analytics",
    icon: ChartBar,
    label: "Analytics",
  },
  {
    slug: "settings",
    icon: Settings,
    label: "Settings",
  },
];

export const CampaignTabs = ({ id }: CampaignTabsProps) => {
  const pathname = usePathname();
  const activeTab = pathname.split("/").pop();
  const activeTabIndex = TABS.findIndex((tab) => tab.slug === activeTab);

  // Add refs to track the tab elements
  const tabsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] =
    React.useState<React.CSSProperties>({
      width: 0,
      left: 0,
      opacity: 0,
    });

  // Mutations
  const updateCampaign = useMutation(
    api.collections.campaigns.mutations.updateCampaign
  );
  const publishCampaign = useMutation(
    api.collections.campaigns.mutations.publishCampaign
  );

  // Get current campaign
  const campaign = useQuery(api.collections.campaigns.queries.getCampaignById, {
    id: id as Id<"campaigns">,
  });

  // Function to set ref at specific index
  const setTabRef = (index: number) => (el: HTMLAnchorElement | null) => {
    tabsRef.current[index] = el;
  };

  // Update indicator position when active tab changes
  useEffect(() => {
    if (activeTabIndex >= 0 && tabsRef.current[activeTabIndex]) {
      const activeTabElement = tabsRef.current[activeTabIndex];
      if (activeTabElement) {
        const tabRect = activeTabElement.getBoundingClientRect();
        const containerRect =
          activeTabElement.parentElement?.getBoundingClientRect();

        if (containerRect) {
          setIndicatorStyle({
            width: tabRect.width,
            left: tabRect.left - containerRect.left + 8,
            opacity: 1,
            transform: "translateX(0)",
          });
        }
      }
    }
  }, [activeTabIndex]);

  // Handle save
  const handleSave = async () => {
    if (!campaign) return;

    try {
      await updateCampaign({
        id: id as Id<"campaigns">,
        projectId: campaign.projectId,
      });
      toast.success("Campaign saved successfully");
    } catch (err) {
      const error = err as Error;
      toast.error("Failed to save campaign");
      console.error("Save error:", error.message);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    try {
      await publishCampaign({
        id: id as Id<"campaigns">,
      });
      toast.success("Campaign published successfully");
    } catch (err) {
      const error = err as Error;
      if (error instanceof ConvexError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to publish campaign");
        console.error("Publish error:", error.message);
      }
    }
  };

  const isLoading = campaign === undefined;
  const isDisabled = isLoading || !campaign;

  return (
    <div className="border-b p-2 relative flex items-center justify-between">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map((tab, index) => (
          <TabButton
            key={tab.slug}
            href={`/campaigns/${id}/${tab.slug}`}
            active={activeTab === tab.slug}
            ref={setTabRef(index)}
          >
            <tab.icon className="!size-3.5" />
            <p>{tab.label}</p>
          </TabButton>
        ))}
      </div>
      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isDisabled}
        >
          Save
          <ButtonShortcut>⌘S</ButtonShortcut>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePublish}
          disabled={isDisabled}
        >
          Publish
          <ButtonShortcut>⌘↵</ButtonShortcut>
        </Button>
      </div>
      {/* Active tab indicator */}
      <div
        className="absolute bottom-0 h-px bg-primary transition-all duration-300"
        style={indicatorStyle}
      />
    </div>
  );
};

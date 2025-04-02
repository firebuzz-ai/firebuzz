import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import {
  ChevronRight,
  ChevronsLeft,
  LayoutTemplate,
  Mail,
} from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { memo } from "react";

interface ChatHeaderProps {
  title: string;
  type: "landing-page" | "email" | "ad";
  showLoadMore?: boolean;
}

const getIcon = (type: ChatHeaderProps["type"]) => {
  switch (type) {
    case "landing-page":
      return <LayoutTemplate className="!size-3.5" />;
    case "email":
      return <Mail className="!size-3.5" />;
    case "ad":
      return <LayoutTemplate className="!size-3.5" />;
  }
};

const getMainTitle = (type: ChatHeaderProps["type"]) => {
  switch (type) {
    case "landing-page":
      return "Landing Pages";
    case "email":
      return "Email Templates";
    case "ad":
      return "Ad Templates";
  }
};

const getLink = (type: ChatHeaderProps["type"]) => {
  switch (type) {
    case "landing-page":
      return "/assets/landing-pages";
    case "email":
      return "/assets/emails";
    case "ad":
      return "/assets/ads";
  }
};

export const ChatHeader = memo(({ title, type }: ChatHeaderProps) => {
  const { openRightPanel, isRightPanelClosing, isRightPanelOpen } =
    useTwoPanelsLayout();

  return (
    <div className="flex items-center justify-between border-b px-2 py-3">
      {/* Left Part */}
      <div className="flex items-center gap-1">
        <Link
          className={buttonVariants({
            variant: "ghost",
            className: "h-8 !px-1.5 text-muted-foreground",
          })}
          href={getLink(type)}
        >
          {getIcon(type)}
          <p>{getMainTitle(type)}</p>
        </Link>
        <ChevronRight className="!size-3.5" />
        <div className="text-sm font-medium text-muted-foreground truncate">
          {title}
        </div>
      </div>
      <div>
        {!isRightPanelClosing && !isRightPanelOpen && (
          <Button onClick={openRightPanel} variant="ghost" className="h-8 w-8">
            <ChevronsLeft className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
});

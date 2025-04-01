"use client";

import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { LayoutTemplate } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const LandingTopbar = () => {
  const pathname = usePathname();
  if (pathname.includes("/edit")) return null;
  return (
    <div className="border-b px-2 py-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1">
        <Link
          className={buttonVariants({
            variant: "ghost",
            className: "h-8 !px-1.5 text-muted-foreground",
          })}
          href="/assets/landing-pages"
        >
          <LayoutTemplate className="!size-3.5" />
          <p>Landing Pages</p>
        </Link>
      </div>
    </div>
  );
};

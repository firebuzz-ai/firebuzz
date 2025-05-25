"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@firebuzz/ui/components/ui/breadcrumb";
import { SidebarTrigger } from "@firebuzz/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
export const BrandTopbar = () => {
  const pathname = usePathname();

  const breadcrumbItems = useMemo(() => {
    return pathname.split("/").slice(1) ?? [];
  }, [pathname]);

  return (
    <div className="px-2 py-3 border-b">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <SidebarTrigger />
          </BreadcrumbItem>
          {breadcrumbItems.flatMap((item, index, array) => {
            const isLast = index === array.length - 1;
            return [
              <BreadcrumbSeparator key={`sep-${item}`} />,
              <BreadcrumbItem key={`item-${item}`}>
                {isLast ? (
                  <BreadcrumbPage>
                    {item
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={`/${breadcrumbItems.slice(0, index + 1).join("/")}`}
                  >
                    {item
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ];
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

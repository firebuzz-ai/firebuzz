import type { HTMLAttributes } from "react";

import { cn } from "@firebuzz/ui/lib/utils";

export function BaseNode({
  className,
  selected,
  ...props
}: HTMLAttributes<HTMLDivElement> & { selected?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "relative rounded-md border bg-muted shadow-sm focus:outline-none",
        className,
        selected && "border-brand"
      )}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: <explanation>
      tabIndex={0}
    />
  );
}

BaseNode.displayName = "BaseNode";

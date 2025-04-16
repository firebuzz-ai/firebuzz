"use client";

import { resetState } from "@/lib/workbench/atoms";
import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { GitBranch } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
interface CreateVariantButtonProps {
  landingPageId: Id<"landingPages">;
}

export const CreateVariantButton = ({
  landingPageId,
}: CreateVariantButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const createMutation = useMutation(
    api.collections.landingPages.mutations.createVariant
  );

  const handleCreate = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      toast.loading("Creating variant...", {
        description: "This may take a few seconds",
        id: "create-variant",
      });
      const variantId = await createMutation({
        parentId: landingPageId,
      });
      toast.success("Variant created", {
        description: "This may take a few seconds",
        id: "create-variant",
      });
      resetState();
      router.push(`/assets/landing-pages/${variantId}/edit`);
    } catch (error) {
      toast.error("Failed to create variant", {
        description: "Please try again",
        id: "create-variant",
      });
      console.error(error);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="!size-8"
          onClick={handleCreate}
        >
          {isLoading ? (
            <Spinner size="xs" className="mb-0.5" />
          ) : (
            <GitBranch className="!size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Create Version</TooltipContent>
    </Tooltip>
  );
};

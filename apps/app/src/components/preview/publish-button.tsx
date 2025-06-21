import { useMutation, useQuery } from "@firebuzz/convex";
import { type Id, api } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";

import { useWorkbenchHelpers } from "@/lib/workbench/hooks/use-workbench-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  ChevronDown,
  ExternalLink,
  GitPullRequest,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useState } from "react";

export const PublishButton = ({
  landingPageId,
}: {
  landingPageId: Id<"landingPages">;
}) => {
  const [open, setOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState({
    preview: true,
    custom: false,
  });
  const { buildProject, getBuildFiles } = useWorkbenchHelpers();

  const landingPage = useQuery(api.collections.landingPages.queries.getById, {
    id: landingPageId,
  });

  // Get available custom domains for this project
  const customDomains = useQuery(
    api.collections.domains.queries.getActiveByProject,
    landingPage?.projectId ? { projectId: landingPage.projectId } : "skip"
  );

  // Get campaign data to access the slug
  const campaign = useQuery(
    api.collections.campaigns.queries.getById,
    landingPage?.campaignId ? { id: landingPage.campaignId } : "skip"
  );

  const publishPreviewMutation = useMutation(
    api.collections.landingPages.mutations.publishPreview
  );

  const publishToCustomDomainMutation = useMutation(
    api.collections.landingPages.mutations.publishToCustomDomain
  );

  const unpublishFromCustomDomainMutation = useMutation(
    api.collections.landingPages.mutations.unpublishFromCustomDomain
  );

  const unpublishFromCustomDomain = async () => {
    try {
      await unpublishFromCustomDomainMutation({
        id: landingPageId,
      });

      toast.success("Unpublished from Custom Domain", {
        description: "Landing page unpublished successfully",
        id: "unpublish-custom-domain-process",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to unpublish from custom domain", {
        description: "Please try again",
        id: "unpublish-custom-domain-process",
      });
    }
  };

  const publishPreview = async () => {
    try {
      // Build project
      const isBuildFinished = await buildProject(landingPageId);

      if (!isBuildFinished) {
        toast.error("Failed to build", {
          description: "Please try again",
          id: "build-process",
        });
        return;
      }

      // Get build files
      const files = await getBuildFiles(landingPageId, "preview");

      await publishPreviewMutation({
        id: landingPageId,
        html: files.indexHTML,
        js: files.indexJS,
        css: files.indexCSS,
      });

      toast.success("Preview Published", {
        description: "Landing page preview published successfully",
        id: "publish-preview-process",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish preview", {
        description: "Please try again",
        id: "publish-preview-process",
      });
    }
  };

  const publishToCustomDomain = async () => {
    // Get the first (and only) custom domain
    const customDomain = customDomains?.[0];

    if (!customDomain) {
      toast.error("No custom domain available", {
        description: "Please set up a custom domain first",
        id: "custom-domain-process",
      });
      return;
    }

    if (!campaign?.slug) {
      toast.error("Campaign slug not found", {
        description: "Unable to get campaign information",
        id: "custom-domain-process",
      });
      return;
    }

    try {
      // Build project
      const isBuildFinished = await buildProject(landingPageId);

      if (!isBuildFinished) {
        toast.error("Failed to build", {
          description: "Please try again",
          id: "build-process",
        });
        return;
      }

      // Get build files with campaign slug for custom domain
      const files = await getBuildFiles(
        landingPageId,
        "production",
        campaign.slug
      );

      await publishToCustomDomainMutation({
        id: landingPageId,
        domainId: customDomain._id,
        html: files.indexHTML,
        js: files.indexJS,
        css: files.indexCSS,
      });

      toast.success("Published to Custom Domain", {
        description: "Landing page published successfully",
        id: "custom-domain-process",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish to custom domain", {
        description: "Please try again",
        id: "custom-domain-process",
      });
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      if (selectedDomains.preview) {
        // Publish to preview
        await publishPreview();
      }

      if (selectedDomains.custom) {
        // Publish to custom domain
        await publishToCustomDomain();
      }

      setIsPublishing(false);
    } catch (error) {
      setIsPublishing(false);
      console.error("Error publishing:", error);
      toast.error("Failed to publish", {
        description: "Please try again",
        id: "publish-process",
      });
    }
  };

  // Format the time since published
  const getTimeSincePublished = () => {
    if (!landingPage?.previewPublishedAt) return "";
    return formatRelativeTimeShort(new Date(landingPage.previewPublishedAt));
  };

  // Check if preview was published
  const isPreviewPublished = !!landingPage?.previewPublishedAt;

  // Check if custom domain was published
  const isCustomDomainPublished = !!landingPage?.customDomainUrl;

  // Get the first custom domain (since there's only one per project)
  const firstCustomDomain = customDomains?.[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="!py-0 !pr-2" size="sm" variant="outline">
          {isPublishing ? <Spinner size="xs" /> : "Publish"}
          <div className="flex justify-center items-center pl-2 ml-1 h-full border-l">
            <ChevronDown className="size-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={10}
        align="end"
        className="w-[350px] !p-0"
      >
        <div className="flex gap-2 items-center p-2 text-sm font-medium border-b bg-muted">
          <GitPullRequest className="!size-3" />
          Choose Domains
        </div>

        <div className="flex gap-3 items-center px-2 py-2">
          <Checkbox
            id="preview"
            checked={selectedDomains.preview}
            onCheckedChange={(checked) =>
              setSelectedDomains((prev) => ({
                ...prev,
                preview: checked === true,
              }))
            }
          />
          <div className="flex-1">
            <div className="flex gap-2 items-center">
              {!landingPage?.previewUrl && (
                <div className="text-sm font-medium">Preview Domain</div>
              )}
              <span className="text-xs font-medium">
                {landingPage?.previewUrl?.split("/").pop()}
              </span>
              {landingPage?.previewUrl && (
                <a
                  href={landingPage.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="flex gap-1 items-center text-xs text-muted-foreground">
              {isPreviewPublished ? (
                <>
                  <span className="text-green-500">Published</span>
                  <span>{getTimeSincePublished()}</span>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    Unpublish
                  </Button>
                </>
              ) : (
                <span>Not published yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center px-2 py-2">
          <Checkbox
            id="custom"
            checked={selectedDomains.custom}
            onCheckedChange={(checked) =>
              setSelectedDomains((prev) => ({
                ...prev,
                custom: checked === true,
              }))
            }
            disabled={!firstCustomDomain}
          />
          <div className="flex-1">
            <div className="flex gap-2 items-center">
              <div className="text-sm font-medium">
                {firstCustomDomain
                  ? firstCustomDomain.hostname
                  : "Custom Domain"}
              </div>
              {landingPage?.customDomainUrl && (
                <a
                  href={landingPage.customDomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="flex gap-1 items-center text-xs text-muted-foreground">
              {isCustomDomainPublished ? (
                <>
                  <span className="text-green-500">Published</span>
                  <span>
                    {
                      landingPage?.customDomainUrl
                        ?.replace("https://", "")
                        .split("/")[0]
                    }
                  </span>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={unpublishFromCustomDomain}
                  >
                    Unpublish
                  </Button>
                </>
              ) : firstCustomDomain ? (
                <span>Ready to publish</span>
              ) : (
                <span>No custom domain available</span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="flex justify-between p-2">
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={
              isPublishing ||
              (!selectedDomains.preview && !selectedDomains.custom) ||
              (selectedDomains.custom && !firstCustomDomain)
            }
          >
            {isPublishing ? (
              <Spinner size="xs" />
            ) : (
              "Publish to Selected Domains"
            )}
          </Button>
          <Button onClick={() => setOpen(false)} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

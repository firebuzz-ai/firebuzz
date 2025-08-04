"use client";

import { CampaignNodeIcons } from "@/components/canvas/campaign/nodes/campaign/icons";
import type {
  AllCampaignNodes,
  Validation,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { type Doc, api, useMutation } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  Link,
  Workflow,
} from "@firebuzz/ui/icons/lucide";
import { formatToCalendarDateTime } from "@firebuzz/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { useMemo, useState } from "react";

interface CampaignOverviewPanelProps {
  campaign: Doc<"campaigns">;
}

export const CampaignOverviewPanel = ({
  campaign,
}: CampaignOverviewPanelProps) => {
  const nodes = useNodes<AllCampaignNodes>();
  const { setNodes } = useReactFlow();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description || "");
  const [_hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const updateCampaign = useMutation(
    api.collections.campaigns.mutations.update
  );

  // Filter out placeholder nodes and get only invalid nodes
  const invalidNodes = useMemo(() => {
    return nodes
      .map((node) => {
        const validations: Validation[] = node.data.validations || [];
        const hasErrors = validations.some((v) => !v.isValid);

        return {
          id: node.id,
          type: node.type || "unknown",
          title: node.data.title || "Untitled",
          hasErrors,
          validations,
        };
      })
      .filter((node) => node.hasErrors);
  }, [nodes]);

  const handleTitleSave = async () => {
    try {
      await updateCampaign({
        id: campaign._id,
        projectId: campaign.projectId,
        title: title.trim() || "Untitled Campaign",
      });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update campaign title:", error);
    }
  };

  const handleDescriptionSave = async () => {
    try {
      await updateCampaign({
        id: campaign._id,
        projectId: campaign.projectId,
        description: description.trim(),
      });
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Failed to update campaign description:", error);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
  };

  const handleNodeHover = (nodeId: string | null) => {
    setHoveredNodeId(nodeId);
    // Apply hover effect to the actual canvas node
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHovered: node.id === nodeId,
        },
      }))
    );
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "traffic":
        return CampaignNodeIcons.traffic;
      case "segment":
        return CampaignNodeIcons.segment;
      case "ab-test":
        return CampaignNodeIcons["ab-test"];
      case "variant":
        return CampaignNodeIcons.variant;
      case "note":
        return CampaignNodeIcons.note;
      default:
        return <FileText className="!size-3" />;
    }
  };

  const getNodeTypeLabel = (nodeType: string) => {
    switch (nodeType) {
      case "traffic":
        return "Traffic";
      case "segment":
        return "Segment";
      case "ab-test":
        return "A/B Test";
      case "variant":
        return "Variant";
      case "note":
        return "Note";
      default:
        return "Unknown";
    }
  };

  const getStatusCircleColor = (status: string) => {
    switch (status) {
      case "draft":
        return "fill-gray-500 stroke-gray-500";
      case "published":
        return "fill-emerald-500 stroke-emerald-500";
      case "cancelled":
        return "fill-red-500 stroke-red-500";
      case "finished":
        return "fill-blue-500 stroke-blue-500";
      default:
        return "fill-gray-500 stroke-gray-500";
    }
  };

  const formatText = (text: string) => {
    return text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
        <div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
          <Workflow className="size-4" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  } else if (e.key === "Escape") {
                    setTitle(campaign.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="p-0 !h-auto text-lg font-semibold leading-tight bg-transparent border-none !ring-0 shadow-none focus-visible:ring-0 border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <div
                className="text-lg font-semibold leading-tight transition-colors cursor-pointer hover:text-brand"
                onClick={() => setIsEditingTitle(true)}
              >
                {title || "Untitled Campaign"}
              </div>
            )}
            {isEditingDescription ? (
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleDescriptionSave();
                  } else if (e.key === "Escape") {
                    setDescription(campaign.description || "");
                    setIsEditingDescription(false);
                  }
                }}
                placeholder="Add a description..."
                autoFocus
                className="p-0 !h-auto text-sm leading-tight bg-transparent border-none shadow-none text-muted-foreground focus-visible:ring-0 placeholder:text-muted-foreground border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <div
                className="text-sm leading-tight transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingDescription(true)}
              >
                {description || "Add a description..."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1">
        {/* Campaign Information */}
        <div className="p-4 space-y-3 border-b">
          <div>
            <h3 className="text-sm font-medium">Campaign Information</h3>
            <p className="text-xs text-muted-foreground">
              Basic campaign details and settings
            </p>
          </div>

          <div className="space-y-3">
            {/* Type */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge className="bg-muted" variant="outline">
                {formatText(campaign.type)}
              </Badge>
            </div>

            {/* Created At */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created At</span>
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 bg-muted"
              >
                {formatToCalendarDateTime(campaign._creationTime)}
              </Badge>
            </div>

            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 bg-muted"
              >
                <Circle
                  className={`size-2 ${getStatusCircleColor(campaign.status)}`}
                />
                {formatText(campaign.status)}
              </Badge>
            </div>

            {/* Slug */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Slug</span>
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 bg-muted"
              >
                <Link className="size-2" />
                {campaign.slug}
              </Badge>
            </div>
          </div>
        </div>

        {/* Nodes Checklist */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium">Checklist</h3>
            <p className="text-xs text-muted-foreground">
              Make sure all issues are resolved before publishing
            </p>
          </div>

          <div className="space-y-4">
            {invalidNodes.length > 0 ? (
              invalidNodes.map((node) => (
                <div
                  key={node.id}
                  className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group bg-card hover:shadow-sm"
                  onClick={() => handleNodeClick(node.id)}
                  onMouseEnter={() => handleNodeHover(node.id)}
                  onMouseLeave={() => handleNodeHover(null)}
                >
                  {/* Header */}
                  <div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b bg-background-subtle">
                    <div className="p-1 rounded-lg border bg-muted text-muted-foreground">
                      {getNodeIcon(node.type)}
                    </div>
                    <span className="flex-1 text-sm font-medium">
                      {node.title}
                    </span>
                    <Badge variant="outline">
                      {getNodeTypeLabel(node.type)}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex gap-2 items-center px-3 py-2">
                    <AlertTriangle className="flex-shrink-0 text-amber-500 size-4" />
                    <span className="text-sm text-muted-foreground">
                      You need to configure this node
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 text-green-500 opacity-50 size-12" />
                <p className="text-sm font-medium text-green-700">
                  All nodes configured!
                </p>
                <p className="text-xs">Your campaign is ready to publish</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

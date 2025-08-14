"use client";

import type {
  SegmentNode,
  TrafficNode,
} from "@/components/canvas/campaign/nodes/campaign/types";
import { PanelHeader } from "@/components/ui/panel-header";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import { type Doc, type Id, api, useCachedQuery } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  ArrowRight,
  ChevronRight,
  Eye,
  Globe,
  GripVertical,
  Plus,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { Reorder } from "motion/react";
import { nanoid } from "nanoid";
import { useCallback, useMemo, useRef, useState } from "react";
import { getDefaultSegmentRules } from "../helpers/default-rules";

interface TrafficPanelProps {
  node: TrafficNode;
  campaign?: Doc<"campaigns">;
}

export const TrafficPanel = ({ node, campaign }: TrafficPanelProps) => {
  const { updateNodeData, addNodes, addEdges, setNodes } = useReactFlow();
  const nodes = useNodes();
  const isDraggingRef = useRef(false);
  const [_hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [_state, { openModal }] = useNewLandingPageModal();

  // Fetch landing pages for the campaign
  const landingPages = useCachedQuery(
    api.collections.landingPages.queries.getBaseByCampaignId,
    campaign
      ? {
          campaignId: campaign._id,
        }
      : "skip"
  );

  // Get all segment nodes connected to this traffic node
  const segmentNodes = useMemo(() => {
    return nodes
      .filter((n) => n.type === "segment" && n.parentId === node.id)
      .sort(
        (a, b) =>
          ((a.data as SegmentNode["data"]).priority || 0) -
          ((b.data as SegmentNode["data"]).priority || 0)
      ) as SegmentNode[];
  }, [nodes, node.id]);

  // Get the current default landing page data
  const currentDefaultLandingPage = useMemo(() => {
    if (!node.data.defaultVariantId || !landingPages) return null;
    return landingPages.find((page) => page._id === node.data.defaultVariantId);
  }, [node.data.defaultVariantId, landingPages]);

  const updateDefaultVariant = (variantId: string) => {
    // Prevent unselecting once a landing page is selected
    if (!variantId && node.data.defaultVariantId) {
      return;
    }

    updateNodeData(node.id, {
      defaultVariantId: variantId
        ? (variantId as Id<"landingPages">)
        : undefined,
    });
  };

  const handleAddSegment = useCallback(() => {
    const priority = segmentNodes.length + 1;
    const newNodeId = `segment-${nanoid(8)}`;

    // Calculate better positioning for the new segment
    const baseY = 250; // Distance below traffic node
    const nodeSpacing = 150; // Vertical spacing between segments
    const nodeWidth = 450; // Approximate width of segment nodes

    // Create a 2-column layout
    const column = segmentNodes.length % 2; // 0 for left, 1 for right
    const row = Math.floor(segmentNodes.length / 2);

    const horizontalOffset = column * (nodeWidth + 100); // Add some horizontal padding
    const verticalOffset = row * nodeSpacing;

    const newNode: SegmentNode = {
      id: newNodeId,
      type: "segment",
      position: {
        x: node.position.x - nodeWidth / 2 + horizontalOffset, // Center first column under traffic node
        y: node.position.y + baseY + verticalOffset,
      },
      parentId: node.id,
      data: {
        title: `New Segment ${priority}`,
        description: "Split traffic for different audiences",
        primaryLandingPageId: undefined,
        priority,
        translationMode: "disabled",
        translations: [],
        rules: getDefaultSegmentRules(),
      },
    };

    // Add the new node
    addNodes(newNode);

    // Create an edge connecting the parent to the new node
    const newEdge = {
      id: `${node.id}-${newNodeId}`,
      source: node.id,
      target: newNodeId,
      animated: false,
    };

    addEdges(newEdge);

    // Select the new node and clear all external hover states
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === newNodeId,
        data: {
          ...n.data,
          isHovered: false, // Clear external hover state for all nodes
        },
      }))
    );
  }, [node, segmentNodes, addNodes, addEdges, setNodes]);

  const handleSegmentClick = (segmentId: string) => {
    // Prevent click during drag operation
    if (isDraggingRef.current) {
      return;
    }
    // Select the segment node and clear all external hover states
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === segmentId,
        data: {
          ...n.data,
          isHovered: false, // Clear external hover state for all nodes
        },
      }))
    );
  };

  const handleSegmentHover = (segmentId: string | null) => {
    setHoveredNodeId(segmentId);
    // Apply hover effect to the actual canvas node
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHovered: node.id === segmentId,
        },
      }))
    );
  };

  const handleReorder = async (newOrder: SegmentNode[]) => {
    // Update priorities based on new order
    const updates = newOrder.map((segment, index) => ({
      id: segment.id,
      priority: index + 1,
    }));

    // Update node data with new priorities
    setNodes((nodes) =>
      nodes.map((node) => {
        const update = updates.find((u) => u.id === node.id);
        if (update) {
          return {
            ...node,
            data: {
              ...node.data,
              priority: update.priority,
            },
          };
        }
        return node;
      })
    );
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = () => {
    // Add a small delay to prevent click event from firing immediately after drag
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <PanelHeader
        icon={Globe}
        title="Incoming Traffic"
        description="Control the incoming traffic to the campaign."
      />

      {/* Content - Scrollable */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-variant">Default Landing Page</Label>
            {!campaign ? (
              <div className="p-3 text-center rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  Please create a campaign first
                </p>
              </div>
            ) : landingPages && landingPages.length > 0 ? (
              <>
                <div className="flex gap-2">
                  <Select
                    value={node.data.defaultVariantId || undefined}
                    onValueChange={updateDefaultVariant}
                  >
                    <SelectTrigger id="default-variant" className="h-8">
                      <div className="flex gap-2 justify-between items-center pr-2 w-full">
                        <SelectValue placeholder="Select default landing page" />
                        {currentDefaultLandingPage?.language && (
                          <Badge variant="outline" className="text-xs bg-muted">
                            {currentDefaultLandingPage.language}
                          </Badge>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {landingPages.map((page) => (
                        <SelectItem key={page._id} value={page._id}>
                          {page.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex-shrink-0 w-8 h-8"
                        onClick={() => campaign && openModal(campaign._id)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create new landing page</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  This page will be shown to all traffic that doesn't match any
                  segment rules
                </p>
                {node.data.defaultVariantId && currentDefaultLandingPage && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        if (currentDefaultLandingPage.previewUrl) {
                          window.open(
                            currentDefaultLandingPage.previewUrl,
                            "_blank"
                          );
                        } else {
                          toast.error("Cannot preview landing page", {
                            description:
                              "This landing page needs to be published first to generate a preview URL.",
                          });
                        }
                      }}
                      disabled={!currentDefaultLandingPage.previewUrl}
                    >
                      <Eye className="size-3.5" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        window.location.href = `/assets/landing-pages/${currentDefaultLandingPage._id}/edit`;
                      }}
                    >
                      Edit
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                )}
                {node.data.defaultVariantId &&
                  currentDefaultLandingPage &&
                  !currentDefaultLandingPage.previewUrl && (
                    <p className="text-xs text-muted-foreground">
                      Preview is not available since the landing page is not
                      published yet.
                    </p>
                  )}
              </>
            ) : (
              <div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
                <p className="text-sm text-muted-foreground">
                  No landing pages found
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => campaign && openModal(campaign._id)}
                >
                  Create your first landing page
                </Button>
              </div>
            )}
          </div>

          {/* Segments Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Segments</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSegment}
                className="h-7 text-xs"
              >
                <Plus className="size-3" />
                Add Segment
              </Button>
            </div>

            {segmentNodes.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-24 rounded-lg border bg-muted">
                <p className="text-sm text-muted-foreground">
                  No segments added yet
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSegment}
                  className="mt-2"
                >
                  Add your first segment
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Reorder.Group
                  axis="y"
                  values={segmentNodes}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {segmentNodes.map((segment) => (
                    <Reorder.Item
                      key={segment.id}
                      value={segment}
                      className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
                      onClick={() => handleSegmentClick(segment.id)}
                      onMouseEnter={() => handleSegmentHover(segment.id)}
                      onMouseLeave={() => handleSegmentHover(null)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      whileDrag={{
                        scale: 1.02,
                        zIndex: 50,
                        backgroundColor: "hsl(var(--muted))",
                        borderColor: "hsl(var(--muted-foreground) / 0.2)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      }}
                      dragTransition={{
                        bounceStiffness: 600,
                        bounceDamping: 20,
                      }}
                    >
                      <div className="flex flex-1 gap-3 items-center">
                        <GripVertical className="size-3.5 transition-colors text-muted-foreground cursor-grab active:cursor-grabbing group-hover:text-foreground" />
                        <div className="flex gap-2 justify-between items-center w-full">
                          <div className="flex gap-2 items-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                "bg-muted group-hover:bg-background"
                              )}
                            >
                              Priority {segment.data.priority}
                            </Badge>
                            <div
                              className="text-sm font-medium transition-colors text-foreground group-hover:text-foreground truncate max-w-[140px]"
                              title={segment.data.title}
                            >
                              {segment.data.title}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 gap-2 items-center">
                            <Badge
                              variant="outline"
                              className="text-xs transition-all duration-200 ease-out bg-muted group-hover:translate-x-1 group-hover:bg-background"
                            >
                              {segment.data.rules.length} rules
                            </Badge>
                            <ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
                          </div>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}
          </div>
          <InfoBox variant="info" iconPlacement="top">
            <h4 className="font-medium text-primary">How traffic flows?</h4>
            <ol className="space-y-1 text-sm list-decimal list-inside text-muted-foreground">
              <li>Incoming traffic arrives at this node.</li>
              <li>Traffic is evaluated against segment rules by priority.</li>
              <li>Matching traffic follows segment paths.</li>
              <li>Non-matching traffic shows the default page.</li>
            </ol>
          </InfoBox>
        </div>
      </div>
    </div>
  );
};

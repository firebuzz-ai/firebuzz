"use client";

import { CampaignNodeIcons } from "@/components/canvas/campaign/nodes/campaign/icons";
import { useCampaignNavigation } from "@/hooks/ui/use-campaign-navigation";
import {
  ConvexError,
  type Doc,
  api,
  useCachedQuery,
  useMutation,
} from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Link,
  Loader2,
  Workflow,
  X,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { DEFAULT_CAMPAIGN_EVENTS } from "@firebuzz/utils";
import { useReactFlow } from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GoalSelector } from "../value-selectors/goal-selector";

interface CampaignOverviewPanelProps {
  campaign: Doc<"campaigns">;
  onNavigateToCustomEvents?: (editEventId?: string) => void;
  onNavigateToGdprSettings?: () => void;
}

export const CampaignOverviewPanel = ({
  campaign,
  onNavigateToCustomEvents,
  onNavigateToGdprSettings,
}: CampaignOverviewPanelProps) => {
  const { setNodes } = useReactFlow();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description || "");
  const [_hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [slug, setSlug] = useState(campaign.slug);
  const [slugState, setSlugState] = useState<
    "idle" | "validating" | "updating" | "success" | "error"
  >("idle");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [ctaLink, setCtaLink] = useState(
    campaign.campaignSettings?.ctaLink || ""
  );
  const [ctaLinkState, setCtaLinkState] = useState<
    "idle" | "updating" | "success" | "error"
  >("idle");
  const [ctaLinkError, setCtaLinkError] = useState<string | null>(null);

  // Handle highlight effect from URL params
  const [{ highlight }, setNavigationState] = useCampaignNavigation();
  const ctaInputRef = useRef<HTMLInputElement>(null);
  const [shakeX, setShakeX] = useState(0);
  const [showBorder, setShowBorder] = useState(false);

  // Handle CTA link highlighting with shake animation
  useEffect(() => {
    if (highlight === "ctaLink" && ctaInputRef.current) {
      // Show animated border immediately
      setShowBorder(true);

      // Scroll to the CTA input
      ctaInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Start shake animation after scroll completes
      setTimeout(() => {
        // Create a gentle shake sequence for x position
        const sequence = [0, -3, 3, -3, 3, -2, 2, 0];
        let index = 0;

        const interval = setInterval(() => {
          setShakeX(sequence[index]);
          index++;

          if (index >= sequence.length) {
            clearInterval(interval);
            setShakeX(0);
          }
        }, 120); // ~960ms total for gentler animation

        // Focus the input during shake
        if (ctaInputRef.current) {
          ctaInputRef.current.focus();
        }

        // Clean up interval, border, and highlight param
        setTimeout(() => {
          setNavigationState({ highlight: null });
          setShowBorder(false);
          clearInterval(interval);
        }, 2500); // Show border for 2.5 seconds

        return () => clearInterval(interval);
      }, 300);
    }
  }, [highlight, setNavigationState]);

  // Get validation data from server
  const validation = useCachedQuery(
    api.collections.campaigns.validation.getCampaignValidation,
    { campaignId: campaign._id }
  );

  // Provide defaults while loading
  const issuesBySeverity = validation?.issuesBySeverity || {
    errors: [],
    warnings: [],
    info: [],
  };

  const canPublish = validation?.canPublish || false;

  const updateCampaign = useMutation(
    api.collections.campaigns.mutations.update
  );

  const updateCampaignSettings = useMutation(
    api.collections.campaigns.mutations.updateCampaignSettings
  ).withOptimisticUpdate((localStore, args) => {
    // Get the current campaign data
    const existingCampaign = localStore.getQuery(
      api.collections.campaigns.queries.getById,
      { id: campaign._id }
    );

    if (existingCampaign) {
      // Update the campaign settings optimistically
      localStore.setQuery(
        api.collections.campaigns.queries.getById,
        { id: campaign._id },
        {
          ...existingCampaign,
          campaignSettings: {
            ...existingCampaign.campaignSettings,
            ...args.campaignSettings,
          },
        }
      );
    }
  });

  // Combine default events with custom events
  const availableEvents = [
    ...DEFAULT_CAMPAIGN_EVENTS.filter((event) =>
      event.availableFor.includes(campaign.type)
    ).map((event) => {
      const { availableFor, ...eventWithoutAvailableFor } = event;
      return { ...eventWithoutAvailableFor, isCustom: false };
    }),
    ...(campaign.campaignSettings?.customEvents || []),
  ];

  const validateSlug = (slugValue: string): string | null => {
    const trimmedSlug = slugValue.trim().toLowerCase();

    if (trimmedSlug.length < 3) {
      return "Slug must be at least 3 characters long";
    }

    // Basic slug validation - alphanumeric and hyphens only
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return "Slug can only contain lowercase letters, numbers, and hyphens";
    }

    // Cannot start or end with hyphens
    if (trimmedSlug.startsWith("-") || trimmedSlug.endsWith("-")) {
      return "Slug cannot start or end with hyphens";
    }

    return null;
  };

  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setSlugError(null);

    // Reset to idle when typing - we'll validate on blur
    setSlugState("idle");
  };

  const handleSlugBlur = async () => {
    const trimmedSlug = slug.trim().toLowerCase();
    const validationError = validateSlug(trimmedSlug);

    // If there's a validation error, don't attempt to update
    if (validationError) {
      setSlugState("error");
      setSlugError(validationError);
      return;
    }

    // Update the input to show the lowercase version
    setSlug(trimmedSlug);

    // If slug hasn't changed, do nothing
    if (trimmedSlug === campaign.slug) {
      setSlugState("idle");
      return;
    }

    try {
      setSlugState("updating");

      // Add a minimum delay to make the updating state more visible
      await Promise.all([
        updateCampaign({
          id: campaign._id,
          projectId: campaign.projectId,
          slug: trimmedSlug,
        }),
        new Promise((resolve) => setTimeout(resolve, 800)), // Minimum 800ms delay
      ]);

      setSlugState("success");

      // Show success state briefly, then return to idle
      setTimeout(() => {
        setSlugState("idle");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof ConvexError
          ? error.data
          : "Failed to update campaign slug";
      setSlugState("error");
      setSlugError(errorMessage);

      // Reset to original slug on error
      setSlug(campaign.slug);
    }
  };

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

  // Campaign Settings Handlers
  const handleGoalChange = async (goal: (typeof availableEvents)[0]) => {
    try {
      await updateCampaignSettings({
        campaignId: campaign._id,
        campaignSettings: { primaryGoal: goal },
      });
    } catch (error) {
      console.error("Failed to update primary goal:", error);
    }
  };

  const handleGoalValueChange = async (value: number) => {
    if (campaign.campaignSettings?.primaryGoal) {
      try {
        const updatedGoal = { ...campaign.campaignSettings.primaryGoal, value };
        await updateCampaignSettings({
          campaignId: campaign._id,
          campaignSettings: { primaryGoal: updatedGoal },
        });
      } catch (error) {
        console.error("Failed to update goal value:", error);
      }
    }
  };

  const handleCurrencyChange = async (currency: string) => {
    if (campaign.campaignSettings?.primaryGoal) {
      try {
        const updatedGoal = {
          ...campaign.campaignSettings.primaryGoal,
          currency,
        };
        await updateCampaignSettings({
          campaignId: campaign._id,
          campaignSettings: { primaryGoal: updatedGoal },
        });
      } catch (error) {
        console.error("Failed to update currency:", error);
      }
    }
  };

  const handleGdprChange = async (
    gdpr: NonNullable<typeof campaign.campaignSettings>["gdpr"]
  ) => {
    try {
      await updateCampaignSettings({
        campaignId: campaign._id,
        campaignSettings: { gdpr },
      });
    } catch (error) {
      console.error("Failed to update GDPR settings:", error);
    }
  };

  const validateCtaLink = (url: string): string | null => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return "This field is required";
    }

    try {
      new URL(trimmedUrl);
      return null;
    } catch {
      return "Please enter a valid URL (e.g., https://example.com)";
    }
  };

  const cleanCtaUrl = (url: string): string => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return "";
    }

    try {
      const urlObj = new URL(trimmedUrl);
      // Return URL without query parameters or hash
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return original (validation will catch this)
      return trimmedUrl;
    }
  };

  const handleCtaLinkChange = (newCtaLink: string) => {
    setCtaLink(newCtaLink);
    setCtaLinkError(null);
    setCtaLinkState("idle");
  };

  const handleCtaLinkBlur = async () => {
    const trimmedUrl = ctaLink.trim();
    const validationError = validateCtaLink(trimmedUrl);

    if (validationError) {
      setCtaLinkState("error");
      setCtaLinkError(validationError);
      return;
    }

    // Clean the URL by removing query parameters and hash
    const cleanedUrl = cleanCtaUrl(trimmedUrl);

    // Update the input to show the cleaned version
    if (cleanedUrl !== trimmedUrl) {
      setCtaLink(cleanedUrl);
    }

    // If CTA link hasn't changed, do nothing
    if (cleanedUrl === (campaign.campaignSettings?.ctaLink || "")) {
      setCtaLinkState("idle");
      return;
    }

    try {
      setCtaLinkState("updating");

      await updateCampaignSettings({
        campaignId: campaign._id,
        campaignSettings: { ctaLink: cleanedUrl || undefined },
      });

      setCtaLinkState("success");

      // Show success state briefly, then return to idle
      setTimeout(() => {
        setCtaLinkState("idle");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof ConvexError ? error.data : "Failed to update CTA link";
      setCtaLinkState("error");
      setCtaLinkError(errorMessage);

      // Reset to original value on error
      setCtaLink(campaign.campaignSettings?.ctaLink || "");
    }
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
        {/* Campaign Settings */}
        <div className="p-4 space-y-4 border-b">
          <div className="space-y-4">
            {/* Campaign Slug */}
            <div className="space-y-2">
              <Label htmlFor="campaign-slug">Campaign Slug</Label>
              <div className="relative">
                <Input
                  id="campaign-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  onBlur={handleSlugBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur(); // Trigger blur to start update process
                    }
                  }}
                  placeholder="Enter campaign slug..."
                  className={cn(
                    "pr-10 h-8",
                    slugState === "error" &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-2.5 bg-accent/50 border-l border-l-border rounded-r-md">
                  <AnimatePresence mode="wait">
                    {slugState === "idle" && (
                      <motion.div
                        key="idle"
                        className="flex justify-center items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Link className="w-3 h-3 text-muted-foreground" />
                      </motion.div>
                    )}
                    {slugState === "validating" && (
                      <motion.div
                        key="validating"
                        className="flex justify-center items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      </motion.div>
                    )}
                    {slugState === "updating" && (
                      <motion.div
                        key="updating"
                        className="flex justify-center items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin text-brand" />
                      </motion.div>
                    )}
                    {slugState === "success" && (
                      <motion.div
                        key="success"
                        className="flex justify-center items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Check className="w-3 h-3 text-green-600" />
                      </motion.div>
                    )}
                    {slugState === "error" && (
                      <motion.div
                        key="error"
                        className="flex justify-center items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {slugError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs text-destructive"
                >
                  {slugError}
                </motion.p>
              )}
              <p className="text-xs text-muted-foreground">
                Used in the campaign URL. Must be unique and at least 3
                characters.
              </p>
            </div>

            {/* CTA Link - Only show for click-through campaigns */}
            {campaign.type === "click-through" && (
              <div className="space-y-2">
                <Label htmlFor="cta-link">CTA Link</Label>
                <div
                  className="relative"
                  style={{
                    transform: `translateX(${shakeX}px)`,
                    transition: "transform 0.15s ease-in-out",
                  }}
                >
                  <Input
                    ref={ctaInputRef}
                    id="cta-link"
                    value={ctaLink}
                    onChange={(e) => handleCtaLinkChange(e.target.value)}
                    onBlur={handleCtaLinkBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="https://example.com"
                    className={cn(
                      "pr-10 h-8 transition-all duration-300",
                      ctaLinkState === "error" &&
                        "border-destructive focus-visible:ring-destructive",
                      showBorder &&
                        "ring-2 ring-brand/50 border-brand shadow-lg shadow-brand/25"
                    )}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center px-2.5 bg-accent/50 border-l border-l-border rounded-r-md">
                    <AnimatePresence mode="wait">
                      {ctaLinkState === "idle" && (
                        <motion.div
                          key="idle"
                          className="flex justify-center items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Link className="w-3 h-3 text-muted-foreground" />
                        </motion.div>
                      )}
                      {ctaLinkState === "updating" && (
                        <motion.div
                          key="updating"
                          className="flex justify-center items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Loader2 className="w-3 h-3 animate-spin text-brand" />
                        </motion.div>
                      )}
                      {ctaLinkState === "success" && (
                        <motion.div
                          key="success"
                          className="flex justify-center items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </motion.div>
                      )}
                      {ctaLinkState === "error" && (
                        <motion.div
                          key="error"
                          className="flex justify-center items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {ctaLinkError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-destructive"
                  >
                    {ctaLinkError}
                  </motion.p>
                )}
                <p className="text-xs text-muted-foreground">
                  The target URL where users will be redirected when they click
                  the CTA button. Don't include parameters such as UTM tags or
                  any other, they will be forwarded automatically.
                </p>
              </div>
            )}

            <Separator />

            {/* Primary Goal Selection */}
            <GoalSelector
              selectedGoal={campaign.campaignSettings?.primaryGoal}
              availableGoals={availableEvents}
              onGoalChange={handleGoalChange}
              onValueChange={handleGoalValueChange}
              onCurrencyChange={handleCurrencyChange}
              label="Primary Goal"
              onNavigateToCustomEvents={onNavigateToCustomEvents}
              onCreateCustomEvent={() => onNavigateToCustomEvents?.()}
              campaignType={campaign.type}
            />

            <Separator />

            {/* GDPR Settings */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">GDPR Compliance</h3>

              <div className="space-y-3">
                {/* Main Toggle */}
                <div className="flex gap-4 justify-between items-center p-3 rounded-md border bg-muted">
                  <div className="max-w-[70%]">
                    <Label
                      htmlFor="gdpr-enabled"
                      className="text-sm font-medium"
                    >
                      Enable GDPR Compliance
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Apply EU data protection rules and privacy measures to
                      your campaign.
                    </p>
                  </div>
                  <Switch
                    id="gdpr-enabled"
                    checked={campaign.campaignSettings?.gdpr?.enabled ?? true}
                    onCheckedChange={(enabled) => {
                      const currentGdpr = campaign.campaignSettings?.gdpr || {
                        enabled: true,
                        geoLocation: true,
                        localization: true,
                        includedCountries: [],
                        respectDNT: true,
                      };
                      handleGdprChange({ ...currentGdpr, enabled });
                    }}
                  />
                </div>

                {/* Advanced Settings Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToGdprSettings?.()}
                  className="gap-2 w-full h-8"
                  disabled={!(campaign.campaignSettings?.gdpr?.enabled ?? true)}
                >
                  Advanced Settings
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Validation Checklist */}
        <div className="p-4 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-medium">Node Validation</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {canPublish
                ? "Your campaign is ready to publish!"
                : "Resolve all errors before publishing"}
            </p>
          </div>

          <div className="space-y-3">
            {/* Errors */}
            {issuesBySeverity.errors.length > 0 && (
              <div className="space-y-3">
                {issuesBySeverity.errors.map((result) => (
                  <div
                    key={result.nodeId}
                    className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
                    onClick={() => handleNodeClick(result.nodeId)}
                    onMouseEnter={() => handleNodeHover(result.nodeId)}
                    onMouseLeave={() => handleNodeHover(null)}
                  >
                    {/* Header */}
                    <div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b bg-background-subtle">
                      <div className="p-1 rounded-lg border bg-muted">
                        {getNodeIcon(result.nodeType)}
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {result.nodeTitle}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getNodeTypeLabel(result.nodeType)}
                      </Badge>
                    </div>

                    {/* Validation Messages */}
                    <div className="px-3 py-2 space-y-1">
                      {result.validations.map((validation) => (
                        <div
                          key={validation.id}
                          className="flex gap-2 items-start"
                        >
                          <AlertCircle className="flex-shrink-0 text-destructive size-3 mt-0.5" />
                          <span className="text-xs text-muted-foreground">
                            {validation.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {issuesBySeverity.warnings.length > 0 && (
              <div className="space-y-3">
                {issuesBySeverity.warnings.map((result) => (
                  <div
                    key={result.nodeId}
                    className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
                    onClick={() => handleNodeClick(result.nodeId)}
                    onMouseEnter={() => handleNodeHover(result.nodeId)}
                    onMouseLeave={() => handleNodeHover(null)}
                  >
                    {/* Header */}
                    <div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b">
                      <div className="p-1 rounded-lg border bg-muted">
                        {getNodeIcon(result.nodeType)}
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {result.nodeTitle}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getNodeTypeLabel(result.nodeType)}
                      </Badge>
                    </div>

                    {/* Validation Messages */}
                    <div className="px-3 py-2 space-y-1">
                      {result.validations.map((validation) => (
                        <div
                          key={validation.id}
                          className="flex gap-2 items-start"
                        >
                          <AlertTriangle className="flex-shrink-0 text-amber-600 size-3 mt-0.5" />
                          <span className="text-xs text-muted-foreground">
                            {validation.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info/Tips */}
            {issuesBySeverity.info.length > 0 && (
              <div className="space-y-3">
                {issuesBySeverity.info.map((result) => (
                  <div
                    key={result.nodeId}
                    className="relative z-20 w-full rounded-lg border transition-all duration-200 cursor-pointer group hover:bg-muted"
                    onClick={() => handleNodeClick(result.nodeId)}
                    onMouseEnter={() => handleNodeHover(result.nodeId)}
                    onMouseLeave={() => handleNodeHover(null)}
                  >
                    {/* Header */}
                    <div className="flex gap-2 items-center px-3 py-2 rounded-t-lg border-b">
                      <div className="p-1 rounded-lg border bg-muted">
                        {getNodeIcon(result.nodeType)}
                      </div>
                      <span className="flex-1 text-sm font-medium">
                        {result.nodeTitle}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getNodeTypeLabel(result.nodeType)}
                      </Badge>
                    </div>

                    {/* Validation Messages */}
                    <div className="px-3 py-2 space-y-1">
                      {result.validations.map((validation) => (
                        <div
                          key={validation.id}
                          className="flex gap-2 items-start"
                        >
                          <Info className="flex-shrink-0 text-blue-600 size-3 mt-0.5" />
                          <span className="text-xs text-muted-foreground">
                            {validation.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All Good State */}
            {issuesBySeverity.errors.length === 0 &&
              issuesBySeverity.warnings.length === 0 &&
              issuesBySeverity.info.length === 0 && (
                <div className="flex flex-col gap-3 items-center py-8 text-center rounded-md border text-muted-foreground bg-muted">
                  <div className="p-2 text-emerald-600 rounded-md border bg-muted">
                    <CheckCircle2 className="size-6" />
                  </div>

                  <div>
                    {" "}
                    <p className="text-sm font-medium text-primary">
                      All validations passed!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your campaign is ready to publish
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

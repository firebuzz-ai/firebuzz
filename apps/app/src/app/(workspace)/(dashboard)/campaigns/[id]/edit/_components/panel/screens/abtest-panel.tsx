"use client";

import type { ABTestNode } from "@/components/canvas/campaign/nodes/campaign/types";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@firebuzz/ui/components/ui/tabs";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  AlertCircle,
  Crown,
  Plus,
  TestTube,
  Trash2,
  Users,
} from "@firebuzz/ui/icons/lucide";
import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { useState } from "react";

interface ABTestPanelProps {
  node: ABTestNode;
}

export const ABTestPanel = ({ node }: ABTestPanelProps) => {
  const { updateNodeData } = useReactFlow();
  const [activeTab, setActiveTab] = useState("settings");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState(node.data.title);
  const [description, setDescription] = useState(node.data.description || "");

  const updateABTestData = (updates: Partial<typeof node.data>) => {
    updateNodeData(node.id, updates);
  };

  const handleTitleSave = () => {
    updateABTestData({ title: title.trim() || "A/B Test" });
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    updateABTestData({ description: description.trim() });
    setIsEditingDescription(false);
  };

  const updateCompletionCriteria = (
    criteria: Partial<typeof node.data.completionCriteria>
  ) => {
    updateABTestData({
      completionCriteria: {
        ...(node.data.completionCriteria || {}),
        ...criteria,
      },
    });
  };

  const updateRules = (rules: Partial<typeof node.data.rules>) => {
    updateABTestData({
      rules: { ...node.data.rules, ...rules },
    });
  };

  const addVariant = () => {
    const isControl = node.data.variants.length === 0;
    const newVariant = {
      id: nanoid(8),
      isControl,
      name: isControl ? "Control" : `Variant ${node.data.variants.length}`,
      landingPageId: "",
      trafficAllocation: 0,
    };
    updateABTestData({
      variants: [...node.data.variants, newVariant],
    });
  };

  const updateVariant = (
    variantId: string,
    updates: Partial<(typeof node.data.variants)[0]>
  ) => {
    updateABTestData({
      variants: node.data.variants.map((v) =>
        v.id === variantId ? { ...v, ...updates } : v
      ),
    });
  };

  const removeVariant = (variantId: string) => {
    const variantToRemove = node.data.variants.find((v) => v.id === variantId);
    const remainingVariants = node.data.variants.filter(
      (v) => v.id !== variantId
    );

    // If removing control variant, make the first remaining variant the control
    if (variantToRemove?.isControl && remainingVariants.length > 0) {
      remainingVariants[0].isControl = true;
    }

    updateABTestData({
      variants: remainingVariants,
    });
  };

  const setAsControl = (variantId: string) => {
    updateABTestData({
      variants: node.data.variants.map((v) => ({
        ...v,
        isControl: v.id === variantId,
      })),
    });
  };

  const autoDistributeTraffic = () => {
    const variantCount = node.data.variants.length;
    if (variantCount === 0) return;

    const equalAllocation = Math.floor(100 / variantCount);
    const remainder = 100 % variantCount;

    updateABTestData({
      variants: node.data.variants.map((v, i) => ({
        ...v,
        trafficAllocation: equalAllocation + (i < remainder ? 1 : 0),
      })),
    });
  };

  const totalTrafficAllocation = node.data.variants.reduce(
    (sum, v) => sum + v.trafficAllocation,
    0
  );

  const controlVariant = node.data.variants.find((v) => v.isControl);

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex gap-3 items-center p-4 border-b bg-muted flex-shrink-0">
        <div className="p-2 rounded-lg border bg-brand/10 border-brand text-brand">
          <TestTube className="size-4" />
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
                    setTitle(node.data.title);
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
                {title || "A/B Test"}
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
                    setDescription(node.data.description || "");
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
                {description ||
                  "Configure test parameters, variants, and success metrics"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="completion">Test Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hypothesis">Hypothesis</Label>
                <Textarea
                  id="hypothesis"
                  value={node.data.hypothesis}
                  onChange={(e) =>
                    updateABTestData({ hypothesis: e.target.value })
                  }
                  placeholder="Describe what you expect to happen and why"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="primary-metric">Primary Metric</Label>
                <Select
                  value={node.data.primaryMetric}
                  onValueChange={(value) =>
                    updateABTestData({ primaryMetric: value })
                  }
                >
                  <SelectTrigger id="primary-metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversions">Conversions</SelectItem>
                    <SelectItem value="clicks">Clicks</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="custom">Custom Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidence-level">Confidence Level</Label>
                <Select
                  value={node.data.confidenceLevel.toString()}
                  onValueChange={(value) =>
                    updateABTestData({
                      confidenceLevel: Number.parseInt(value) as 90 | 95 | 99,
                    })
                  }
                >
                  <SelectTrigger id="confidence-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                    <SelectItem value="99">99%</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher confidence levels require larger sample sizes
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={node.data.status || "draft"}
                  onValueChange={(value) =>
                    updateABTestData({
                      status: value as
                        | "draft"
                        | "running"
                        | "completed"
                        | "cancelled",
                      isCompleted:
                        value === "completed" || value === "cancelled",
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current test status:{" "}
                  {(node.data.isCompleted ?? false) ? "Completed" : "Active"}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Test Variants</h4>
                  <p className="text-xs text-muted-foreground">
                    Traffic allocation: {totalTrafficAllocation}%
                    {totalTrafficAllocation !== 100 && (
                      <span className="ml-1 text-destructive">
                        (Must equal 100%)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={autoDistributeTraffic}
                  >
                    Auto-distribute
                  </Button>
                  <Button size="sm" onClick={addVariant}>
                    <Plus className="mr-1 w-4 h-4" />
                    Add Variant
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {node.data.variants.map((variant) => (
                  <Card key={variant.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          {variant.isControl && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          <Badge
                            variant={
                              variant.isControl ? "default" : "secondary"
                            }
                          >
                            {variant.isControl ? "Control" : "Variant"}
                          </Badge>
                        </div>
                        <div className="flex space-x-1">
                          {!variant.isControl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAsControl(variant.id)}
                            >
                              Set as Control
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeVariant(variant.id)}
                            disabled={node.data.variants.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Input
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(variant.id, { name: e.target.value })
                          }
                          placeholder="Variant name"
                        />

                        <Select
                          value={variant.landingPageId}
                          onValueChange={(value) =>
                            updateVariant(variant.id, { landingPageId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select landing page" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="page1">
                              Homepage Variant A
                            </SelectItem>
                            <SelectItem value="page2">
                              Homepage Variant B
                            </SelectItem>
                            <SelectItem value="page3">Product Page</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs">Traffic Allocation</Label>
                          <span className="text-xs font-medium">
                            {variant.trafficAllocation}%
                          </span>
                        </div>
                        <Input
                          type="range"
                          min={0}
                          max={100}
                          value={variant.trafficAllocation}
                          onChange={(e) =>
                            updateVariant(variant.id, {
                              trafficAllocation: Number.parseInt(
                                e.target.value
                              ),
                            })
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {node.data.variants.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 w-12 h-12 opacity-50" />
                  <p className="text-sm">No variants added yet</p>
                  <p className="text-xs">
                    Add at least 2 variants to run an A/B test
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completion" className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Test Completion Criteria
                </h4>
                <p className="text-xs text-muted-foreground">
                  Set at least one completion criteria. The test will complete
                  when any criteria is met.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="sample-size">Sample Size per Variant</Label>
                  <Input
                    id="sample-size"
                    type="number"
                    value={
                      node.data.completionCriteria?.sampleSizePerVariant || ""
                    }
                    onChange={(e) =>
                      updateCompletionCriteria({
                        sampleSizePerVariant:
                          Number.parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="e.g. 1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Test completes when each variant reaches this sample size
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-duration">Test Duration (days)</Label>
                  <Input
                    id="test-duration"
                    type="number"
                    value={node.data.completionCriteria?.testDuration || ""}
                    onChange={(e) =>
                      updateCompletionCriteria({
                        testDuration:
                          Number.parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="e.g. 14"
                  />
                  <p className="text-xs text-muted-foreground">
                    Test completes after this many days
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-primary/5">
                  <h5 className="mb-2 text-sm font-medium">
                    Fixed-Horizon Testing
                  </h5>
                  <p className="mb-2 text-xs text-muted-foreground">
                    This test uses Fixed-Horizon methodology for reliable
                    results:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Pre-determined sample size or duration</li>
                    <li>• No peeking at results during test</li>
                    <li>• Statistical significance maintained</li>
                    <li>• Reduces false positive rate</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Advanced Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="winning-strategy">Winning Strategy</Label>
                  <Select
                    value={node.data.rules.winningStrategy}
                    onValueChange={(value) =>
                      updateRules({
                        winningStrategy: value as "winner" | "winnerOrControl",
                      })
                    }
                  >
                    <SelectTrigger id="winning-strategy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="winner">Winner only</SelectItem>
                      <SelectItem value="winnerOrControl">
                        Winner or Control
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {node.data.rules.winningStrategy === "winner"
                      ? "Only declare a winner if it significantly beats all other variants"
                      : "Declare a winner if it beats control, even if other variants perform similarly"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <h5 className="mb-2 text-sm font-medium">
                    Current Configuration
                  </h5>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Confidence Level: {node.data.confidenceLevel}%</div>
                    <div>
                      Control Variant: {controlVariant?.name || "Not set"}
                    </div>
                    <div>Total Variants: {node.data.variants.length}</div>
                    <div>
                      Winning Strategy: {node.data.rules.winningStrategy}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {node.data.validations.some((v) => !v.isValid) && (
            <div className="p-3 mt-4 rounded-lg bg-destructive/10">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="space-y-1">
                  {node.data.validations
                    .filter((v) => !v.isValid)
                    .map((v, i) => (
                      <p
                        key={`${v.message}-${i}`}
                        className="text-sm text-destructive"
                      >
                        {v.message}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

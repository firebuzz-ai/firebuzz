"use client";

import type { VariantNode } from "@/components/canvas/campaign/nodes/campaign/types";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Progress } from "@firebuzz/ui/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
  AlertCircle,
  ExternalLink,
  Eye,
  TestTube2,
} from "@firebuzz/ui/icons/lucide";
import { useReactFlow } from "@xyflow/react";

interface VariantPanelProps {
  node: VariantNode;
}

export const VariantPanel = ({ node }: VariantPanelProps) => {
  const { updateNodeData } = useReactFlow();

  const updateVariantId = (variantId: string) => {
    updateNodeData(node.id, {
      variantId,
      validations: node.data.validations.map((v) =>
        v.message.includes("Variant") ? { ...v, isValid: !!variantId } : v
      ),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="border-0 shadow-none">
        <CardHeader className="flex-shrink-0">
          <CardTitle>
            <TestTube2 className="inline mr-2 w-5 h-5" />
            Variant Configuration
          </CardTitle>
          <CardDescription>
            Configure this A/B test variant settings and monitor performance
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="landing-page">Landing Page</Label>
            <Select
              value={node.data.variantId || ""}
              onValueChange={updateVariantId}
            >
              <SelectTrigger id="landing-page">
                <SelectValue placeholder="Select landing page for this variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page1">Homepage - Original</SelectItem>
                <SelectItem value="page2">Homepage - Redesign</SelectItem>
                <SelectItem value="page3">Product Landing Page</SelectItem>
                <SelectItem value="page4">Promotional Page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="mr-1 w-4 h-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <ExternalLink className="mr-1 w-4 h-4" />
              Open in New Tab
            </Button>
          </div>

          <div className="p-4 space-y-3 rounded-lg bg-muted">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Traffic Allocation</span>
              <Badge variant="secondary">{node.data.trafficPercentage}%</Badge>
            </div>
            <Progress value={node.data.trafficPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              This variant receives {node.data.trafficPercentage}% of the test
              traffic
            </p>
          </div>

          <div className="p-4 space-y-2 rounded-lg bg-primary/5">
            <h4 className="text-sm font-medium">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Visitors</p>
                <p className="text-lg font-semibold">0</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversions</p>
                <p className="text-lg font-semibold">0</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-lg font-semibold">0%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold">-</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Variant Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline">Draft</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>Today</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parent Test</span>
                <span>A/B Test</span>
              </div>
            </div>
          </div>

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
        </CardContent>
      </Card>
    </div>
  );
};

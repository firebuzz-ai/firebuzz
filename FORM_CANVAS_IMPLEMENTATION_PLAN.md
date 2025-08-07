# React Canvas Form Implementation Plan

## Executive Summary

This document outlines the plan for integrating React Canvas (React Flow) into the form editing feature. The implementation will use a single FormNode containing all form fields, leveraging the existing campaign canvas synchronization patterns with Convex for real-time updates. Everything will be reactive and automatically synced to Convex without manual save hooks.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Updates](#database-schema-updates)
3. [Component Structure](#component-structure)
4. [Implementation Details](#implementation-details)
5. [Code Examples](#code-examples)

---

## Architecture Overview

### Current State

- **Form Editor**: Panel-based form builder with real-time preview
- **State Management**: Jotai atoms with auto-save hooks
- **Data Storage**: Forms table in Convex with schema array
- **Campaign Canvas**: React Flow with reactive Convex sync (no manual saves)

### Target State

- **Unified Canvas**: React Flow canvas following campaign patterns
- **Single Node Design**: One FormNode containing all fields
- **Reactive Sync**: Direct Convex mutations with optimistic updates (no Jotai, no save hooks)
- **Same Panel UI/UX**: Reuse existing panel components, only change state management
- **AI Integration**: Form generator in canvas controller

### Key Design Decisions

1. **Single FormNode**: All fields in one node (no edges needed)
2. **No State Management Library**: Direct React state + Convex (like campaigns)
3. **Reuse Panel UI**: Keep existing panel UI/UX, adapt to canvas state
4. **Component Location**: Create in `@apps/app/src/components/canvas/forms/`

---

## Database Schema Updates

### Current Form Schema

```typescript
// packages/convex/convex/collections/forms/schema.ts
export const formSchema = defineTable(
  v.object({
    schema: v.array(/* FormField objects */),
    submitButtonText: v.optional(v.string()),
    successMessage: v.optional(v.string()),
    successRedirectUrl: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
    createdBy: v.id("users"),
    updatedAt: v.string(),
  })
);
```

### Updated Form Schema with Canvas

```typescript
// packages/convex/convex/collections/forms/schema.ts
import { nodeSchema, edgeSchema, viewportSchema } from "../campaigns/schema";

export const formSchema = defineTable(
  v.object({
    // Existing fields remain
    schema: v.array(/* FormField objects */),
    submitButtonText: v.optional(v.string()),
    successMessage: v.optional(v.string()),
    successRedirectUrl: v.optional(v.string()),

    // New canvas fields
    nodes: v.array(nodeSchema), // Will contain single FormNode
    edges: v.array(edgeSchema), // Empty array for forms
    viewport: viewportSchema, // Canvas viewport state

    // Relations and timestamps
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    campaignId: v.id("campaigns"),
    createdBy: v.id("users"),
    updatedAt: v.string(),
  })
);
```

### FormNode Data Structure

```typescript
// Example FormNode structure
const formNode = {
  id: "form-node-main",
  type: "form",
  position: { x: 0, y: 0 },
  width: 600,
  height: 800,
  data: {
    title: "Lead Generation Form",
    description: "Capture user information",
    schema: [
      {
        id: "field-1",
        title: "Full Name",
        type: "string",
        inputType: "text",
        required: true,
        placeholder: "Enter your name",
        // ... other field properties
      },
      // ... more fields
    ],
    submitButtonText: "Submit",
    successMessage: "Thank you for your submission!",
    successRedirectUrl: "/thank-you",
  },
};
```

---

## Component Structure

### Directory Organization (Following Campaign Pattern)

```
apps/app/src/components/canvas/forms/
├── canvas.tsx                    # Main canvas component (like campaign)
├── provider.tsx                  # FormCanvasProvider wrapping ReactFlow
├── background.tsx                # Canvas background component
├── controller/
│   ├── controller.tsx            # Canvas controls + AI integration
│   └── provider.tsx              # Controller context provider
├── nodes/
│   ├── form-node.tsx            # Single FormNode containing all fields
│   └── types.ts                 # FormNode type definitions
└── panel/                        # Reuse existing panel components
    └── (existing panel files)   # Adapt state management only

apps/app/src/app/(workspace)/(dashboard)/campaigns/[id]/form/
├── _components/
│   ├── panel/                    # Keep existing panel UI
│   │   └── (all existing files) # Only change how they read/write state
│   └── preview/                  # Keep form renderer
│       └── form-renderer.tsx    # Reuse inside FormNode
└── page.tsx                      # Import canvas from components/canvas/forms
```

### Key Differences from Original Plan

- **No \_store folder**: Direct React state + Convex (no Jotai)
- **Canvas in shared components**: Located in `components/canvas/forms/`
- **Reuse panel UI**: Keep existing panel components, adapt state management
- **No auto-save hooks**: Everything reactive through Convex mutations

---

## Implementation Details

### Phase 1: Database & Schema

#### 1.1 Update Convex Schema

```typescript
// packages/convex/convex/collections/forms/schema.ts
export const formNodeDataSchema = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  schema: v.array(formFieldSchema),
  submitButtonText: v.string(),
  successMessage: v.string(),
  successRedirectUrl: v.optional(v.string()),
});

// Add to form table
nodes: v.array(nodeSchema),
edges: v.array(edgeSchema),
viewport: viewportSchema,
```

#### 1.2 Create Canvas Mutations

```typescript
// packages/convex/convex/collections/forms/mutations.ts
export const updateFormNodes = mutationWithTrigger({
  args: {
    formId: v.id("forms"),
    changes: v.array(nodeChangeValidator),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError("Form not found");

    const updatedNodes = applyNodeChanges(args.changes, form.nodes);

    await ctx.db.patch(args.formId, {
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    });

    return updatedNodes;
  },
});

export const updateFormViewport = mutationWithTrigger({
  args: {
    formId: v.id("forms"),
    viewport: viewportChangeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.formId, {
      viewport: args.viewport,
      updatedAt: new Date().toISOString(),
    });
  },
});
```

#### 1.3 Create Canvas Queries

```typescript
// packages/convex/convex/collections/forms/queries.ts
export const getFormCanvasData = query({
  args: {
    formId: v.id("forms"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError("Form not found");

    // Initialize canvas data if not present
    if (!form.nodes || form.nodes.length === 0) {
      return {
        nodes: [
          {
            id: "form-node-main",
            type: "form",
            position: { x: 0, y: 0 },
            data: {
              title: "Form",
              schema: form.schema,
              submitButtonText: form.submitButtonText || "Submit",
              successMessage: form.successMessage || "Thank you!",
              successRedirectUrl: form.successRedirectUrl,
            },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
    }

    return {
      nodes: form.nodes,
      edges: form.edges || [],
      viewport: form.viewport || { x: 0, y: 0, zoom: 1 },
    };
  },
});
```

### Phase 2: Canvas Infrastructure

#### 2.1 Form Canvas Provider (Following Campaign Pattern)

```tsx
// components/canvas/forms/provider.tsx
"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { FormCanvasControllerProvider } from "./controller/provider";

export const FormCanvasProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ReactFlowProvider>
      <FormCanvasControllerProvider>{children}</FormCanvasControllerProvider>
    </ReactFlowProvider>
  );
};
```

#### 2.2 Form Canvas Component (Exact Copy of Campaign Pattern)

```tsx
// components/canvas/forms/canvas.tsx
"use client";

import {
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react";

import {
  type Doc,
  type Id,
  api,
  useCachedQuery,
  useMutation,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Background } from "./background";
import { Controller } from "./controller/controller";
import { FormNode } from "./nodes/form-node";

const nodeTypes: NodeTypes = {
  form: FormNode,
};

// Custom styles for React Flow Canvas (same as campaign)
const customSelectionStyles = {
  "--xy-selection-background-color": "hsla(var(--brand) / 0.1)",
  "--xy-selection-border-default": "2px solid hsl(var(--brand))",
  "--xy-background-color-default": "hsl(var(--background))",
  "--xy-edge-stroke-default": "hsl(var(--primary))",
};

export const Canvas = ({
  formId,
  form,
}: {
  formId: Id<"forms">;
  form: Doc<"forms">;
}) => {
  const { theme } = useTheme();

  // Get canvas data from Convex (exactly like campaigns)
  const canvasData = useCachedQuery(
    api.collections.forms.queries.getFormCanvasData,
    { formId }
  );

  // Mutations with optimistic updates (exactly like campaigns)
  const updateNodes = useMutation(
    api.collections.forms.mutations.updateFormNodes
  ).withOptimisticUpdate((store, args) => {
    const canvasData = store.getQuery(
      api.collections.forms.queries.getFormCanvasData,
      { formId: args.formId }
    );
    if (canvasData) {
      const updatedNodes = applyNodeChanges(args.changes, canvasData.nodes);
      store.setQuery(
        api.collections.forms.queries.getFormCanvasData,
        { formId: args.formId },
        {
          ...canvasData,
          nodes: updatedNodes,
        }
      );
    }
  });

  // Get base nodes from canvas data
  const serverNodes = canvasData?.nodes || [];

  // Local state for nodes with selection handling (exactly like campaigns)
  const [localNodes, setLocalNodes] = useState<Node[]>(serverNodes);

  // Sync server data with local state (exactly like campaigns)
  useEffect(() => {
    if (!canvasData) return;

    setLocalNodes((prev) => {
      return serverNodes.map((serverNode) => {
        const existingLocal = prev.find((n) => n.id === serverNode.id);
        return {
          ...serverNode,
          selected: existingLocal?.selected || false, // Preserve selection state
        };
      });
    });
  }, [canvasData]);

  const nodes = localNodes;

  // Handlers (exactly like campaigns)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply all changes locally first
      setLocalNodes((prev) => applyNodeChanges(changes, prev));

      // Only send non-selection changes to server
      const nonSelectionChanges = changes.filter((c) => c.type !== "select");
      if (nonSelectionChanges.length > 0) {
        updateNodes({ formId, changes: nonSelectionChanges });
      }
    },
    [updateNodes, formId]
  );

  // Loading state
  if (!canvasData) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        style={{
          ...customSelectionStyles,
          width: "100%",
          height: "100%",
        }}
        colorMode={theme === "dark" ? "dark" : "light"}
        nodes={nodes}
        edges={[]} // No edges for forms
        fitViewOptions={{
          maxZoom: 1,
          padding: 0.4,
        }}
        maxZoom={3}
        fitView={true}
        onNodesChange={handleNodesChange}
        nodeTypes={nodeTypes}
        snapToGrid={true}
        snapGrid={[10, 10]}
      >
        <Background />
        <Controller />
      </ReactFlow>
    </div>
  );
};
```

### Phase 3: FormNode Implementation

#### 3.1 FormNode Component

```tsx
// components/canvas/forms/nodes/form-node.tsx
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { cn } from "@firebuzz/ui/lib/utils";
import { memo } from "react";
import { FormFieldsRenderer } from "../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/preview/form-renderer";

export interface FormNodeData {
  title: string;
  description?: string;
  schema: FormField[];
  submitButtonText: string;
  successMessage: string;
  successRedirectUrl?: string;
}

export const FormNode = memo(({ data, selected }: NodeProps<FormNodeData>) => {
  return (
    <div
      className={cn(
        "relative min-w-[400px] max-w-[600px]",
        selected && "ring-2 ring-brand ring-offset-2"
      )}
    >
      {/* Hidden handles for potential future connections */}
      <Handle type="target" position={Position.Top} className="invisible" />
      <Handle type="source" position={Position.Bottom} className="invisible" />

      <Card className="p-6 bg-background/95 backdrop-blur">
        {/* Node Header */}
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-lg font-semibold">{data.title}</h3>
          {data.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.description}
            </p>
          )}
        </div>

        {/* Form Fields - Reuse existing FormRenderer logic */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {data.schema.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields added yet</p>
              <p className="text-sm mt-2">Use the panel to add form fields</p>
            </div>
          ) : (
            <FormFieldsRenderer fields={data.schema} />
          )}
        </div>

        {/* Form Footer */}
        <div className="mt-4 pt-4 border-t">
          <Button className="w-full" size="sm">
            {data.submitButtonText || "Submit"}
          </Button>
        </div>
      </Card>
    </div>
  );
});

FormNode.displayName = "FormNode";
```

### Phase 4: Canvas Controller with AI Integration

#### 4.1 Form Canvas Controller (Copy Campaign Controller + Add AI)

```tsx
// components/canvas/forms/controller/controller.tsx
"use client";

import {
  Hand,
  Maximize,
  Minus,
  MousePointer,
  Plus,
  Sparkles,
} from "@firebuzz/ui/icons/lucide";

import {
  Panel,
  type PanelProps,
  useKeyPress,
  useReactFlow,
  useViewport,
} from "@xyflow/react";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipShortcut,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import { useEffect, useState } from "react";
import { useFormCanvasController } from "./provider";
import { AIFormGenerator } from "../../../../../app/(workspace)/(dashboard)/campaigns/[id]/form/_components/preview/ai-form-generator";

type ControllerProps = Omit<PanelProps, "children"> & {};

export function Controller({ className, ...props }: ControllerProps) {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const { mode, setMode } = useFormCanvasController();
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Keyboard shortcuts (same as campaign)
  const zoomOutPressed = useKeyPress(["Meta+ArrowDown", "Strg+ArrowDown"]);
  const zoomInPressed = useKeyPress(["Meta+ArrowUp", "Strg+ArrowUp"]);
  const resetZoomPressed = useKeyPress(["Meta+0", "Strg+0"]);
  const fitViewPressed = useKeyPress(["Meta+f", "Strg+f"]);
  const aiGeneratorPressed = useKeyPress(["Meta+g", "Strg+g"]);

  useEffect(() => {
    if (zoomOutPressed) {
      zoomOut({ duration: 300 });
    }
    if (zoomInPressed) {
      zoomIn({ duration: 300 });
    }
    if (resetZoomPressed) {
      zoomTo(1, { duration: 300 });
    }
    if (fitViewPressed) {
      fitView({ duration: 300, maxZoom: 2 });
    }
    if (aiGeneratorPressed && mode !== "drag") {
      setShowAIGenerator(true);
    }
  }, [
    zoomOutPressed,
    zoomInPressed,
    resetZoomPressed,
    fitViewPressed,
    aiGeneratorPressed,
    mode,
    fitView,
    zoomIn,
    zoomOut,
    zoomTo,
  ]);

  return (
    <>
      <Panel
        position="bottom-center"
        className={cn(
          "flex justify-between items-stretch rounded-lg border shadow-md dark:bg-muted bg-background",
          className
        )}
        {...props}
      >
        {/* Same controls as campaign canvas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-none border-none size-8"
              onClick={() => zoomOut({ duration: 300 })}
            >
              <Minus className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Zoom out <TooltipShortcut>⌘ ↓</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-none border-none size-8"
              onClick={() => zoomIn({ duration: 300 })}
            >
              <Plus className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Zoom in <TooltipShortcut>⌘ ↑</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-8 tabular-nums rounded-none border-none min-w-20"
              variant="ghost"
              onClick={() => zoomTo(1, { duration: 300 })}
            >
              {(100 * zoom).toFixed(0)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Reset zoom <TooltipShortcut>⌘ 0</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-none border-none size-8"
              onClick={() => fitView({ duration: 300, maxZoom: 2 })}
            >
              <Maximize className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Fit view <TooltipShortcut>⌘ F</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        {/* Mode controls (same as campaign) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "size-8 rounded-none border-none",
                mode === "select" && "text-brand hover:text-brand"
              )}
              onClick={() => setMode("select")}
            >
              <MousePointer className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Select Mode <TooltipShortcut>V</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "size-8 rounded-none border-none",
                mode === "drag" && "text-brand hover:text-brand"
              )}
              onClick={() => setMode("drag")}
            >
              <Hand className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Drag Mode <TooltipShortcut>H</TooltipShortcut>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-8 bg-border" />

        {/* AI Generator Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "size-8 rounded-none border-none text-brand hover:text-brand"
              )}
              onClick={() => setShowAIGenerator(true)}
            >
              <Sparkles className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={10}>
            AI Form Generator <TooltipShortcut>⌘ G</TooltipShortcut>
          </TooltipContent>
        </Tooltip>
      </Panel>

      {/* AI Generator Integration */}
      {showAIGenerator && (
        <AIFormGenerator
          isVisible={showAIGenerator}
          existingSchema={[]} // Get from node data
          onSchemaUpdate={(schema, submitButtonText, successMessage) => {
            // Update node data via canvas mutations
            setShowAIGenerator(false);
          }}
        />
      )}
    </>
  );
}
```

### Phase 5: Panel Integration - Reuse Existing UI

#### 5.1 Form Panel (Adapt Existing Panel, Don't Recreate)

```tsx
// apps/app/src/app/(workspace)/(dashboard)/campaigns/[id]/form/_components/panel/panel.tsx
// UPDATE EXISTING FILE - Don't create new one

"use client";

import { useNodes } from "@xyflow/react"; // NEW IMPORT
import { useMemo } from "react"; // NEW IMPORT
// Keep all existing imports...

export const Panel = ({ campaignId }: PanelProps) => {
  // NEW: Canvas integration
  const nodes = useNodes();

  const formNode = useMemo(
    () => nodes?.find((n) => n.type === "form" && n.selected),
    [nodes]
  );

  // NEW: If we have canvas nodes, use canvas data instead of Jotai
  if (nodes && nodes.length > 0) {
    if (!formNode || !formNode.selected) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>Select the form to edit settings</p>
        </div>
      );
    }

    // Use formNode.data instead of Jotai atoms for canvas mode
    // All existing panel components work the same, just change data source
  }

  // EXISTING: Keep all existing panel logic for non-canvas mode
  // This ensures backward compatibility
  // ... existing code remains unchanged ...
};
```

#### Key Panel Integration Notes:

1. **Don't recreate panel UI** - Modify existing components
2. **Detect canvas mode** - Check if `useNodes()` returns data
3. **Switch data source** - Use node data instead of Jotai atoms
4. **Keep backward compatibility** - Original panel logic for non-canvas
5. **Same UI/UX** - Users see no difference in panel interface

---

## Code Examples

### Example: Page Integration

```tsx
// apps/app/src/app/(workspace)/(dashboard)/campaigns/[id]/form/page.tsx
// UPDATE EXISTING PAGE

"use client";

import { FormCanvasProvider, Canvas } from "@/components/canvas/forms";
import { Panel } from "./_components/panel/panel";
// Keep other existing imports...

export default function FormPage({ params }: { params: { id: string } }) {
  // Keep existing form data loading logic...

  return (
    <FormCanvasProvider>
      <div className="flex h-screen">
        {/* Canvas Side */}
        <div className="flex-1">
          <Canvas formId={formData._id} form={formData} />
        </div>

        {/* Panel Side - Same as before */}
        <div className="w-96 border-l">
          <Panel campaignId={campaignId} />
        </div>
      </div>
    </FormCanvasProvider>
  );
}
```

### Example: Panel Data Switching

```typescript
// In existing panel components, switch between Jotai and Canvas data
const useFormData = () => {
  const nodes = useNodes();
  const [formData] = useAtom(formDataAtom); // Existing Jotai

  // Use canvas data if available, otherwise fall back to Jotai
  const formNode = nodes?.find((n) => n.type === "form");

  if (formNode) {
    return {
      schema: formNode.data.schema,
      submitButtonText: formNode.data.submitButtonText,
      // ... other form data from canvas node
    };
  }

  // Fallback to existing Jotai data
  return formData;
};
```

### Example: Canvas Node Updates (Reactive - No Save Hooks)

```typescript
// Everything is reactive through Convex mutations (like campaigns)
const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
  const formNode = nodes.find((n) => n.type === "form");
  if (!formNode) return;

  const updatedSchema = formNode.data.schema.map((field) =>
    field.id === fieldId ? { ...field, ...updates } : field
  );

  const nodeChange: NodeChange = {
    type: "replace",
    id: formNode.id,
    item: {
      ...formNode,
      data: { ...formNode.data, schema: updatedSchema },
    },
  };

  // This automatically syncs to Convex with optimistic updates
  updateNodes({ formId, changes: [nodeChange] });
  // NO manual save hooks needed - everything is reactive!
};
```

### Example: Form Initialization

```typescript
// getFormCanvasData query initializes canvas data
export const getFormCanvasData = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, { formId }) => {
    const form = await ctx.db.get(formId);
    if (!form) throw new ConvexError("Form not found");

    // If no canvas data exists, create default FormNode
    if (!form.nodes || form.nodes.length === 0) {
      return {
        nodes: [
          {
            id: "form-node-main",
            type: "form",
            position: { x: 0, y: 0 },
            data: {
              title: "Form",
              schema: form.schema, // Migrate existing schema
              submitButtonText: form.submitButtonText || "Submit",
              successMessage: form.successMessage || "Thank you!",
              successRedirectUrl: form.successRedirectUrl,
            },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
    }

    return {
      nodes: form.nodes,
      edges: form.edges || [],
      viewport: form.viewport || { x: 0, y: 0, zoom: 1 },
    };
  },
});
```

---

## Summary

This updated plan focuses on the correct implementation approach:

### Key Points

1. **Follow Campaign Canvas Pattern**: Exact same structure and sync logic
2. **No Auto-Save Hooks**: Everything reactive through Convex mutations with optimistic updates
3. **Reuse Existing Panel UI**: Don't recreate, just adapt data source
4. **Location**: Canvas components in `@apps/app/src/components/canvas/forms/`
5. **No Jotai**: Direct React state + Convex (like campaigns)
6. **Single FormNode**: Contains all fields in one node

### Implementation Steps

1. **Database Schema**: Add canvas fields to forms table
2. **Canvas Infrastructure**: Copy campaign canvas structure
3. **FormNode**: Single node with all form fields
4. **Controller**: Add AI generation to canvas controller
5. **Panel Integration**: Modify existing panels to use canvas data

### Benefits of This Approach

- **Consistent Architecture**: Same patterns as campaigns
- **Proven Sync Logic**: Leverages working campaign canvas sync
- **Minimal UI Changes**: Users see same interface
- **Reactive Updates**: No manual save management needed
- **Easy Maintenance**: Unified canvas patterns across features

---

## Conclusion

This implementation plan provides a focused roadmap for integrating React Canvas into the form editing feature by exactly following the campaign canvas patterns. The approach ensures:

- **Minimal Development Effort**: Reuse existing canvas infrastructure and panel UI
- **Proven Architecture**: Leverage battle-tested campaign canvas sync patterns
- **Consistent User Experience**: Same canvas interaction patterns across campaigns and forms
- **Reactive Data Flow**: All updates automatically synced to Convex with optimistic updates
- **Maintainable Codebase**: Unified canvas patterns reduce complexity

The single FormNode design simplifies the implementation while maintaining all existing form functionality within a visual canvas interface.

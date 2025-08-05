# Canvas React Flow Refactor with Convex Optimistic Updates

## Overview
Refactor the current auto-save system in `canvas.tsx` to use Convex optimistic updates pattern, eliminating manual save logic and providing immediate UI feedback.

## Current State Analysis
- **Client**: Uses `useNodesState`/`useEdgesState` + `useAutoSave` with 5s debounced saves
- **Server**: Single `config` object containing nodes, edges, viewport in campaigns table
- **Issues**: Manual save triggering, delayed feedback, complex state management

## Refactor Strategy

### 1. Schema Changes (`/packages/convex/convex/collections/campaigns/schema.ts`)

**Update campaigns table structure:**
Replace the single `config` object with separate columns:
```typescript
export const campaignSchema = defineTable(
  v.object({
    // ... existing fields (title, description, etc.)
    
    // Replace config object with separate columns
    nodes: v.array(nodeSchema),      // All nodes as array
    edges: v.array(edgeSchema),      // All edges as array  
    viewport: viewportSchema,        // Viewport object
    
    // ... rest of existing fields
  })
)
// ... existing indexes
```

**Benefits of this approach:**
- Single query to get all canvas data
- Simpler than separate tables
- Still enables optimistic updates on arrays
- Matches React Flow's expected data structure

### 2. Server-Side Changes (`/packages/convex/convex/collections/campaigns/`)

**New Mutations to Create:**
- `updateNodes.ts` - Handle node changes with optimistic updates on nodes array
- `updateEdges.ts` - Handle edge changes with optimistic updates on edges array
- `updateViewport.ts` - Handle viewport changes
- `connectEdge.ts` - Create new edge connections

**New Queries to Create:**
- `getNodes.ts` - Get nodes array for a campaign
- `getEdges.ts` - Get edges array for a campaign
- `getViewport.ts` - Get viewport for a campaign
- `getCanvasData.ts` - Get all canvas data (nodes, edges, viewport) in one query

**Validation Schemas:**
- Create `nodeChangeValidator` and `edgeChangeValidator` based on React Flow types
- Create `connectionValidator` for new edge connections
- Reuse existing `nodeSchema`, `edgeSchema`, `viewportSchema`

### 3. Client-Side Changes (`/apps/app/src/components/canvas/campaign/canvas.tsx`)

**Replace Current State Management:**
- Remove `useNodesState`, `useEdgesState` 
- Replace with `useQuery` for getting nodes, edges, viewport arrays
- Remove `useAutoSave` hook and all `triggerAutoSave()` calls

**New Mutation Hooks with Optimistic Updates:**
- `updateNodes` - with optimistic updates using `applyNodeChanges` on nodes array
- `updateEdges` - with optimistic updates using `applyEdgeChanges` on edges array
- `updateViewport` - direct viewport updates
- `connectEdge` - for new edge connections

**Handler Updates:**
- `onNodesChange` - call `updateNodes` mutation directly
- `onEdgesChange` - call `updateEdges` mutation directly
- `onConnect` - call `connectEdge` mutation
- Node creation (notes) - call `updateNodes` with new node
- Remove all save status and manual save logic

### 3. Key Implementation Details

**Optimistic Update Pattern:**
```typescript
const updateNodes = useMutation(api.collections.campaigns.updateNodes)
  .withOptimisticUpdate((store, args) => {
    const campaign = store.getQuery(api.collections.campaigns.getById, { id: args.campaignId });
    if (campaign) {
      const updatedNodes = applyNodeChanges(args.changes, campaign.nodes);
      store.setQuery(api.collections.campaigns.getById, { id: args.campaignId }, {
        ...campaign,
        nodes: updatedNodes
      });
    }
  });
```

**Pending State Handling:**
- Filter out changes to nodes/edges with IDs starting with "pending-"
- Handle placeholder nodes and temporary states properly
- Maintain all existing business logic for AB testing, traffic weights, etc.

**Viewport Strategy:**
- Keep viewport updates debounced (less frequent than nodes/edges)
- Or update only on significant changes (pan end, zoom end)

### 4. Business Logic Preservation

**Maintain All Existing Logic:**
- Node deletion restrictions (traffic nodes, control variants)
- AB test variant management and traffic distribution
- Parent-child node relationships and position calculations
- Placeholder node handling and cleanup
- Complex validation rules

**Error Handling:**
- Replace auto-save error toasts with mutation error handling
- Maintain existing error messages and user feedback

### 5. Migration & Data Handling

**Initial Campaign Creation:**
- Update `campaigns/mutations.ts` create function to initialize separate collections
- Create initial traffic node in `campaignNodes` collection
- Create initial viewport in `campaignViewports` collection

**Migration for Existing Campaigns:**
- Create migration function to move existing `config` data to new column structure
- Extract `config.nodes` → move to `nodes` column
- Extract `config.edges` → move to `edges` column
- Extract `config.viewport` → move to `viewport` column
- Remove old `config` column after migration

**Testing Strategy:**
- Verify all node operations work correctly
- Test complex scenarios (AB testing, variant deletion, etc.)
- Ensure no data loss during operations
- Performance testing with large diagrams
- Test migration script with existing campaign data

## Benefits
- ✅ Immediate UI feedback with optimistic updates
- ✅ Eliminates complex auto-save logic
- ✅ Better error handling and retry capabilities  
- ✅ Reduced client-side state management complexity
- ✅ More responsive user experience
- ✅ Automatic synchronization with server state

## Files to Modify

### Schema Changes
- **Update**: `campaigns/schema.ts` - replace config object with nodes, edges, viewport columns

### Server-Side (New Files)
- **Create**: `campaigns/getNodes.ts` - query to get nodes array for campaign
- **Create**: `campaigns/getEdges.ts` - query to get edges array for campaign
- **Create**: `campaigns/getViewport.ts` - query to get viewport for campaign
- **Create**: `campaigns/getCanvasData.ts` - query to get all canvas data at once
- **Create**: `campaigns/updateNodes.ts` - mutation to update nodes array with optimistic updates
- **Create**: `campaigns/updateEdges.ts` - mutation to update edges array with optimistic updates
- **Create**: `campaigns/updateViewport.ts` - mutation to update viewport
- **Create**: `campaigns/connectEdge.ts` - mutation to create new edge connections
- **Create**: `campaigns/types.ts` - validation schemas for React Flow changes
- **Update**: `campaigns/mutations.ts` - update create function for new schema

### Client-Side Changes  
- **Major Refactor**: `canvas.tsx` - replace state management with Convex queries/mutations
- **Remove**: `use-auto-save.ts` hook (no longer needed)
- **Update**: `save-status.tsx` component (simplify or remove)

### Migration
- **Create**: Migration script to move existing config data to new column structure
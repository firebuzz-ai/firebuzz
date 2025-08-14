# Campaign Status Button Implementation Plan

## Overview
Create a comprehensive campaign status management system that handles 5 campaign states (draft, preview, scheduled, published, completed) with a dropdown button similar to the publish-button pattern, including scheduling capabilities and multi-domain publishing.

## Campaign Status Flow
```
DRAFT → PREVIEW → SCHEDULED/PUBLISHED → COMPLETED
  ↓        ↓           ↓                    ↓
  |        |           |                    |
  |        ↓           ↓                    |
  |    PUBLISHED ←  PUBLISHED              |
  |        ↓           ↓                    |
  |        ↓           ↓                    |
  └────────┴───────────┴────────────────────┘
```

## File Structure

### New Files to Create:
1. **`/apps/app/src/components/navigation/campaign/campaign-status-button.tsx`**
   - Main status button component with dropdown
   - Status indicator with color coding
   - Dynamic content based on campaign status

2. **`/apps/app/src/components/navigation/campaign/schedule-dialog.tsx`**
   - Date and time picker dialog
   - Timezone handling
   - Validation for future dates

3. **`/packages/convex/convex/collections/campaigns/scheduled.ts`**
   - Scheduled functions for automatic publishing
   - Internal mutations for scheduled tasks

### Files to Modify:
1. **`/packages/convex/convex/collections/campaigns/mutations.ts`**
   - Add new mutations for all status transitions
   - Update existing publish mutations

2. **`/apps/app/src/components/navigation/campaign/tabs.tsx`**
   - Replace existing publish button with new status button

## Status-Specific UI Layouts

### 1. DRAFT Status
```
┌─────────────────────────────────┐
│ 🟢 Draft                        │
├─────────────────────────────────┤
│ Preview URL                     │
│ [Empty state - not available]   │
├─────────────────────────────────┤
│ ℹ️ Publish to preview first to  │
│    test your campaign            │
├─────────────────────────────────┤
│ [Publish to Preview] button     │
└─────────────────────────────────┘
```

**Features:**
- Only "Publish to Preview" button available
- Empty state for URLs
- Info box explaining next steps

### 2. PREVIEW Status
```
┌─────────────────────────────────┐
│ 🔵 Preview Published            │
├─────────────────────────────────┤
│ Preview URL                     │
│ [URL with copy button]          │
│ ↳ Published 2 hours ago         │
├─────────────────────────────────┤
│ Production URLs (pending)       │
│ • workspace.getfirebuzz.com/... │
│ • custom-domain.com/...         │
├─────────────────────────────────┤
│ [Update Preview] [Schedule] [Publish Now] │
└─────────────────────────────────┘
```

**Features:**
- Show preview URL with last published time
- Show pending production URLs
- Three action buttons: Update Preview, Schedule, Publish Now

### 3. SCHEDULED Status
```
┌─────────────────────────────────┐
│ 🟡 Scheduled for Production     │
├─────────────────────────────────┤
│ Scheduled: Dec 25, 2024 9:00 AM │
├─────────────────────────────────┤
│ Preview URL (active)            │
│ [URL with copy button]          │
├─────────────────────────────────┤
│ Will publish to:                │
│ • workspace.getfirebuzz.com/... │
│ • custom-domain.com/...         │
├─────────────────────────────────┤
│ [Reschedule] [Cancel] [Publish Now] │
└─────────────────────────────────┘
```

**Features:**
- Show scheduled date and time
- Preview URL still active
- Show where it will be published
- Three action buttons: Reschedule, Cancel Schedule, Publish Now

### 4. PUBLISHED Status
```
┌─────────────────────────────────┐
│ 🟢 Published to Production      │
├─────────────────────────────────┤
│ Preview URLs                    │
│ [Preview URL] - Updated 1hr ago │
├─────────────────────────────────┤
│ Production URLs (active)        │
│ • workspace.getfirebuzz.com/... │
│ • custom-domain.com/...         │
│ ↳ Published 2 days ago         │
├─────────────────────────────────┤
│ [Update Preview] [Republish] [Mark Complete] │
└─────────────────────────────────┘
```

**Features:**
- Two sections: Preview and Production URLs
- Show all active domains
- Three action buttons: Update Preview, Republish to Production, Mark as Completed

### 5. COMPLETED Status
```
┌─────────────────────────────────┐
│ 🔴 Campaign Completed           │
├─────────────────────────────────┤
│ Completed: Dec 30, 2024         │
├─────────────────────────────────┤
│ Archived URLs                   │
│ • Preview URL                   │
│ • Production URLs               │
├─────────────────────────────────┤
│ [Reactivate Campaign]           │
└─────────────────────────────────┘
```

**Features:**
- Show completion date
- Display archived URLs
- Single action: Reactivate Campaign

## Mutations Implementation

### 1. publishToPreview Mutation (Update)
```typescript
args: { id: v.id("campaigns") }

Logic:
- Validate campaign (slug, landing pages, form if lead-gen)
- Store config in KV: `campaign:preview:${id}`
- Update campaign:
  - status: "preview"
  - previewPublishedAt: timestamp
  - urlConfig.previewUrl: `${process.env.PREVIEW_URL}/campaign/${id}`
```

### 2. publishToProduction Mutation (New)
```typescript
args: { 
  id: v.id("campaigns"),
  domainIds: v.optional(v.array(v.id("domains")))
}

Logic:
- Validate campaign and domains
- Fetch workspace and project
- Generate production URLs:
  - Workspace: `${workspace.slug}.getfirebuzz.com/${project.slug}/${campaign.slug}`
  - Custom: `${domain.hostname}/${campaign.slug}` (for each active domain)
- Store configs in KV for each URL
- Update campaign:
  - status: "published"
  - publishedAt: timestamp
  - urlConfig.productionUrls: array of URL objects
```

### 3. schedulePublish Mutation (New)
```typescript
args: { 
  id: v.id("campaigns"),
  scheduledAt: v.string(), // ISO date string
  domainIds: v.optional(v.array(v.id("domains")))
}

Logic:
- Validate future date
- Create scheduled function:
  const scheduledId = await ctx.scheduler.runAt(
    new Date(scheduledAt),
    internal.collections.campaigns.scheduled.publishToProduction,
    { campaignId: id, domainIds }
  )
- Update campaign:
  - status: "scheduled"
  - scheduledAt: scheduled date
  - scheduledId: function ID
```

### 4. reschedulePublish Mutation (New)
```typescript
args: { 
  id: v.id("campaigns"),
  newScheduledAt: v.string(),
  domainIds: v.optional(v.array(v.id("domains")))
}

Logic:
- Cancel existing scheduled function using scheduledId
- Create new scheduled function
- Update scheduledAt and scheduledId
```

### 5. cancelSchedule Mutation (New)
```typescript
args: { id: v.id("campaigns") }

Logic:
- Cancel scheduled function using scheduledId
- Update campaign:
  - status: "preview"
  - scheduledAt: undefined
  - scheduledId: undefined
```

### 6. markAsCompleted Mutation (New)
```typescript
args: { id: v.id("campaigns") }

Logic:
- Update campaign:
  - status: "completed"
  - isCompleted: true
  - completedAt: timestamp
```

### 7. reactivateCampaign Mutation (New)
```typescript
args: { id: v.id("campaigns") }

Logic:
- Update campaign:
  - status: "published"
  - isCompleted: false
  - completedAt: undefined
```

## Schedule Dialog Component

### Features:
- DatePicker component (existing from @firebuzz/ui)
- Time selector (hours/minutes dropdown)
- Timezone display (user's local timezone)
- Minimum date validation (must be future)
- Clear schedule summary: "Will publish on Dec 25, 2024 at 9:00 AM PST"
- Confirm/Cancel buttons

### Component Structure:
```typescript
interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  currentScheduledAt?: string;
  isReschedule?: boolean;
}
```

## Status Configuration

### Status Colors and Icons:
```typescript
const statusConfig = {
  draft: { 
    color: "bg-gray-500", 
    label: "Draft", 
    icon: FileText,
    textColor: "text-gray-600"
  },
  preview: { 
    color: "bg-blue-500", 
    label: "Preview", 
    icon: Eye,
    textColor: "text-blue-600"
  },
  scheduled: { 
    color: "bg-amber-500", 
    label: "Scheduled", 
    icon: Clock,
    textColor: "text-amber-600"
  },
  published: { 
    color: "bg-green-500", 
    label: "Published", 
    icon: CheckCircle,
    textColor: "text-green-600"
  },
  completed: { 
    color: "bg-emerald-600", 
    label: "Completed", 
    icon: Flag,
    textColor: "text-emerald-600"
  }
};
```

## URL Configuration

### URL Generation Patterns:
- **Preview URL**: `${process.env.PREVIEW_URL}/campaign/${campaignId}`
- **Workspace URL**: `${workspace.slug}.getfirebuzz.com/${project.slug}/${campaign.slug}`
- **Custom Domain URL**: `${domain.hostname}/${campaign.slug}`

### URL Storage in Schema:
```typescript
urlConfig: v.optional(
  v.object({
    previewUrl: v.optional(v.string()),
    productionUrls: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal("custom"), v.literal("workspace")),
          url: v.string(),
          domainId: v.optional(v.id("domains")),
        })
      )
    ),
  })
)
```

## Validation Requirements

### Before Publishing to Preview:
- Campaign must have a slug (min 3 chars)
- Slug must be unique within project
- If lead-generation: must have a form
- Must have at least one landing page in canvas
- All landing pages must be published

### Before Publishing to Production:
- Must be in preview status first
- At least one domain must be active (workspace domain always available)
- All landing pages must be published
- Campaign must be validated (no errors in validation.ts)

### Before Scheduling:
- All production requirements met
- Scheduled date must be in future (at least 5 minutes)
- No existing schedule conflict

## Integration with Campaign Tabs

### Replace existing button in tabs.tsx:
```typescript
// Remove this:
<Button
  variant="outline"
  size="sm"
  onClick={handlePublish}
  disabled={isDisabled}
>
  Publish
  <ButtonShortcut>⌘↵</ButtonShortcut>
</Button>

// Replace with:
<CampaignStatusButton 
  campaignId={id}
/>
```

## Component Props and Hooks

### CampaignStatusButton Props:
```typescript
interface CampaignStatusButtonProps {
  campaignId: Id<"campaigns">;
}
```

### Required Queries:
```typescript
// In the component:
const campaign = useQuery(api.collections.campaigns.queries.getById, { id: campaignId });
const workspace = useQuery(api.collections.workspaces.queries.getCurrent);
const project = useQuery(api.collections.projects.queries.getById, { id: campaign?.projectId });
const domains = useQuery(api.collections.domains.queries.getActiveByProject, { projectId: campaign?.projectId });
```

### Required Mutations:
```typescript
const publishToPreview = useMutation(api.collections.campaigns.mutations.publishToPreview);
const publishToProduction = useMutation(api.collections.campaigns.mutations.publishToProduction);
const schedulePublish = useMutation(api.collections.campaigns.mutations.schedulePublish);
const reschedulePublish = useMutation(api.collections.campaigns.mutations.reschedulePublish);
const cancelSchedule = useMutation(api.collections.campaigns.mutations.cancelSchedule);
const markAsCompleted = useMutation(api.collections.campaigns.mutations.markAsCompleted);
const reactivateCampaign = useMutation(api.collections.campaigns.mutations.reactivateCampaign);
```

## Error Handling

### Validation Errors:
- Show specific messages in toast
- Highlight missing requirements
- Provide actionable next steps

### Network Errors:
- Retry with exponential backoff
- Show "Try again" button
- Graceful degradation

### Permission Errors:
- Check workspace access
- Verify user permissions
- Clear error messages

### Domain Errors:
- Validate domain status before publish
- Show domain setup instructions
- Handle SSL/verification issues

### Scheduling Conflicts:
- Prevent double scheduling
- Clear existing schedules before new ones
- Handle timezone conversions properly

## Success Metrics

### Functionality:
- [ ] All 5 statuses properly handled
- [ ] Smooth transitions between states
- [ ] Scheduling works reliably
- [ ] Multiple domain publishing works
- [ ] URL generation is correct

### User Experience:
- [ ] Clear user feedback at each step
- [ ] Intuitive button states
- [ ] Helpful error messages
- [ ] Loading states are smooth
- [ ] Keyboard shortcuts work

### Technical:
- [ ] Proper TypeScript typing
- [ ] No console errors
- [ ] Optimistic updates work
- [ ] Toast notifications are clear
- [ ] Performance is good

## Implementation Order

1. **Update schema fields** (ensure all fields exist in campaign schema)
2. **Create mutations** (publishToPreview, publishToProduction, etc.)
3. **Create scheduled functions** (internal mutations for scheduler)
4. **Create ScheduleDialog component**
5. **Create CampaignStatusButton component**
6. **Update CampaignTabs to use new button**
7. **Test all status transitions**
8. **Add error handling and validation**
9. **Polish UI and animations**
10. **Add keyboard shortcuts and accessibility**

## Notes

- Follow existing patterns from publish-button.tsx
- Use CVA for component variants
- Use cn() for className merging
- Use toast for all user feedback
- Implement optimistic updates where appropriate
- Add proper loading states for all async operations
- Ensure proper TypeScript types throughout
- Test with both lead-generation and click-through campaigns
- Test with multiple custom domains
- Test scheduling edge cases (past dates, conflicts, etc.)
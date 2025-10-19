# 📋 Comprehensive Plan: v0-Style Visual Editor + Theme Integration

## Overview
We'll build a complete visual editing system with two modes:
1. **Element Mode**: Selected element → v0-style controls (Typography, Colors, Layout, Spacing, Border)
2. **Theme Mode**: No selection → Theme editor using existing components from `/brand/themes/`

---

## Phase 1: Element Editor Enhancement (v0-Style Controls)

### 1.1 Research & Mapping
**Goal**: Map v0's UI controls to Tailwind classes

**Tasks**:
- Analyze v0 screenshots to identify all control types
- Create mapping tables for each control category:
  - Typography: Font family, weight, size, line height, letter spacing, alignment, decoration
  - Colors: System (theme tokens), Tailwind palette, Custom hex
  - Layout: Direction, alignment, justification, gap
  - Spacing: Margin, padding (4-directional)
  - Border: Width, style, color, radius

**File to create**: `apps/app/src/lib/design-mode/tailwind-mappings.ts`
```typescript
export const FONT_SIZE_OPTIONS = [
  { label: "Extra Small", value: "text-xs" },
  { label: "Small", value: "text-sm" },
  { label: "Base", value: "text-base" },
  // ... all sizes
];

export const FONT_WEIGHT_OPTIONS = [
  { label: "Regular", value: "font-normal" },
  { label: "Medium", value: "font-medium" },
  // ... all weights
];
// ... all mappings
```

### 1.2 Reusable Control Components
**Goal**: Build v0-style UI controls as reusable components

**Files to create**:

1. `apps/app/src/components/chat-v2/design-mode/controls/typography-controls.tsx`
   - Font family dropdown (sans/serif/mono)
   - Font weight dropdown (with icons)
   - Font size dropdown (semantic sizes)
   - Line height input
   - Letter spacing dropdown
   - Text alignment buttons (icon row)
   - Text decoration buttons (italic, underline, strikethrough)

2. `apps/app/src/components/chat-v2/design-mode/controls/color-selector.tsx`
   - Tabs: System, Tailwind, Custom
   - **System tab**: List theme tokens (primary, secondary, background, etc.) with color preview circles
   - **Tailwind tab**: Color grid (red-500, blue-600, etc.)
   - **Custom tab**: Hex input + color picker
   - Props: `value`, `onChange`, `type` (text/background/border)

3. `apps/app/src/components/chat-v2/design-mode/controls/layout-controls.tsx`
   - Direction toggle (horizontal/vertical icons)
   - Alignment icon buttons (start/center/end)
   - Justification dropdown
   - Gap input with Tailwind scale

4. `apps/app/src/components/chat-v2/design-mode/controls/spacing-controls.tsx`
   - Margin section: 4 inputs (top, right, bottom, left) with lock icon
   - Padding section: 4 inputs with lock icon
   - Link button to sync all values

5. `apps/app/src/components/chat-v2/design-mode/controls/border-controls.tsx`
   - Width dropdown
   - Style dropdown
   - Color selector (reuse ColorSelector component)
   - Radius dropdown

### 1.3 Class Parser & Updater
**Goal**: Parse existing className, update specific properties, regenerate className

**File to create**: `apps/app/src/lib/design-mode/class-utils.ts`
```typescript
export function parseClassName(className: string): {
  fontSize?: string;
  fontWeight?: string;
  textColor?: string;
  backgroundColor?: string;
  // ... all properties
}

export function updateClassName(
  currentClassName: string,
  updates: Partial<ReturnType<typeof parseClassName>>
): string {
  // Parse current classes
  // Apply updates
  // Remove conflicting classes (e.g., text-sm when adding text-lg)
  // Return new className string
}
```

### 1.4 Enhanced Element Editor UI
**Goal**: Rebuild element-editor.tsx with collapsible sections like v0

**File to update**: `apps/app/src/components/chat-v2/design-mode/element-editor.tsx`

**New structure**:
```tsx
<ScrollArea>
  {/* Typography Section */}
  <Collapsible defaultOpen>
    <CollapsibleTrigger>
      <h3>Typography</h3>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <TypographyControls
        value={parsedClasses}
        onChange={(updates) => {
          const newClassName = updateClassName(className, updates);
          handleRealtimeUpdate({ className: newClassName });
        }}
      />
    </CollapsibleContent>
  </Collapsible>

  {/* Color Section */}
  <Collapsible>
    <CollapsibleTrigger>Color</CollapsibleTrigger>
    <CollapsibleContent>
      <Label>Text Color</Label>
      <ColorSelector
        value={parsedClasses.textColor}
        onChange={(color) => {
          const newClassName = updateClassName(className, { textColor: color });
          handleRealtimeUpdate({ className: newClassName });
        }}
        type="text"
      />
      <Label>Background</Label>
      <ColorSelector
        value={parsedClasses.backgroundColor}
        onChange={(color) => {
          const newClassName = updateClassName(className, { backgroundColor: color });
          handleRealtimeUpdate({ className: newClassName });
        }}
        type="background"
      />
    </CollapsibleContent>
  </Collapsible>

  {/* Layout Section */}
  <Collapsible>
    <CollapsibleTrigger>Layout</CollapsibleTrigger>
    <CollapsibleContent>
      <LayoutControls ... />
    </CollapsibleContent>
  </Collapsible>

  {/* Spacing Section */}
  <Collapsible>
    <CollapsibleTrigger>Spacing</CollapsibleTrigger>
    <CollapsibleContent>
      <SpacingControls ... />
    </CollapsibleContent>
  </Collapsible>

  {/* Border Section */}
  <Collapsible>
    <CollapsibleTrigger>Border</CollapsibleTrigger>
    <CollapsibleContent>
      <BorderControls ... />
    </CollapsibleContent>
  </Collapsible>
</ScrollArea>
```

---

## Phase 2: Theme Editor Integration

### 2.1 Detect No Selection State
**Goal**: Show theme editor when no element is selected

**File to update**: `apps/app/src/components/chat-v2/design-mode/element-editor.tsx`

**Logic**:
```tsx
export const DesignModeEditor = () => {
  const { selectedElement } = useDesignMode();

  if (!selectedElement) {
    return <ThemeEditor />;
  }

  return <ElementEditor />;
};
```

### 2.2 Theme Editor Component
**Goal**: Reuse existing theme form components for consistency

**File to create**: `apps/app/src/components/chat-v2/design-mode/theme-editor.tsx`

**Approach**: Adapt existing components from `/brand/themes/_components/theme/`
- Import `ColorsSection`, `RadiusSection`, `TypographySection` from existing theme form
- Wrap in design mode context
- Add "Apply to Page" and "Save Theme" buttons

**Structure**:
```tsx
export const ThemeEditor = () => {
  const { iframeRef, isPreviewIframeLoaded } = useSandbox();
  const { session } = useAgentSession();
  const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">("light");

  // Get current landing page's theme (or default)
  const currentTheme = useCurrentPageTheme();

  const form = useForm<ThemeFormType>({
    defaultValues: currentTheme || defaultTheme
  });

  // Watch form changes and update iframe in real-time
  const formValues = form.watch();
  useEffect(() => {
    if (formValues && iframeRef.current?.contentWindow) {
      updateThemeInIframe(formValues, previewThemeMode);
    }
  }, [formValues, previewThemeMode]);

  return (
    <ScrollArea>
      <div className="p-4 space-y-4">
        {/* Theme Mode Toggle */}
        <div className="flex items-center justify-between">
          <Label>Preview Mode</Label>
          <ToggleGroup type="single" value={previewThemeMode} onValueChange={setPreviewThemeMode}>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        {/* Reuse existing sections */}
        <Form {...form}>
          <ColorsSection
            form={form}
            previewThemeMode={previewThemeMode}
            // Remove workspace/brand context since we're in design mode
            isDesignMode={true}
          />

          <RadiusSection form={form} />

          <TypographySection form={form} />

          <TemplateSection form={form} />
        </Form>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleSaveTheme}
            className="w-full"
          >
            <Save className="size-4 mr-2" />
            Save Theme to Files
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveAsNewTheme}
            className="w-full"
          >
            <Plus className="size-4 mr-2" />
            Save as New Theme
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};
```

### 2.3 Adapt Existing Theme Components
**Goal**: Make existing components work in design mode context

**Files to update**:

1. `apps/app/src/app/(workspace)/(dashboard)/brand/themes/_components/theme/colors-section.tsx`
   - Add `isDesignMode` prop
   - Skip workspace/brand queries when in design mode
   - Keep all UI and color picker logic

2. `apps/app/src/app/(workspace)/(dashboard)/brand/themes/_components/theme/radius-section.tsx`
   - No changes needed (already self-contained)

3. `apps/app/src/app/(workspace)/(dashboard)/brand/themes/_components/theme/typography-section.tsx`
   - Add `isDesignMode` prop
   - Use simplified font options in design mode

**Pattern**:
```tsx
export const ColorsSection = ({
  form,
  previewThemeMode,
  isDesignMode = false // NEW PROP
}) => {
  // Conditionally skip workspace queries
  const workspace = isDesignMode ? null : useWorkspace();

  // Rest of component stays the same
  return (/* ... existing UI ... */);
};
```

---

## Phase 3: Real-Time Theme Updates to Iframe

### 3.1 Theme Update Message Handler (Iframe Side)
**Goal**: Apply theme changes to iframe without reloading

**File to update**: `templates/clean/src/design-mode/overlay.ts`

**Changes**:
```typescript
// 1. Add new message type
interface DesignModeMessage {
  type: "ENABLE_DESIGN_MODE" | "DISABLE_DESIGN_MODE" | "FB_UPDATE_ELEMENT" | "FB_UPDATE_THEME";
  // ... existing fields
  theme?: {
    mode: "light" | "dark";
    variables: Record<string, string>; // CSS variables
  };
}

// 2. Add handler in listen()
private listen() {
  window.addEventListener("message", (e: MessageEvent<DesignModeMessage>) => {
    // ... existing handlers
    else if (e.data.type === "FB_UPDATE_THEME") {
      this.handleUpdateTheme(e.data.theme);
    }
  });
}

// 3. Implement theme update method
private handleUpdateTheme(theme?: { mode: "light" | "dark"; variables: Record<string, string> }) {
  if (!theme) return;

  console.log("[Design Mode] Updating theme:", theme);

  // Apply theme mode (light/dark)
  if (theme.mode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Update CSS variables on :root
  for (const [key, value] of Object.entries(theme.variables)) {
    document.documentElement.style.setProperty(key, value);
  }

  console.log("[Design Mode] Theme updated successfully");
}
```

### 3.2 Theme Update Sender (Parent Side)
**Goal**: Send theme changes from parent to iframe

**File to create**: `apps/app/src/lib/design-mode/theme-utils.ts`

**Helper functions**:
```typescript
import type { ThemeFormType } from "@/app/(workspace)/(dashboard)/brand/themes/_components/theme/form";

/**
 * Convert theme form values to CSS variables
 */
export function themeToVariables(
  theme: ThemeFormType,
  mode: "light" | "dark"
): Record<string, string> {
  const themeData = mode === "light" ? theme.lightTheme : theme.darkTheme;

  const variables: Record<string, string> = {};

  // Color variables
  for (const [key, value] of Object.entries(themeData)) {
    if (key === "radius") continue; // Handle separately
    variables[`--${key}`] = value;
  }

  // Radius (only in light theme)
  if (mode === "light" && theme.lightTheme.radius) {
    variables["--radius"] = theme.lightTheme.radius;
  }

  return variables;
}

/**
 * Send theme update to iframe
 */
export function sendThemeToIframe(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  theme: ThemeFormType,
  mode: "light" | "dark"
) {
  if (!iframeRef.current?.contentWindow) {
    console.warn("[Design Mode] Cannot send theme - iframe not ready");
    return;
  }

  const variables = themeToVariables(theme, mode);

  iframeRef.current.contentWindow.postMessage(
    {
      type: "FB_UPDATE_THEME",
      theme: {
        mode,
        variables,
      },
    },
    "*"
  );

  console.log("[Design Mode] Sent theme update to iframe:", { mode, variableCount: Object.keys(variables).length });
}
```

### 3.3 Wire Up Theme Updates
**Goal**: Auto-update iframe when form changes

**File to update**: `apps/app/src/components/chat-v2/design-mode/theme-editor.tsx`

**Add effect**:
```tsx
import { sendThemeToIframe } from "@/lib/design-mode/theme-utils";

export const ThemeEditor = () => {
  const { iframeRef, isPreviewIframeLoaded } = useSandbox();
  const form = useForm<ThemeFormType>({ ... });
  const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">("light");

  // Watch form values
  const formValues = form.watch();

  // Update iframe when theme changes
  useEffect(() => {
    if (!formValues || !isPreviewIframeLoaded) return;

    sendThemeToIframe(iframeRef, formValues, previewThemeMode);
  }, [formValues, previewThemeMode, iframeRef, isPreviewIframeLoaded]);

  // ... rest of component
};
```

### 3.4 Verify CSS Variables in Template
**Goal**: Ensure iframe uses CSS variables correctly

**File to check**: `templates/clean/src/index.css`

**Verify structure**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark values */
  }
}
```

**If missing**: Add to template's index.css

---

## Phase 4: Theme Persistence

### 4.1 Save to Convex (Database)
**Goal**: Save theme to Convex for reuse across landing pages

**File to update**: `apps/app/src/components/chat-v2/design-mode/theme-editor.tsx`

**Implementation**:
```tsx
import { api, useMutation } from "@firebuzz/convex";

export const ThemeEditor = () => {
  const createTheme = useMutation(api.collections.brands.themes.mutations.create);
  const updateTheme = useMutation(api.collections.brands.themes.mutations.update);

  const handleSaveAsNewTheme = async () => {
    try {
      const values = form.getValues();

      await createTheme({
        name: `Theme ${new Date().toLocaleDateString()}`,
        description: "Created from Design Mode",
        lightTheme: values.lightTheme,
        darkTheme: values.darkTheme,
        fonts: values.fonts,
        template: values.template,
        // These come from context
        workspaceId: workspace._id,
        brandId: brand._id,
        projectId: project._id,
      });

      toast.success("Theme saved to library");
    } catch (error) {
      toast.error("Failed to save theme");
    }
  };
};
```

### 4.2 Generate tailwind.config.ts
**Goal**: Convert theme to Tailwind config file

**File to create**: `apps/app/src/lib/design-mode/generate-tailwind-config.ts`

**Function**:
```typescript
import type { ThemeFormType } from "@/app/(workspace)/(dashboard)/brand/themes/_components/theme/form";

export function generateTailwindConfig(theme: ThemeFormType): string {
  const { lightTheme, darkTheme, fonts } = theme;

  return `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["${fonts.sans}", "sans-serif"],
        serif: ["${fonts.serif}", "serif"],
        mono: ["${fonts.mono}", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
`;
}
```

### 4.3 Generate globals.css with Theme Variables
**Goal**: Generate CSS file with theme variables

**File to create**: `apps/app/src/lib/design-mode/generate-globals-css.ts`

**Function**:
```typescript
export function generateGlobalsCss(theme: ThemeFormType): string {
  const { lightTheme, darkTheme } = theme;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: ${lightTheme.background};
    --foreground: ${lightTheme.foreground};
    --card: ${lightTheme.card};
    --card-foreground: ${lightTheme.cardForeground};
    --popover: ${lightTheme.popover};
    --popover-foreground: ${lightTheme.popoverForeground};
    --primary: ${lightTheme.primary};
    --primary-foreground: ${lightTheme.primaryForeground};
    --secondary: ${lightTheme.secondary};
    --secondary-foreground: ${lightTheme.secondaryForeground};
    --muted: ${lightTheme.muted};
    --muted-foreground: ${lightTheme.mutedForeground};
    --accent: ${lightTheme.accent};
    --accent-foreground: ${lightTheme.accentForeground};
    --destructive: ${lightTheme.destructive};
    --destructive-foreground: ${lightTheme.destructiveForeground};
    --border: ${lightTheme.border};
    --input: ${lightTheme.input};
    --ring: ${lightTheme.ring};
    --radius: ${lightTheme.radius};
  }

  .dark {
    --background: ${darkTheme.background};
    --foreground: ${darkTheme.foreground};
    --card: ${darkTheme.card};
    --card-foreground: ${darkTheme.cardForeground};
    --popover: ${darkTheme.popover};
    --popover-foreground: ${darkTheme.popoverForeground};
    --primary: ${darkTheme.primary};
    --primary-foreground: ${darkTheme.primaryForeground};
    --secondary: ${darkTheme.secondary};
    --secondary-foreground: ${darkTheme.secondaryForeground};
    --muted: ${darkTheme.muted};
    --muted-foreground: ${darkTheme.mutedForeground};
    --accent: ${darkTheme.accent};
    --accent-foreground: ${darkTheme.accentForeground};
    --destructive: ${darkTheme.destructive};
    --destructive-foreground: ${darkTheme.destructiveForeground};
    --border: ${darkTheme.border};
    --input: ${darkTheme.input};
    --ring: ${darkTheme.ring};
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
}
```

### 4.4 Save Files to WebContainer
**Goal**: Write generated config files to sandbox

**File to update**: `apps/app/src/components/chat-v2/design-mode/theme-editor.tsx`

**Implementation**:
```tsx
const saveThemeToFiles = async () => {
  try {
    const values = form.getValues();

    // Generate config files
    const tailwindConfig = generateTailwindConfig(values);
    const globalsCss = generateGlobalsCss(values);

    // Save to WebContainer
    await saveChangesToFilesMutation({
      sessionId: session._id!,
      sandboxId: sandboxDbId!,
      files: [
        {
          filePath: "tailwind.config.ts",
          content: tailwindConfig,
        },
        {
          filePath: "src/index.css",
          content: globalsCss,
        },
      ],
      changeIds: [],
    });

    toast.success("Theme saved to files");

    // Reload iframe to apply changes
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.location.reload();
    }
  } catch (error) {
    toast.error("Failed to save theme");
  }
};
```

---

## Phase 5: Quick Theme Selection

### 5.1 Theme Library Dropdown
**Goal**: Let users select from saved themes

**File to update**: `apps/app/src/components/chat-v2/design-mode/theme-editor.tsx`

**Add dropdown at top**:
```tsx
import { api, useQuery } from "@firebuzz/convex";

export const ThemeEditor = () => {
  // Fetch user's themes from Convex
  const themes = useQuery(api.collections.brands.themes.queries.getAll, {
    projectId: project._id
  });

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const handleThemeSelect = (themeId: string) => {
    const theme = themes?.find(t => t._id === themeId);
    if (!theme) return;

    // Reset form with selected theme
    form.reset({
      lightTheme: theme.lightTheme,
      darkTheme: theme.darkTheme,
      fonts: theme.fonts,
      template: theme.template,
    });

    setSelectedThemeId(themeId);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Theme Selector */}
      <div>
        <Label>Quick Themes</Label>
        <Select value={selectedThemeId || "custom"} onValueChange={handleThemeSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom (Current)</SelectItem>
            <SelectSeparator />
            {themes?.filter(t => !t.isSystem).map(theme => (
              <SelectItem key={theme._id} value={theme._id}>
                {theme.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectLabel>System Themes</SelectLabel>
            {themes?.filter(t => t.isSystem).map(theme => (
              <SelectItem key={theme._id} value={theme._id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rest of editor ... */}
    </div>
  );
};
```

---

## Phase 6: Polish & Edge Cases

### 6.1 Loading States
- Show skeleton when theme is loading
- Disable controls while iframe is not ready
- Show spinner during save operations

### 6.2 Undo/Redo
- Track theme history in local state
- Add undo/redo buttons
- Use `useUndo` hook pattern

### 6.3 Reset to Original
- Store original theme on mount
- Add "Reset" button to revert changes

### 6.4 Conflict Resolution
- Element changes override theme (e.g., `text-blue-500` overrides `text-primary`)
- Warn user when element has hardcoded values

### 6.5 Export Theme
- Add "Export Theme JSON" button
- Download theme as JSON file
- Import theme from JSON

---

## Implementation Order

### Week 1: Element Editor (v0-Style)
1. ✅ Create tailwind-mappings.ts
2. ✅ Build TypographyControls component
3. ✅ Build ColorSelector component (3 tabs)
4. ✅ Build LayoutControls component
5. ✅ Build SpacingControls component
6. ✅ Build BorderControls component
7. ✅ Create class-utils.ts (parser/updater)
8. ✅ Rebuild element-editor.tsx with collapsible sections
9. ✅ Test all controls with real elements

### Week 2: Theme Editor
1. ✅ Create ThemeEditor component
2. ✅ Adapt existing ColorsSection for design mode
3. ✅ Add isDesignMode prop to theme components
4. ✅ Add theme mode toggle (light/dark)
5. ✅ Wire up form watching
6. ✅ Test theme editor UI

### Week 3: Real-Time Updates
1. ✅ Add FB_UPDATE_THEME message handler in overlay.ts
2. ✅ Create theme-utils.ts (themeToVariables, sendThemeToIframe)
3. ✅ Wire up theme updates in ThemeEditor
4. ✅ Verify CSS variables in template
5. ✅ Test real-time theme changes

### Week 4: Persistence & Polish
1. ✅ Create generate-tailwind-config.ts
2. ✅ Create generate-globals-css.ts
3. ✅ Implement save to Convex
4. ✅ Implement save to files
5. ✅ Add theme library dropdown
6. ✅ Add quick theme selection
7. ✅ Add export/import features
8. ✅ Polish UI and loading states

---

## Files to Create

```
apps/app/src/
├── lib/design-mode/
│   ├── tailwind-mappings.ts          # NEW
│   ├── class-utils.ts                # NEW
│   ├── theme-utils.ts                # NEW
│   ├── generate-tailwind-config.ts   # NEW
│   └── generate-globals-css.ts       # NEW
├── components/chat-v2/design-mode/
│   ├── theme-editor.tsx              # NEW
│   └── controls/
│       ├── typography-controls.tsx   # NEW
│       ├── color-selector.tsx        # NEW
│       ├── layout-controls.tsx       # NEW
│       ├── spacing-controls.tsx      # NEW
│       └── border-controls.tsx       # NEW

templates/clean/src/design-mode/
└── overlay.ts                        # UPDATE (add theme handler)
```

## Files to Update

```
apps/app/src/
├── components/chat-v2/design-mode/
│   └── element-editor.tsx            # REFACTOR (use new controls)
├── app/(workspace)/(dashboard)/brand/themes/_components/theme/
│   ├── colors-section.tsx            # ADD isDesignMode prop
│   ├── radius-section.tsx            # ADD isDesignMode prop
│   └── typography-section.tsx        # ADD isDesignMode prop

templates/clean/src/
└── index.css                         # VERIFY (CSS variables)
```

---

## Success Criteria

✅ **Element Mode**
- Click element → v0-style controls appear
- Change font size → Updates instantly + saves to file
- Change color → Theme tokens + Tailwind palette + Custom hex all work
- Change spacing → Instant visual feedback

✅ **Theme Mode**
- No selection → Theme editor appears
- Change primary color → All components update instantly
- Toggle light/dark → Smooth transition
- Save theme → Files + DB updated

✅ **Integration**
- Switch between modes seamlessly
- Changes persist after reload
- Export/import themes works
- Quick theme selection works

---

This plan gives you a complete v0-style visual editor with full theme support, using your existing components and infrastructure!

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev               # Run all services
pnpm dev:app          # Run main app only
pnpm dev:convex       # Run Convex backend only
pnpm dev:marketing    # Run marketing site only

# Building
pnpm build            # Build all packages
pnpm build:app        # Build main app only

# Code Quality
pnpm format           # Format code with Biome
pnpm test             # Run tests with Vitest
pnpm typecheck        # Run TypeScript type checking

# UI Component Development
pnpm ui               # Launch UI component development environment

# Utilities
pnpm clean            # Clean build artifacts and node_modules
```

## Architecture Overview

Firebuzz is a monorepo-based SaaS platform for AI-powered marketing campaign and landing page creation, structured as follows:

### Core Applications

1. **Main App** (`/apps/app`): Next.js 15 application serving the dashboard
   - Authentication via Clerk
   - Real-time data with Convex
   - Tailwind and Shadcn UI components
   - Stackblitz WebContainers for running code in the browser. It's combined with AI agents to create code for landing pages in the browser via chat interface.
   - Responsible for the main user interface and user experience

2. **Backend Services**:
   - **Convex** (`/packages/convex`): Primary backend handling data persistence, real-time subscriptions, and serverless functions. It's basicaly the backend and database for the Firebuzz platform.
   - **Engine** (`/apps/engine`): Cloudflare Worker for accesing Cloudflare Services such as KV, Durable Objects, etc. It's also responsible for serving landing pages created by users.
   - **Dispatcher** (`/apps/dispatcher`): Cloudflare Worker for request routing. It's responsible for routing requests to the appropriate service. It's mainly used for routing custom domains to the appropriate service. (Lading pages)

3. **Templates** (`/templates/*`): Vite-based static site generators for landing pages. They are not part of the main app, but are used to generate landing pages for users. We don't usally work on templates while we are working on the main app. Templates are different layers of the project but they are here because they are part of the project.

### Key Architectural Patterns

1. **Data Flow**:
   - Frontend → Convex (for CRUD operations and real-time data)
   - Frontend → Engine (via Convex) → AI Services (for generation tasks)

2. **AI Integration Pattern**:
   - Unified chat interface in `/apps/app/src/app/api/chat/*`
   - Tools defined in `/apps/app/src/lib/chat/tools/*`
   - Prompt templates in `/apps/app/src/lib/chat/prompt.ts`

3. **Form System**:
   - We use Zod and React Hook Form for form handling.

4. **Workspace Structure**:
   - Multi-tenant with workspaces
   - Projects within workspaces
   - Campaigns, forms, and landing pages within projects.

### Code Style Guidelines

- **TypeScript**: Strict mode enabled across all packages
- **Formatting**: Biome with tab indentation and double quotes
- **Imports**: Organized imports enabled (external → @firebuzz/\* → relative)
- **File Naming**: kebab-case for files, PascalCase for components

### Coding Patterns and Conventions

1. **Component Exports**:
   - Use named exports for components: `export const ComponentName = () => {}`
   - NO default exports for components (except Next.js pages)
   - ForwardRef pattern: `const Component = React.forwardRef<...>(); Component.displayName = "Component";`

2. **Component Structure**:

   ```typescript
   "use client"; // if client component

   import { external } from "package";
   import { internal } from "@firebuzz/package";
   import { local } from "./local";

   export interface ComponentProps {
     // props definition
   }

   export const Component = ({ prop1, prop2 }: ComponentProps) => {
     // component logic
   };
   ```

3. **State Management**:
   - React Hook Form with Zod for forms
   - Custom hooks for shared logic: `useProject()`, `useWorkspace()`
   - Context for app-wide state with providers

4. **Error Handling Pattern**:

   ```typescript
   try {
     await mutation();
   } catch (error) {
     const errorMessage =
       error instanceof ConvexError ? error.data : "Unexpected error occurred";
     toast.error("Failed to...", {
       id: "unique-id",
       description: errorMessage,
     });
   }
   ```

5. **Convex Patterns**:
   - Always use typed validators: `v.object()`, `v.id()`, `v.string()`
   - Index important queries: `.index("by_workspace_id", ["workspaceId"])`
   - Throw `ConvexError` with descriptive messages

6. **UI Components**:
   - Use CVA for component variants
   - Extend Shadcn/ui components, don't rewrite
   - Always use `cn()` for className merging
   - Props spreading at the end: `{...props}`

7. **Common Utilities**:
   - `cn()` from `@firebuzz/ui/lib/utils` for classNames
   - `slugify()` from `@firebuzz/utils` for URL-safe strings
   - `toast.success()` / `toast.error()` for notifications

8. **File Organization**:
   - Group by feature in `app/` directory
   - Shared components in `components/`
   - Custom hooks in `hooks/`
   - Utilities in `lib/`

9. **JavaScript Best Practices**:
   - Use `Number.parseInt()` instead of the global `parseInt()`
   - Avoid using array index as key property in React elements - use stable, unique identifiers instead

10. **TypeScript Best Practices**:
   - Never use `any` type - always provide proper typing
   - Use specific types, interfaces, or generics instead of `any`
   - If type is unknown, use `unknown` and type guard it properly

### Testing Strategy

- Use Vitest for unit tests
- Test files in `__tests__` directories or `.test.ts` files
- Run single test: `pnpm test -- path/to/test`

### Environment Setup

Required environment variables are defined in `.env.local`. Key services:

- Clerk for authentication
- Multiple AI providers (OpenAI, Anthropic, Google, Azure)
- Convex for backend
- Cloudflare for edge computing
- Resend for emails
- Tinybird for analytics
- Stripe for payments

## Common Patterns to Avoid

### 1. Array Index as React Key
- NEVER use array index directly as key in React elements
- Always use a stable, unique identifier
- Good: `key={\`item-${item.id}\`}` or `key={\`hour-toggle-${hour}\`}`
- Bad: `key={i}` or `key={index}`

### 2. TypeScript Type Narrowing
- Be careful with union type comparisons after type narrowing
- If code is in a branch where type is already narrowed, don't compare with impossible values
- Example: If inside `mode !== "range"` block, don't use `mode === "range"`

### 3. Unnecessary Else Clauses
- Avoid else clauses when previous branches return early
- Use early return pattern without else:
  ```typescript
  if (condition1) return value1;
  if (condition2) return value2;
  return defaultValue;
  ```

### 4. Deprecated Icons
- Check for deprecated icons from lucide-react
- Common deprecated icons: Chrome (use Globe or other appropriate icon)

### 5. Operator-Based Value Types
- Use `operatorValueTypes` mapping in rule definitions
- Handle value type conversions when switching operators
- Clear incompatible values when operator changes

### 6. Component State Management
- When switching between single/multi select modes, properly reset state
- Initialize values based on the operator type
- Handle Array vs single value conversions carefully
- When SegmentRule value includes number[], always convert to string[] for string-based components using `.map(String)`

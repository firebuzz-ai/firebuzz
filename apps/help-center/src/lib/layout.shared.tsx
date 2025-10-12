import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: <Wordmark className="h-4 text-fd-foreground max-w-20" />,
		},

		// see https://fumadocs.dev/docs/ui/navigation/links
		links: [],
	};
}

import { api, type Id, useCachedQuery } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { CodeBlockWithClipboard } from "@firebuzz/ui/components/reusable/code-block-with-clipboard";
import { Badge, badgeVariants } from "@firebuzz/ui/components/ui/badge";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { ArrowRight, FileText } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useParams } from "next/navigation";

interface InternalTrackingContentProps {
	eventId: string;
	eventTitle: string;
}

export const InternalTrackingContent = ({
	eventId,
	eventTitle,
}: InternalTrackingContentProps) => {
	const params = useParams();
	const campaignId = params?.id as string;

	const landingPages = useCachedQuery(
		api.collections.landingPages.queries.getByCampaignId,
		campaignId ? { campaignId: campaignId as Id<"campaigns"> } : "skip",
	);

	const examplePrompt = `Could you please setup my ${eventTitle} event (event id: ${eventId}) and trigger it when the user interacts with the relevant element?`;

	const handleNavigateToEditor = (landingPageId: string) => {
		// Navigate to the landing page editor with correct URL structure
		const editorUrl = `/assets/landing-pages/${landingPageId}/edit`;
		window.open(editorUrl, "_blank");
	};

	return (
		<div className="space-y-4">
			<div>
				For tracking internal events in your landing page, you just need to
				prompt it and{" "}
				<span
					className={cn(
						badgeVariants({
							variant: "outline",
							className: "inline-flex gap-1 items-center",
						}),
					)}
				>
					<Icon className="w-2" />
					Firebuzz
				</span>{" "}
				will automatically setup tracking for your event.
			</div>

			<Separator />

			<div className="space-y-3">
				<p className="mb-3 text-sm text-muted-foreground">
					Copy this prompt and use it in the AI editor to automatically set up
					tracking for your event:
				</p>
				<CodeBlockWithClipboard language="prompt" code={examplePrompt} />
			</div>

			<Separator />

			<div className="space-y-3">
				<h4 className="font-medium">Landing Pages</h4>
				<p className="text-sm text-muted-foreground">
					Choose a landing page to open the editor and set up your tracking:
				</p>

				<div className="space-y-2">
					{landingPages && landingPages.length > 0 ? (
						landingPages.map((landingPage, index: number) => (
							<div
								key={landingPage._id}
								onClick={() => handleNavigateToEditor(landingPage._id)}
								className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
							>
								<div className="flex flex-1 gap-3 items-center">
									<div className="flex gap-2 items-center">
										{/* Number-based icon */}
										<div className="flex justify-center items-center w-6 h-6 text-xs font-bold rounded-md border bg-muted">
											{index + 1}
										</div>
										<div className="flex flex-col">
											<div className="flex gap-2 items-center">
												<span className="text-sm font-medium leading-tight">
													{landingPage.title}
												</span>
												{landingPage.language && (
													<Badge
														variant="outline"
														className="text-xs"
														onClick={(e) => e.stopPropagation()}
													>
														{landingPage.language.toUpperCase()}
													</Badge>
												)}
											</div>
											{landingPage.description && (
												<span className="text-xs text-muted-foreground">
													{landingPage.description}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Arrow with animation */}
								<div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
									<ArrowRight className="w-4 h-4 transition-transform duration-200 text-muted-foreground group-hover:translate-x-1" />
								</div>
							</div>
						))
					) : (
						<div className="py-6 text-center text-muted-foreground">
							<FileText className="mx-auto mb-2 w-8 h-8 opacity-50" />
							<p className="text-sm">
								No landing pages found for this campaign
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

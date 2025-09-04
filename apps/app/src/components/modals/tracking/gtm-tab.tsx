import { CodeBlockWithClipboard } from "@firebuzz/ui/components/reusable/code-block-with-clipboard";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Separator } from "@firebuzz/ui/components/ui/separator";

interface GTMTabProps {
	eventId: string;
	eventTitle: string;
	scriptUrl: string;
	value: number;
	currency: string;
}

export const GTMTab = ({
	eventId,
	eventTitle,
	scriptUrl,
	value,
	currency,
}: GTMTabProps) => {
	return (
		<div className="overflow-y-auto px-6 py-4 space-y-4">
			<div className="space-y-3">
				<h4 className="font-medium">Event Details</h4>
				<div className="space-y-2 text-sm">
					<div className="flex gap-3 justify-between items-center">
						<div className="w-full max-w-[100px] text-muted-foreground">
							ID:
						</div>
						<div className="flex-1">
							<ReadonlyInputWithClipboard
								className="flex-1 w-full"
								value={eventId}
							/>
						</div>
					</div>
					<div className="flex gap-3 justify-between items-center">
						<div className="w-full max-w-[100px] text-muted-foreground">
							Name:
						</div>
						<div className="flex-1">
							<ReadonlyInputWithClipboard
								className="flex-1 w-full"
								value={eventTitle}
							/>
						</div>
					</div>
					<div className="flex gap-3 justify-between items-center">
						<div className="w-full max-w-[100px] text-muted-foreground">
							Value:
						</div>
						<div className="flex-1">
							<ReadonlyInputWithClipboard
								className="flex-1 w-full"
								value={value.toString()}
							/>
						</div>
					</div>
					<div className="flex gap-3 justify-between items-center">
						<div className="w-full max-w-[100px] text-muted-foreground">
							Currency:
						</div>
						<div className="flex-1">
							<ReadonlyInputWithClipboard
								className="flex-1 w-full"
								value={currency}
							/>
						</div>
					</div>
				</div>
			</div>
			<Separator />
			<div className="space-y-4">
				<h4 className="font-medium">GTM Implementation Steps</h4>
				<div className="space-y-0">
					{/* Step 1 */}
					<div className="relative pb-8">
						<div className="flex gap-4 items-start">
							<div className="relative z-10 flex-shrink-0">
								<div className="flex justify-center items-center w-8 h-8 rounded-full border-2 bg-brand/10 border-brand">
									<span className="text-sm font-semibold text-brand">1</span>
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<h5 className="mb-2 text-sm font-medium">
									Create the Base Script Tag
								</h5>
								<div className="mb-3 text-sm text-muted-foreground">
									Create a <Badge variant="outline">Custom HTML Tag</Badge> and
									trigger it on <Badge variant="outline">All Pages</Badge> you
									want to call this event.
								</div>
								<CodeBlockWithClipboard
									language="html"
									code={`<!-- Firebuzz Base Script Tag -->
<script src="${scriptUrl}"></script>`}
								/>
							</div>
						</div>
						<div className="absolute bottom-0 left-4 top-8 w-px border-l-2 border-dashed border-border" />
					</div>

					{/* Step 2 */}
					<div className="relative pb-8">
						<div className="flex gap-4 items-start">
							<div className="relative z-10 flex-shrink-0">
								<div className="flex justify-center items-center w-8 h-8 rounded-full border-2 bg-brand/10 border-brand">
									<span className="text-sm font-semibold text-brand">2</span>
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<h5 className="mb-2 text-sm font-medium">
									Create the Event Tag
								</h5>
								<div className="mb-3 text-sm text-muted-foreground">
									Create an <Badge variant="outline">Event Tag</Badge> and fire
									it on the <Badge variant="outline">Trigger</Badge> you want.
								</div>
								<CodeBlockWithClipboard
									language="html"
									code={`<!-- Firebuzz Event Tag -->
<script>
  frbzztrack(
    '${eventId}', // event id
    ${value}, // value
    '${currency}' // currency
  );
</script>`}
								/>
							</div>
						</div>
					</div>

					{/* Info Box */}
					<InfoBox variant="info" iconPlacement="left">
						You can set <Badge variant="outline">value</Badge> and{" "}
						<Badge variant="outline">currency</Badge> dynamically in the event
						tag.
					</InfoBox>
				</div>
			</div>
		</div>
	);
};

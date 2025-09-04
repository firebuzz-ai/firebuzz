import { CodeBlockWithClipboard } from "@firebuzz/ui/components/reusable/code-block-with-clipboard";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Separator } from "@firebuzz/ui/components/ui/separator";

interface CustomCodeTabProps {
	eventId: string;
	eventTitle: string;
	scriptUrl: string;
	value: number;
	currency: string;
}

export const CustomCodeTab = ({
	eventId,
	eventTitle,
	scriptUrl,
	value,
	currency,
}: CustomCodeTabProps) => {
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
				<h4 className="font-medium">Custom Code Implementation Steps</h4>
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
									Add the Base Script
								</h5>
								<div className="mb-3 text-sm text-muted-foreground">
									Add the Firebuzz tracking script to your website's{" "}
									<Badge variant="outline">head</Badge> section.
								</div>
								<CodeBlockWithClipboard
									language="html"
									code={`<!-- Firebuzz Base Script -->
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
								<h5 className="mb-2 text-sm font-medium">Track the Event</h5>
								<div className="mb-3 text-sm text-muted-foreground">
									Call the tracking function when the event occurs.
								</div>
								<CodeBlockWithClipboard
									language="javascript"
									code={`// Call this when the event occurs
frbzztrack(
  '${eventId}', // event id
  ${value}, // value
  '${currency}' // currency
);`}
								/>
							</div>
						</div>
						<div className="absolute bottom-0 left-4 top-8 w-px border-l-2 border-dashed border-border" />
					</div>

					{/* Step 3 */}
					<div className="relative pb-8">
						<div className="flex gap-4 items-start">
							<div className="relative z-10 flex-shrink-0">
								<div className="flex justify-center items-center w-8 h-8 rounded-full border-2 bg-brand/10 border-brand">
									<span className="text-sm font-semibold text-brand">3</span>
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<h5 className="mb-2 text-sm font-medium">Example Usage</h5>
								<div className="mb-3 text-sm text-muted-foreground">
									Example of how to track the event on a button click.
								</div>
								<CodeBlockWithClipboard
									language="javascript"
									code={`// Example: Track when user clicks a button
document.getElementById('my-button').addEventListener('click', function() {
  frbzztrack(
    '${eventId}', // event id
    ${value}, // value
    '${currency}' // currency
  );
});`}
								/>
							</div>
						</div>
					</div>

					{/* Info Box */}
					<InfoBox className="mt-4" variant="info" iconPlacement="left">
						You can set <Badge variant="outline">value</Badge> and{" "}
						<Badge variant="outline">currency</Badge> dynamically in your
						JavaScript code.
					</InfoBox>
				</div>
			</div>
		</div>
	);
};

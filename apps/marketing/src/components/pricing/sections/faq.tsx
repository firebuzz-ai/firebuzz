"use client";

import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@firebuzz/ui/components/ui/collapsible";
import { ChevronDown } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";

interface FAQItem {
	question: string;
	answer: string;
}

const faqData: FAQItem[] = [
	{
		question: "What's included in the free trial?",
		answer:
			"All plans come with a 14-day free trial that includes full access to all features. No credit card required. You can create landing pages, run campaigns, and access our AI tools during the trial period.",
	},
	{
		question: "Can I change my plan at any time?",
		answer:
			"Yes, you can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated difference immediately. When you downgrade, the changes will take effect at the end of your current billing cycle.",
	},
	{
		question: "Do you offer yearly billing discounts?",
		answer:
			"Yes! When you choose yearly billing, you save one month's cost (equivalent to getting 11 months for the price of 12). This applies to all our plans and provides significant savings for annual commitments.",
	},
	{
		question: "What happens if I exceed my limits?",
		answer:
			"For AI Credits and Traffic, you'll be charged according to the extra usage rates shown in each plan. For Seats and Projects, you can add more at the rates specified. We'll notify you before you approach your limits.",
	},
	{
		question: "Can I cancel my subscription anytime?",
		answer:
			"Yes, you can cancel your subscription at any time. There are no cancellation fees or penalties. If you cancel, you'll retain access to your plan features until the end of your current billing period.",
	},
];

export const FAQ = () => {
	const [openItems, setOpenItems] = useState<Set<number>>(new Set());

	const toggleItem = (index: number) => {
		const newOpenItems = new Set(openItems);
		if (newOpenItems.has(index)) {
			newOpenItems.delete(index);
		} else {
			newOpenItems.add(index);
		}
		setOpenItems(newOpenItems);
	};

	return (
		<div className="px-8 mx-auto max-w-6xl">
			<div className="px-8 py-24 border-x">
				<div className="">
					{/* Header */}
					<div className="px-4 mb-12 text-center">
						<Badge
							variant="outline"
							className="mb-4 bg-muted py-1.5 px-4 text-brand"
						>
							FAQ
						</Badge>
						<h2 className="text-3xl font-bold leading-tight sm:text-4xl">
							Do you have any questions?
						</h2>
						<p className="mx-auto max-w-lg text-muted-foreground">
							We've got answers. If you can't find what you're looking for,
							don't hesitate to reach out to our support team.
						</p>
					</div>

					{/* FAQ Items */}
					<div className="mx-auto space-y-4 max-w-3xl">
						{faqData.map((item, index) => (
							<Collapsible
								key={item.question}
								open={openItems.has(index)}
								onOpenChange={() => toggleItem(index)}
							>
								<CollapsibleTrigger className="flex justify-between items-center p-3 w-full text-left rounded-lg border transition-all duration-300 ease-in-out bg-muted hover:bg-muted/50 hover:shadow-sm">
									<span className="pr-4 text-sm font-medium">
										{item.question}
									</span>
									<ChevronDown
										className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ease-in-out ${
											openItems.has(index) ? "rotate-180" : ""
										}`}
									/>
								</CollapsibleTrigger>
								<CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-1 data-[state=open]:slide-down-1">
									<div className="px-6 pt-2 pb-6">
										<p className="leading-relaxed text-muted-foreground">
											{item.answer}
										</p>
									</div>
								</CollapsibleContent>
							</Collapsible>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

"use client";
import { Button } from "@firebuzz/ui/components/ui/button";
import { CheckCheck } from "@firebuzz/ui/icons/lucide";
import NumberFlow from "@number-flow/react";
import { useState } from "react";
import { IntervalToggle } from "../interval-toggle";

interface PlanFeature {
	text: string;
}

interface Plan {
	id: string;
	name: string;
	monthlyPrice: number;
	description: string;
	features: PlanFeature[];
	variant: "outline" | "brand";
	highlighted?: boolean;
}

const plans: Plan[] = [
	{
		id: "pro",
		name: "Pro",
		monthlyPrice: 99,
		description: "Best for starting with Firebuzz",
		features: [
			{ text: "300 AI Credits" },
			{ text: "20K Traffic" },
			{ text: "1 Seat" },
			{ text: "1 Project" },
		],
		variant: "outline",
	},
	{
		id: "scale",
		name: "Scale",
		monthlyPrice: 199,
		description: "Best for scaling your business with Firebuzz",
		features: [
			{ text: "750 AI Credits" },
			{ text: "50K Traffic" },
			{ text: "3 Seat" },
			{ text: "3 Project" },
		],
		variant: "brand",
		highlighted: true,
	},
	{
		id: "agency",
		name: "Agency",
		monthlyPrice: 399,
		description: "Best for agencies and large teams",
		features: [
			{ text: "1,500 AI Credits" },
			{ text: "10K Traffic" },
			{ text: "7 Seat" },
			{ text: "7 Project" },
		],
		variant: "outline",
	},
];

export const Plans = () => {
	const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

	const getPrice = (plan: Plan) => {
		if (interval === "yearly") {
			return plan.monthlyPrice * 11; // 11 months price for yearly (1 month free)
		}
		return plan.monthlyPrice;
	};

	const getPriceLabel = () => {
		return interval === "yearly" ? "/year" : "/month";
	};

	const getSavings = (plan: Plan) => {
		if (interval === "yearly") {
			const yearlyPrice = plan.monthlyPrice * 11;
			const fullYearPrice = plan.monthlyPrice * 12;
			return fullYearPrice - yearlyPrice;
		}
		return 0;
	};

	return (
		<div className="px-8 mx-auto max-w-6xl">
			<div className="pt-24 border-x">
				<div className="grid overflow-hidden grid-cols-12">
					{/* Interval Toggle */}
					<div className="grid grid-cols-12 col-span-full gap-0">
						<div className="col-span-4" />
						<div className="col-span-4 border-t bg-muted border-x">
							<IntervalToggle value={interval} onChange={setInterval} />
						</div>
						<div className="col-span-4" />
					</div>

					{/* Plans */}
					{plans.map((plan) => (
						<div
							key={plan.id}
							className={`overflow-hidden col-span-full row-span-2 sm:col-span-4 ${
								plan.highlighted ? "border bg-muted" : "border-t border-b"
							}`}
						>
							<div className="px-8 py-8">
								<h3 className="text-lg font-medium">{plan.name}</h3>
								<h2 className="text-4xl font-bold">
									$<NumberFlow value={getPrice(plan)} />
									<span className="text-sm font-normal text-muted-foreground">
										{getPriceLabel()}
									</span>
									{interval === "yearly" && (
										<span className="ml-2 text-xs font-medium text-emerald-600">
											Save ${getSavings(plan)}
										</span>
									)}
								</h2>

								<p className="text-sm text-muted-foreground">
									{plan.description}
								</p>

								{/* Features */}
								<div className="mt-4 space-y-2 text-sm text-muted-foreground">
									{plan.features.map((feature) => (
										<div key={feature.text} className="flex gap-2 items-center">
											<div className="inline-flex justify-center items-center p-1 text-emerald-600 rounded-md border bg-muted">
												<CheckCheck className="size-3.5" />
											</div>
											{feature.text}
										</div>
									))}
								</div>

								<Button
									variant={plan.variant}
									className="mt-8 w-full h-8 text-sm"
									size="sm"
								>
									Start Free Trial
								</Button>
							</div>
						</div>
					))}
					<div className="flex col-span-full justify-center items-center px-8 py-4 text-sm border-b">
						<div className="text-muted-foreground">
							Try any plan for 14 days - hassle free cancellation
						</div>
					</div>
					{/* Enterprise */}
					<div className="grid relative grid-cols-3 col-span-full gap-0 px-8 py-12 border-b">
						{/* Subtle Grid Pattern BG */}
						<div
							className="absolute inset-0 opacity-30"
							style={{
								backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
								backgroundSize: "30px 30px",
							}}
						/>
						<div className="absolute inset-0 z-[1] bg-gradient-to-bl to-muted/40 from-muted via-muted/70" />
						<div className="relative z-10 col-span-2">
							<h3 className="text-lg font-medium">Firebuzz for Enterprise</h3>
							<p className="max-w-lg text-sm text-muted-foreground">
								Dedicated support, full onboarding and custom integrations,
								custom usage needs, and more. The Firebuzz you love, tailored to
								your company.
							</p>
							<Button className="mt-4 h-8 text-sm" size="sm">
								Contact Sales
							</Button>
						</div>

						{/* Features */}
						<div className="relative z-10 col-span-1 px-8 space-y-2 text-sm text-muted-foreground">
							<div className="flex gap-2 items-center">
								<div className="inline-flex justify-center items-center p-1 rounded-md border text-muted-foreground bg-muted">
									<CheckCheck className="size-3.5" />
								</div>
								Customize Usage
							</div>
							<div className="flex gap-2 items-center">
								<div className="inline-flex justify-center items-center p-1 rounded-md border text-muted-foreground bg-muted">
									<CheckCheck className="size-3.5" />
								</div>
								Dedicated Success Manager
							</div>
							<div className="flex gap-2 items-center">
								<div className="inline-flex justify-center items-center p-1 rounded-md border text-muted-foreground bg-muted">
									<CheckCheck className="size-3.5" />
								</div>
								Onboarding Support
							</div>
							<div className="flex gap-2 items-center">
								<div className="inline-flex justify-center items-center p-1 rounded-md border text-muted-foreground bg-muted">
									<CheckCheck className="size-3.5" />
								</div>
								Single Sign-On
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

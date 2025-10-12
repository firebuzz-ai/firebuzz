"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Check, X } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";

interface ComparisonPlan {
	id: string;
	name: string;
	buttonText: string;
	buttonVariant: "outline" | "brand" | "default";
	highlighted?: boolean;
}

interface FeatureValue {
	pro: string | boolean;
	scale: string | boolean;
	agency: string | boolean;
}

interface ComparisonFeature {
	category?: string;
	name: string;
	values: FeatureValue;
}

const plans: ComparisonPlan[] = [
	{
		id: "pro",
		name: "Pro",
		buttonText: "Start Free Trial",
		buttonVariant: "outline",
	},
	{
		id: "scale",
		name: "Scale",
		buttonText: "Start Free Trial",
		buttonVariant: "brand",
	},
	{
		id: "agency",
		name: "Agency",
		buttonText: "Start Free Trial",
		buttonVariant: "outline",
	},
];

const features: ComparisonFeature[] = [
	{
		category: "Core Features",
		name: "AI Credits",
		values: {
			pro: "300",
			scale: "750",
			agency: "1,500",
		},
	},
	{
		name: "Traffic",
		values: {
			pro: "20K",
			scale: "50K",
			agency: "100K",
		},
	},
	{
		name: "Seats",
		values: {
			pro: "1\n$10 per extra",
			scale: "3\n$10 per extra",
			agency: "7\n$10 per extra",
		},
	},
	{
		name: "Projects",
		values: {
			pro: "1\n$30 per extra",
			scale: "3\n$0 per extra",
			agency: "7\n$0 per extra",
		},
	},

	{
		category: "Features",
		name: "Unlimited Landing Pages",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Unlimited Leads",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Unlimited Campaigns",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Custom Domains",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "A/B Testing",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Built-in Analytics",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Templates",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "GDPR Compliance",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Storage",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Knowledge Bases",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Media Library",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Localization",
		values: {
			pro: true,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Priority Support",
		values: {
			pro: false,
			scale: true,
			agency: true,
		},
	},
	{
		name: "Dedicated Success Manager",
		values: {
			pro: false,
			scale: false,
			agency: true,
		},
	},
];

const FeatureIcon = ({ value }: { value: boolean }) => {
	if (value) {
		return (
			<div className="flex justify-center">
				<div className="flex justify-center items-center p-0.5 text-emerald-600 rounded-lg border bg-muted">
					<Check className="size-3.5" />
				</div>
			</div>
		);
	}
	return (
		<div className="flex justify-center">
			<div className="flex justify-center items-center p-0.5 rounded-lg border bg-muted text-muted-foreground">
				<X className="size-3.5" />
			</div>
		</div>
	);
};

const FeatureValue = ({ value }: { value: string | boolean }) => {
	if (typeof value === "boolean") {
		return <FeatureIcon value={value} />;
	}

	const lines = value.split("\n");
	return (
		<div className="text-center">
			<div className="font-medium">{lines[0]}</div>
			{lines[1] && (
				<div className="text-xs text-muted-foreground">{lines[1]}</div>
			)}
		</div>
	);
};

export const Comparison = () => {
	const [selectedPlan, setSelectedPlan] = useState<string>("pro");

	const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

	return (
		<div className="relative px-8 mx-auto max-w-6xl">
			<div className="border-x">
				{/* Desktop View */}
				<div className="hidden md:block">
					{/* Sticky Header */}
					<div className="grid sticky top-12 z-10 grid-cols-4 border-b bg-background">
						<div className="p-4" />
						{plans.map((plan) => (
							<div
								key={plan.id}
								className={`p-4 text-center border-l  ${
									plan.highlighted ? "bg-muted border-border" : "border-border"
								}`}
							>
								<h3 className="mb-4 text-lg font-medium">{plan.name}</h3>
								<Button
									variant={plan.buttonVariant}
									className="w-full h-8 text-sm"
									size="sm"
								>
									{plan.buttonText}
								</Button>
							</div>
						))}
					</div>

					{/* Feature Grid */}
					<div className="grid grid-cols-4">
						{features.map((feature) => {
							const rows = [];

							// Add category header row if present
							if (feature.category) {
								rows.push(
									<div
										key={`category-${feature.category}`}
										className="col-span-4 px-8 py-4 border-b bg-muted"
									>
										<h4 className="text-lg font-medium">{feature.category}</h4>
									</div>,
								);
							}

							// Add feature row
							rows.push(
								<div
									key={`feature-name-${feature.name}`}
									className="flex items-center p-4 px-8 text-sm border-r border-b text-muted-foreground"
								>
									<div className="font-medium">{feature.name}</div>
								</div>,
								<div
									key={`feature-pro-${feature.name}`}
									className="p-4 text-center border-b"
								>
									<FeatureValue value={feature.values.pro} />
								</div>,
								<div
									key={`feature-scale-${feature.name}`}
									className="p-4 text-center border-b border-x"
								>
									<FeatureValue value={feature.values.scale} />
								</div>,
								<div
									key={`feature-agency-${feature.name}`}
									className="p-4 text-center border-b"
								>
									<FeatureValue value={feature.values.agency} />
								</div>,
							);

							return rows;
						})}
					</div>
				</div>

				{/* Mobile View */}
				<div className="md:hidden">
					{/* Plan Selector */}
					<div className="p-4 border-b bg-muted">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-medium">
								{selectedPlanData?.name || "Pro"}
							</h3>
							<Select value={selectedPlan} onValueChange={setSelectedPlan}>
								<SelectTrigger className="w-32">
									<SelectValue placeholder="Switch plan" />
								</SelectTrigger>
								<SelectContent>
									{plans.map((plan) => (
										<SelectItem key={plan.id} value={plan.id}>
											{plan.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							variant={selectedPlanData?.buttonVariant || "outline"}
							className="w-full h-10"
						>
							{selectedPlanData?.buttonText || "Start Free Trial"}
						</Button>
					</div>

					{/* Features List */}
					<div className="space-y-0">
						{features.map((feature) => (
							<div key={feature.name}>
								{feature.category && (
									<div className="px-4 py-4 border-b bg-muted">
										<h4 className="text-lg font-medium">{feature.category}</h4>
									</div>
								)}
								<div className="flex justify-between items-center p-4 border-b">
									<div className="text-sm font-medium text-muted-foreground">
										{feature.name}
									</div>
									<div className="text-right">
										<FeatureValue
											value={
												feature.values[selectedPlan as keyof FeatureValue] as
													| string
													| boolean
											}
										/>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

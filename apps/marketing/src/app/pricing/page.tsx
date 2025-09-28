import { Testimonial } from "@/components/landing/sections/testimonial";
import { Comparison } from "@/components/pricing/sections/comparison";
import { FAQ } from "@/components/pricing/sections/faq";
import { Hero } from "@/components/pricing/sections/hero";
import { Plans } from "@/components/pricing/sections/plans";

export default function PricingPage() {
	return (
		<div className="relative min-h-screen">
			{/* Outer Container */}
			<div className="relative mx-auto max-w-7xl border-x">
				{/* Content */}
				<Hero />
				<Plans />
				<Comparison />
				<Testimonial />
				<FAQ />
			</div>
		</div>
	);
}

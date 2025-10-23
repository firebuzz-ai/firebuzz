import {
	Award,
	Lightbulb,
	MessageSquare,
	Network,
	TrendingUp,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";

const highlights = [
	{
		icon: Network,
		title: "Exclusive Networking",
		description:
			"Connect with 500+ industry leaders, decision-makers, and potential partners in curated networking sessions.",
	},
	{
		icon: Lightbulb,
		title: "Expert Insights",
		description:
			"Learn from 25+ thought leaders sharing cutting-edge strategies and real-world case studies.",
	},
	{
		icon: TrendingUp,
		title: "Growth Opportunities",
		description:
			"Discover new business opportunities, partnerships, and strategies to accelerate your growth.",
	},
	{
		icon: Award,
		title: "Industry Recognition",
		description:
			"Celebrate excellence at our annual awards ceremony recognizing innovation and achievement.",
	},
	{
		icon: Users,
		title: "Interactive Workshops",
		description:
			"Participate in hands-on workshops with industry experts to develop practical skills.",
	},
	{
		icon: MessageSquare,
		title: "Q&A Sessions",
		description:
			"Get your burning questions answered directly by speakers and industry veterans.",
	},
];

export function HighlightsSection() {
	return (
		<section className="py-20 bg-muted/30">
			<div className="container mx-auto px-4">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="text-center mb-16">
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-3xl lg:text-5xl font-bold mb-4"
						>
							Why You Can't Miss This Event
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							Two days packed with opportunities to learn, connect, and grow
							your business
						</motion.p>
					</div>

					{/* Highlights Grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{highlights.map((highlight, index) => (
							<motion.div
								key={`highlight-${highlight.title.replace(/\s+/g, "-").toLowerCase()}`}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								viewport={{ once: true }}
							>
								<Card className="h-full hover:shadow-lg transition-shadow">
									<CardContent className="p-6">
										<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
											<highlight.icon className="w-6 h-6 text-primary" />
										</div>
										<h3 className="text-xl font-semibold mb-3">
											{highlight.title}
										</h3>
										<p className="text-muted-foreground">
											{highlight.description}
										</p>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>

					{/* Stats */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6 }}
						viewport={{ once: true }}
						className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16 pt-16 border-t"
					>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary mb-2">500+</div>
							<div className="text-muted-foreground">Attendees</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary mb-2">25+</div>
							<div className="text-muted-foreground">Expert Speakers</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary mb-2">40+</div>
							<div className="text-muted-foreground">Sessions</div>
						</div>
						<div className="text-center">
							<div className="text-4xl font-bold text-primary mb-2">2</div>
							<div className="text-muted-foreground">Full Days</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

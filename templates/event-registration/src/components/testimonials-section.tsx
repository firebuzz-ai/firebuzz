import { Quote } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
	{
		name: "Jennifer Martinez",
		role: "VP of Marketing",
		company: "TechGrowth Inc.",
		content:
			"Last year's event was a game-changer for our business. We made three strategic partnerships that increased our revenue by 40%. This year's event is already in our calendar!",
		rating: 5,
	},
	{
		name: "Robert Chen",
		role: "CEO",
		company: "InnovateSoft",
		content:
			"The networking opportunities alone made it worth attending. I connected with potential investors and closed a Series A round within two months of the event.",
		rating: 5,
	},
	{
		name: "Amanda Williams",
		role: "Director of Operations",
		company: "GlobalScale",
		content:
			"The speaker lineup was incredible. I implemented three strategies I learned and saw immediate results. Best professional development investment I've made.",
		rating: 5,
	},
	{
		name: "David Kim",
		role: "Founder",
		company: "StartupLab",
		content:
			"As a first-time attendee, I was blown away by the quality of connections and content. This event sets the bar for B2B conferences.",
		rating: 5,
	},
	{
		name: "Lisa Thompson",
		role: "Sales Director",
		company: "Enterprise Solutions",
		content:
			"The workshops were incredibly practical. Our team applied what we learned and increased our close rate by 25% in the following quarter.",
		rating: 5,
	},
	{
		name: "Marcus Johnson",
		role: "CTO",
		company: "CloudTech",
		content:
			"Excellent organization, world-class speakers, and meaningful connections. This is the one event I never miss each year.",
		rating: 5,
	},
];

export function TestimonialsSection() {
	const scrollToRegistration = () => {
		const registrationSection = document.getElementById("registration");
		if (registrationSection) {
			registrationSection.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<section className="py-20">
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
							What Past Attendees Say
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							Don't just take our word for it. Hear from professionals who
							transformed their business at our events
						</motion.p>
					</div>

					{/* Testimonials Grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
						{testimonials.map((testimonial, index) => (
							<motion.div
								key={`testimonial-${testimonial.name.replace(/\s+/g, "-").toLowerCase()}`}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								viewport={{ once: true }}
							>
								<Card className="h-full">
									<CardContent className="p-6">
										{/* Quote Icon */}
										<Quote className="w-8 h-8 text-primary/20 mb-4" />

										{/* Rating */}
										<div className="flex mb-4">
											{[...Array(testimonial.rating)].map((_, i) => (
												<svg
													key={`star-${i}`}
													className="w-4 h-4 text-amber-500"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
												</svg>
											))}
										</div>

										{/* Content */}
										<p className="text-muted-foreground mb-6">
											"{testimonial.content}"
										</p>

										{/* Author */}
										<div className="flex items-center">
											<div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
												<span className="text-primary font-semibold text-sm">
													{testimonial.name
														.split(" ")
														.map((n) => n[0])
														.join("")}
												</span>
											</div>
											<div>
												<div className="font-semibold">{testimonial.name}</div>
												<div className="text-sm text-muted-foreground">
													{testimonial.role}
												</div>
												<div className="text-sm text-primary">
													{testimonial.company}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>

					{/* CTA */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6 }}
						viewport={{ once: true }}
						className="text-center"
					>
						<div className="bg-primary/5 rounded-2xl p-8 lg:p-12 max-w-3xl mx-auto">
							<h3 className="text-2xl lg:text-3xl font-bold mb-4">
								Ready to Transform Your Business?
							</h3>
							<p className="text-muted-foreground mb-6 text-lg">
								Join hundreds of professionals who have already secured their
								spot. Limited seats remaining!
							</p>
							<button
								onClick={scrollToRegistration}
								className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors text-lg"
							>
								Secure Your Spot Now
							</button>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

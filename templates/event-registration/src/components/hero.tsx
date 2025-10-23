import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
	const scrollToRegistration = () => {
		const registrationSection = document.getElementById("registration");
		if (registrationSection) {
			registrationSection.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<section className="relative py-20 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="max-w-5xl mx-auto">
					<div className="text-center">
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="inline-block mb-6"
						>
							<Badge
								variant="secondary"
								className="px-6 py-2 text-sm font-medium"
							>
								🎯 Limited Seats Available
							</Badge>
						</motion.div>

						{/* Headline */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
						>
							Connect. Learn. Grow.
							<span className="block mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
								At the Premier B2B Event
							</span>
						</motion.h1>

						{/* Subheadline */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
						>
							Join industry leaders, innovators, and decision-makers for two
							days of networking, insights, and opportunities that will
							transform your business.
						</motion.p>

						{/* Event Details */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10"
						>
							<div className="flex items-center space-x-2 text-muted-foreground">
								<Calendar className="w-5 h-5 text-primary" />
								<span className="font-medium">June 15-16, 2025</span>
							</div>
							<div className="flex items-center space-x-2 text-muted-foreground">
								<MapPin className="w-5 h-5 text-primary" />
								<span className="font-medium">San Francisco, CA</span>
							</div>
							<div className="flex items-center space-x-2 text-muted-foreground">
								<Users className="w-5 h-5 text-primary" />
								<span className="font-medium">500+ Attendees</span>
							</div>
						</motion.div>

						{/* CTAs */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
						>
							<Button
								size="lg"
								className="px-8 py-6 text-lg group"
								onClick={scrollToRegistration}
							>
								Register Now
								<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</Button>
							<Button size="lg" variant="outline" className="px-8 py-6 text-lg">
								View Agenda
							</Button>
						</motion.div>

						{/* Social Proof */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.5 }}
							className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground"
						>
							<div className="flex items-center space-x-2">
								<div className="flex -space-x-2">
									<div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
										JD
									</div>
									<div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
										SK
									</div>
									<div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold">
										MR
									</div>
								</div>
								<span>127 registered today</span>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-amber-500">★★★★★</span>
								<span>4.9/5 from past attendees</span>
							</div>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Background decoration */}
			<div className="absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
				<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
			</div>
		</section>
	);
}

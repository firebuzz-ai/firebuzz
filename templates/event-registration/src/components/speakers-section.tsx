import { Linkedin, Twitter } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const speakers = [
	{
		name: "Sarah Johnson",
		role: "CEO",
		company: "TechVision Inc.",
		topic: "The Future of B2B Digital Transformation",
		image:
			"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
	{
		name: "Michael Chen",
		role: "Chief Innovation Officer",
		company: "InnovateCorp",
		topic: "AI-Powered Business Strategy",
		image:
			"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
	{
		name: "Emily Rodriguez",
		role: "VP of Sales",
		company: "Global Solutions",
		topic: "Building High-Performance Sales Teams",
		image:
			"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
	{
		name: "David Kim",
		role: "Marketing Director",
		company: "GrowthHub",
		topic: "Modern B2B Marketing Tactics",
		image:
			"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
	{
		name: "Lisa Thompson",
		role: "CTO",
		company: "CloudScale",
		topic: "Scaling Tech Infrastructure",
		image:
			"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
	{
		name: "James Wilson",
		role: "Founder",
		company: "StartupLab",
		topic: "From Startup to Scale-up",
		image:
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
		linkedin: "#",
		twitter: "#",
	},
];

export function SpeakersSection() {
	return (
		<section className="py-20">
			<div className="container mx-auto px-4">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="text-center mb-16">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="inline-block mb-4"
						>
							<Badge variant="outline" className="px-4 py-2 text-sm font-medium">
								Featured Speakers
							</Badge>
						</motion.div>
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-3xl lg:text-5xl font-bold mb-4"
						>
							Learn from Industry Leaders
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							Hear from visionaries and experts who are shaping the future of
							business
						</motion.p>
					</div>

					{/* Speakers Grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{speakers.map((speaker, index) => (
							<motion.div
								key={`speaker-${speaker.name.replace(/\s+/g, "-").toLowerCase()}`}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								viewport={{ once: true }}
							>
								<Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
									<CardContent className="p-0">
										{/* Speaker Image */}
										<div className="aspect-square overflow-hidden bg-muted">
											<img
												src={speaker.image}
												alt={speaker.name}
												className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
											/>
										</div>

										{/* Speaker Info */}
										<div className="p-6">
											<h3 className="text-xl font-semibold mb-1">
												{speaker.name}
											</h3>
											<p className="text-sm text-muted-foreground mb-1">
												{speaker.role}
											</p>
											<p className="text-sm font-medium text-primary mb-3">
												{speaker.company}
											</p>
											<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
												"{speaker.topic}"
											</p>

											{/* Social Links */}
											<div className="flex space-x-3">
												<a
													href={speaker.linkedin}
													className="text-muted-foreground hover:text-primary transition-colors"
													aria-label={`${speaker.name} LinkedIn`}
												>
													<Linkedin className="w-5 h-5" />
												</a>
												<a
													href={speaker.twitter}
													className="text-muted-foreground hover:text-primary transition-colors"
													aria-label={`${speaker.name} Twitter`}
												>
													<Twitter className="w-5 h-5" />
												</a>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

import { motion } from "motion/react";

const sponsors = {
	platinum: [
		{ name: "TechVision", logo: "https://via.placeholder.com/200x80/667eea/ffffff?text=TechVision" },
		{ name: "CloudScale", logo: "https://via.placeholder.com/200x80/764ba2/ffffff?text=CloudScale" },
	],
	gold: [
		{ name: "InnovateCorp", logo: "https://via.placeholder.com/180x70/f093fb/ffffff?text=InnovateCorp" },
		{ name: "GrowthHub", logo: "https://via.placeholder.com/180x70/4facfe/ffffff?text=GrowthHub" },
		{ name: "StartupLab", logo: "https://via.placeholder.com/180x70/43e97b/ffffff?text=StartupLab" },
	],
	silver: [
		{ name: "DevCorp", logo: "https://via.placeholder.com/160x60/fa709a/ffffff?text=DevCorp" },
		{ name: "Enterprise Solutions", logo: "https://via.placeholder.com/160x60/fee140/333333?text=Enterprise" },
		{ name: "Global Inc", logo: "https://via.placeholder.com/160x60/30cfd0/ffffff?text=GlobalInc" },
		{ name: "BusinessPro", logo: "https://via.placeholder.com/160x60/a8edea/333333?text=BusinessPro" },
	],
};

export function SponsorsSection() {
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
							Our Partners & Sponsors
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							This event is made possible by our incredible partners and
							sponsors
						</motion.p>
					</div>

					{/* Platinum Sponsors */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						viewport={{ once: true }}
						className="mb-16"
					>
						<div className="text-center mb-8">
							<h3 className="text-2xl font-bold mb-2">Platinum Sponsors</h3>
							<div className="w-24 h-1 bg-primary mx-auto" />
						</div>
						<div className="flex flex-wrap justify-center items-center gap-12">
							{sponsors.platinum.map((sponsor, index) => (
								<motion.div
									key={`platinum-${sponsor.name.replace(/\s+/g, "-").toLowerCase()}`}
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.4, delay: index * 0.1 }}
									viewport={{ once: true }}
									className="bg-card p-8 rounded-lg border hover:shadow-lg transition-shadow"
								>
									<img
										src={sponsor.logo}
										alt={`${sponsor.name} logo`}
										className="h-20 object-contain"
									/>
								</motion.div>
							))}
						</div>
					</motion.div>

					{/* Gold Sponsors */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
						viewport={{ once: true }}
						className="mb-16"
					>
						<div className="text-center mb-8">
							<h3 className="text-xl font-bold mb-2">Gold Sponsors</h3>
							<div className="w-20 h-1 bg-amber-500 mx-auto" />
						</div>
						<div className="flex flex-wrap justify-center items-center gap-8">
							{sponsors.gold.map((sponsor, index) => (
								<motion.div
									key={`gold-${sponsor.name.replace(/\s+/g, "-").toLowerCase()}`}
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.4, delay: index * 0.1 }}
									viewport={{ once: true }}
									className="bg-card p-6 rounded-lg border hover:shadow-lg transition-shadow"
								>
									<img
										src={sponsor.logo}
										alt={`${sponsor.name} logo`}
										className="h-16 object-contain"
									/>
								</motion.div>
							))}
						</div>
					</motion.div>

					{/* Silver Sponsors */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						viewport={{ once: true }}
					>
						<div className="text-center mb-8">
							<h3 className="text-lg font-bold mb-2">Silver Sponsors</h3>
							<div className="w-16 h-1 bg-muted-foreground mx-auto" />
						</div>
						<div className="flex flex-wrap justify-center items-center gap-6">
							{sponsors.silver.map((sponsor, index) => (
								<motion.div
									key={`silver-${sponsor.name.replace(/\s+/g, "-").toLowerCase()}`}
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.4, delay: index * 0.1 }}
									viewport={{ once: true }}
									className="bg-card p-4 rounded-lg border hover:shadow-md transition-shadow"
								>
									<img
										src={sponsor.logo}
										alt={`${sponsor.name} logo`}
										className="h-12 object-contain"
									/>
								</motion.div>
							))}
						</div>
					</motion.div>

					{/* Become a Sponsor CTA */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.5 }}
						viewport={{ once: true }}
						className="mt-20 text-center"
					>
						<div className="bg-muted/50 rounded-2xl p-8 lg:p-12 max-w-3xl mx-auto border">
							<h3 className="text-2xl font-bold mb-4">
								Interested in Sponsoring?
							</h3>
							<p className="text-muted-foreground mb-6 text-lg">
								Connect with 500+ industry leaders and showcase your brand at the
								premier B2B event of the year.
							</p>
							<button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
								Download Sponsorship Package
							</button>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

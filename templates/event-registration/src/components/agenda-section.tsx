import { Clock, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const day1Schedule = [
	{
		time: "8:00 AM - 9:00 AM",
		title: "Registration & Breakfast",
		speaker: null,
		location: "Main Hall",
		type: "networking",
	},
	{
		time: "9:00 AM - 9:30 AM",
		title: "Opening Keynote: The Future of B2B",
		speaker: "Sarah Johnson, CEO at TechVision",
		location: "Auditorium A",
		type: "keynote",
	},
	{
		time: "9:45 AM - 10:30 AM",
		title: "AI-Powered Business Strategy",
		speaker: "Michael Chen, CIO at InnovateCorp",
		location: "Room 101",
		type: "talk",
	},
	{
		time: "10:45 AM - 11:30 AM",
		title: "Building High-Performance Teams",
		speaker: "Emily Rodriguez, VP of Sales",
		location: "Room 102",
		type: "talk",
	},
	{
		time: "11:30 AM - 12:30 PM",
		title: "Networking Lunch",
		speaker: null,
		location: "Terrace",
		type: "networking",
	},
	{
		time: "12:30 PM - 2:00 PM",
		title: "Interactive Workshop: Modern B2B Marketing",
		speaker: "David Kim, Marketing Director",
		location: "Workshop Room",
		type: "workshop",
	},
	{
		time: "2:15 PM - 3:00 PM",
		title: "Panel Discussion: Scaling Tech Infrastructure",
		speaker: "Multiple Speakers",
		location: "Auditorium A",
		type: "panel",
	},
	{
		time: "3:15 PM - 4:00 PM",
		title: "Breakout Sessions",
		speaker: "Various Speakers",
		location: "Multiple Rooms",
		type: "talk",
	},
	{
		time: "4:00 PM - 6:00 PM",
		title: "Evening Reception & Networking",
		speaker: null,
		location: "Rooftop Lounge",
		type: "networking",
	},
];

const day2Schedule = [
	{
		time: "8:30 AM - 9:00 AM",
		title: "Continental Breakfast",
		speaker: null,
		location: "Main Hall",
		type: "networking",
	},
	{
		time: "9:00 AM - 9:45 AM",
		title: "From Startup to Scale-up",
		speaker: "James Wilson, Founder at StartupLab",
		location: "Auditorium A",
		type: "keynote",
	},
	{
		time: "10:00 AM - 11:30 AM",
		title: "Deep Dive Workshops (Choose Your Track)",
		speaker: "Various Experts",
		location: "Multiple Rooms",
		type: "workshop",
	},
	{
		time: "11:45 AM - 12:30 PM",
		title: "Case Study Presentations",
		speaker: "Industry Leaders",
		location: "Room 101-103",
		type: "talk",
	},
	{
		time: "12:30 PM - 1:30 PM",
		title: "Networking Lunch",
		speaker: null,
		location: "Terrace",
		type: "networking",
	},
	{
		time: "1:30 PM - 2:15 PM",
		title: "Q&A with Industry Veterans",
		speaker: "All Speakers",
		location: "Auditorium A",
		type: "panel",
	},
	{
		time: "2:30 PM - 3:15 PM",
		title: "Closing Keynote & Awards Ceremony",
		speaker: "Event Organizers",
		location: "Auditorium A",
		type: "keynote",
	},
	{
		time: "3:15 PM - 4:00 PM",
		title: "Farewell Reception",
		speaker: null,
		location: "Main Hall",
		type: "networking",
	},
];

const typeColors = {
	keynote: "bg-primary/10 text-primary",
	talk: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	workshop: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	panel: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
	networking: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

const typeLabels = {
	keynote: "Keynote",
	talk: "Talk",
	workshop: "Workshop",
	panel: "Panel",
	networking: "Networking",
};

export function AgendaSection() {
	const [activeDay, setActiveDay] = useState("day1");

	const renderSchedule = (schedule: typeof day1Schedule) => (
		<div className="space-y-4">
			{schedule.map((item, index) => (
				<motion.div
					key={`${activeDay}-${index}`}
					initial={{ opacity: 0, x: -20 }}
					whileInView={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.4, delay: index * 0.05 }}
					viewport={{ once: true }}
				>
					<Card className="hover:shadow-md transition-shadow">
						<CardContent className="p-6">
							<div className="flex flex-col md:flex-row md:items-start gap-4">
								{/* Time */}
								<div className="flex items-center space-x-2 text-muted-foreground min-w-[180px]">
									<Clock className="w-4 h-4" />
									<span className="font-medium">{item.time}</span>
								</div>

								{/* Content */}
								<div className="flex-1">
									<div className="flex flex-wrap items-start gap-3 mb-2">
										<h3 className="text-lg font-semibold">{item.title}</h3>
										<Badge
											variant="secondary"
											className={typeColors[item.type]}
										>
											{typeLabels[item.type]}
										</Badge>
									</div>
									{item.speaker && (
										<p className="text-sm text-muted-foreground mb-2">
											{item.speaker}
										</p>
									)}
									<div className="flex items-center space-x-2 text-sm text-muted-foreground">
										<MapPin className="w-4 h-4" />
										<span>{item.location}</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			))}
		</div>
	);

	return (
		<section className="py-20 bg-muted/30">
			<div className="container mx-auto px-4">
				<div className="max-w-5xl mx-auto">
					{/* Header */}
					<div className="text-center mb-12">
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-3xl lg:text-5xl font-bold mb-4"
						>
							Event Agenda
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							Two full days of insights, workshops, and networking opportunities
						</motion.p>
					</div>

					{/* Tabs */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						viewport={{ once: true }}
					>
						<Tabs
							value={activeDay}
							onValueChange={setActiveDay}
							className="w-full"
						>
							<TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
								<TabsTrigger value="day1">
									<div>
										<div className="font-semibold">Day 1</div>
										<div className="text-xs text-muted-foreground">
											June 15, 2025
										</div>
									</div>
								</TabsTrigger>
								<TabsTrigger value="day2">
									<div>
										<div className="font-semibold">Day 2</div>
										<div className="text-xs text-muted-foreground">
											June 16, 2025
										</div>
									</div>
								</TabsTrigger>
							</TabsList>

							<TabsContent value="day1">{renderSchedule(day1Schedule)}</TabsContent>
							<TabsContent value="day2">{renderSchedule(day2Schedule)}</TabsContent>
						</Tabs>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

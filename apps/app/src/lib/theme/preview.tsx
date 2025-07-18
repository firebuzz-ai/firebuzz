import { getFontFamilyWithFallbacks } from "@/lib/theme/utils";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	ArrowRight,
	Award,
	Check,
	Globe,
	Lock,
	Mail,
	MapPin,
	Menu,
	Moon,
	Phone,
	Play,
	Quote,
	RefreshCw,
	Shield,
	Star,
	Sun,
	Target,
	TrendingUp,
	Users,
	Zap,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ThemeFormType } from "../../app/(workspace)/(dashboard)/brand/themes/_components/theme/form";

interface BrandData {
	name: string;
	logo?: string;
	favicon?: string;
	description?: string;
	website?: string;
	phone?: string;
	email?: string;
	address?: string;
}

interface BrowserPreviewProps {
	previewMode: "light" | "dark";
	brandData: BrandData;
	onThemeToggle: (checked: boolean) => void;
	themeData?: ThemeFormType | null;
}

// Dynamic font loading utility
const loadedFonts = new Set<string>();

const loadGoogleFont = (fontName: string) => {
	// Skip if already loaded or if it's a system font
	if (loadedFonts.has(fontName)) return;

	// Check if it's a system font (shouldn't be loaded)
	const systemFonts = [
		"Arial",
		"Helvetica",
		"Helvetica Neue",
		"Segoe UI",
		"San Francisco",
		"system-ui",
		"sans-serif",
		"Times New Roman",
		"Georgia",
		"Times",
		"serif",
		"Monaco",
		"Consolas",
		"SF Mono",
		"Menlo",
		"Courier New",
		"Courier",
		"monospace",
	];

	if (systemFonts.includes(fontName)) return;

	// Create Google Fonts URL
	const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName.replace(/\s+/g, "+"))}:wght@400;500;600&display=swap`;

	// Check if font is already loaded in document
	const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
	if (existingLink) {
		loadedFonts.add(fontName);
		return;
	}

	// Create and inject font link
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = fontUrl;
	link.onload = () => {
		loadedFonts.add(fontName);
	};
	document.head.appendChild(link);
};

const LandingPagePreview = ({
	previewMode,
	brandData,
	onThemeToggle,
}: {
	previewMode: "light" | "dark";
	brandData: BrandData;
	onThemeToggle: (checked: boolean) => void;
}) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	return (
		<div className="h-full max-w-4xl max-h-full mx-auto overflow-hidden border rounded-lg shadow-xl bg-background @container">
			{/* Browser Header - NO THEME STYLES APPLIED HERE */}
			<div className="flex gap-3 items-center px-4 py-3 border-b bg-muted/50">
				{/* Traffic Lights */}
				<div className="flex gap-2 items-center">
					<div className="w-3 h-3 bg-red-500 rounded-full" />
					<div className="w-3 h-3 bg-yellow-500 rounded-full" />
					<div className="w-3 h-3 bg-green-500 rounded-full" />
				</div>

				{/* Address Bar */}
				<div className="flex flex-1 gap-2 items-center ml-4">
					<div className="flex items-center bg-background border rounded-md px-3 py-1.5 flex-1 max-w-lg">
						<div className="flex gap-1 items-center">
							{brandData.favicon ? (
								<Image
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${brandData.favicon}`}
									alt="Favicon"
									width={12}
									height={12}
									className="object-contain w-3 h-3"
									unoptimized
								/>
							) : (
								<Lock className="w-3 h-3 text-green-600" />
							)}
							<span className="text-sm text-muted-foreground">https://</span>
						</div>
						<span className="text-sm font-medium">
							{brandData.website
								? brandData.website.replace(/^https?:\/\//, "")
								: `${brandData.name.toLowerCase().replace(/\s+/g, "")}.com`}
						</span>
					</div>

					<Button variant="outline" size="sm" className="px-1.5">
						<RefreshCw className="!size-3.5" />
					</Button>
				</div>

				{/* Browser Tab */}
				<div className="hidden md:flex items-center gap-2 bg-background border rounded-t-md px-3 py-1.5 min-w-0">
					{brandData.favicon ? (
						<Image
							src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${brandData.favicon}`}
							alt="Favicon"
							width={16}
							height={16}
							className="object-contain w-4 h-4"
							unoptimized
						/>
					) : (
						<Globe className="w-4 h-4 text-muted-foreground" />
					)}
					<span className="text-sm font-medium truncate max-w-32">
						{brandData.name}
					</span>
				</div>
			</div>

			{/* Website Content - THEME STYLES APPLIED ONLY HERE */}
			<div className="overflow-y-auto pb-16 h-full max-h-full themed-content bg-background">
				{/* Navigation */}
				<nav className="sticky top-0 z-10 border-b backdrop-blur bg-background/95">
					<div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							{/* Logo */}
							<div className="flex items-center">
								{brandData.logo ? (
									<Image
										src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${brandData.logo}`}
										alt={`${brandData.name} logo`}
										height={32}
										width={128}
										className="object-contain h-8"
										unoptimized
									/>
								) : (
									<div className="flex items-center">
										<div className="flex justify-center items-center w-8 h-8 rounded bg-primary">
											<span className="text-sm font-bold text-primary-foreground">
												{brandData.name.charAt(0)}
											</span>
										</div>
										<span className="ml-2 text-lg font-bold">
											{brandData.name}
										</span>
									</div>
								)}
							</div>

							{/* Navigation Links */}
							<div className="items-center hidden space-x-8 @2xl:flex">
								<span className="text-sm font-medium transition-colors cursor-pointer hover:text-primary">
									Home
								</span>
								<span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
									Products
								</span>
								<span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
									About
								</span>
								<span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
									Contact
								</span>
							</div>

							{/* Right Side - Theme Switcher & CTA */}
							<div className="flex gap-4 items-center">
								{/* Theme Switcher */}
								<div className="flex gap-2 items-center">
									<Button
										variant="ghost"
										size="iconSm"
										onClick={() => onThemeToggle(!previewMode.includes("dark"))}
										className="relative transition-all duration-300 hover:scale-110"
									>
										<div className="flex absolute inset-0 justify-center items-center">
											<Sun
												className={`size-4 transition-all  duration-500 ${
													previewMode === "dark"
														? "rotate-90 scale-0 opacity-0"
														: "rotate-0 scale-100 opacity-100 ml-4"
												}`}
											/>
											<Moon
												className={`size-4 transition-all duration-500 ${
													previewMode === "dark"
														? "rotate-0 scale-100 opacity-100 mr-4"
														: "-rotate-90 scale-0 opacity-0  "
												}`}
											/>
										</div>
									</Button>
								</div>

								<Button size="sm" className="hidden @2xl:inline-flex">
									Get Started
									<ArrowRight className="ml-1 w-4 h-4" />
								</Button>
								<Button variant="ghost" size="sm" className="@2xl:hidden">
									<Menu className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</div>
				</nav>

				{/* Hero Section */}
				<div className="overflow-hidden relative bg-gradient-to-br from-primary/5 via-background to-muted/20">
					<div className="px-4 py-16 mx-auto max-w-7xl @2xl:px-6 @2xl:py-20">
						<div className="text-center">
							<Badge
								variant="secondary"
								className="mb-4 !text-secondary-foreground"
							>
								<Star className="mr-1 w-3 h-3" />
								{previewMode === "dark" ? "Dark" : "Light"} Theme Preview
							</Badge>

							<h1 className="mb-6 text-3xl font-bold tracking-tight @2xl:text-4xl @2xl:text-5xl">
								Welcome to{" "}
								<span className="text-primary">{brandData.name}</span>
							</h1>

							<p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
								{brandData.description ||
									`Experience how your custom theme looks and feels across different components and layouts. 
                See your colors, typography, and styling in action.`}
							</p>

							<div className="flex flex-col gap-4 justify-center items-center mb-12 sm:flex-row">
								<Button size="lg" className="px-8 text-base">
									<Play className="mr-2 w-4 h-4" />
									Get Started Now
								</Button>
								<Button
									variant="secondary"
									size="lg"
									className="px-8 text-base"
								>
									Learn More
								</Button>
							</div>

							{/* Info Box */}
							<div className="mb-12">
								<div className="inline-flex gap-2 items-center px-4 py-2 mx-auto rounded-md bg-muted">
									<Check className="w-4 h-4 text-primary" />
									<span className="font-mono text-xs">
										No credit card required
									</span>
								</div>
							</div>

							{/* Stats */}
							<div className="grid max-w-2xl grid-cols-1 gap-8 mx-auto @lg:grid-cols-3">
								<div className="text-center">
									<div className="flex gap-2 justify-center items-center mb-2">
										<Users className="w-5 h-5 text-primary" />
										<span className="text-2xl font-bold">10k+</span>
									</div>
									<p className="text-sm text-muted-foreground">
										Happy Customers
									</p>
								</div>
								<div className="text-center">
									<div className="flex gap-2 justify-center items-center mb-2">
										<TrendingUp className="w-5 h-5 text-primary" />
										<span className="text-2xl font-bold">99%</span>
									</div>
									<p className="text-sm text-muted-foreground">Uptime</p>
								</div>
								<div className="text-center">
									<div className="flex gap-2 justify-center items-center mb-2">
										<Shield className="w-5 h-5 text-primary" />
										<span className="text-2xl font-bold">100%</span>
									</div>
									<p className="text-sm text-muted-foreground">Secure</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Features Preview */}
				<div className="py-12 bg-muted/30">
					<div className="px-4 mx-auto max-w-7xl @2xl:px-6">
						<div className="mb-8 text-center">
							<h2 className="mb-2 text-2xl font-bold">
								Why Choose Our Platform?
							</h2>
							<p className="text-muted-foreground">
								Everything you need to build amazing experiences
							</p>
						</div>

						<div className="grid grid-cols-1 gap-6 @2xl:grid-cols-3">
							{[
								{
									id: "easy-setup",
									title: "Easy Setup",
									desc: "Get started in minutes with our simple onboarding process",
									icon: Zap,
								},
								{
									id: "powerful-features",
									title: "Powerful Features",
									desc: "Advanced tools and integrations to scale your business",
									icon: Target,
								},
								{
									id: "award-winning",
									title: "Award Winning",
									desc: "Recognized by industry leaders for innovation and quality",
									icon: Award,
								},
							].map((feature) => (
								<div
									key={feature.id}
									className="p-6 rounded-lg border transition-shadow bg-background hover:shadow-md"
								>
									<div className="flex justify-center items-center mb-4 w-10 h-10 rounded-lg bg-primary/10">
										<feature.icon className="w-5 h-5 text-primary" />
									</div>
									<h3 className="mb-2 font-semibold">{feature.title}</h3>
									<p className="text-sm text-muted-foreground">
										{feature.desc}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Testimonials Section */}
				<div className="py-12 bg-background">
					<div className="px-4 mx-auto max-w-7xl @2xl:px-6">
						<div className="mb-8 text-center">
							<h2 className="mb-2 text-2xl font-bold">
								What Our Customers Say
							</h2>
							<p className="text-muted-foreground">
								Real feedback from real customers
							</p>
						</div>

						<div className="grid grid-cols-1 gap-6 @2xl:grid-cols-3">
							{[
								{
									id: "sarah-johnson",
									name: "Sarah Johnson",
									role: "Marketing Director",
									content:
										"This platform perfectly captures our brand identity. The customization options are incredible.",
								},
								{
									id: "mike-chen",
									name: "Mike Chen",
									role: "Startup Founder",
									content:
										"The ease of use is amazing. We were able to launch our brand in record time.",
								},
								{
									id: "emma-davis",
									name: "Emma Davis",
									role: "Design Lead",
									content:
										"Professional, modern, and clean. Our team productivity has increased significantly.",
								},
							].map((testimonial) => (
								<div
									key={testimonial.id}
									className="p-6 rounded-lg border bg-card"
								>
									<Quote className="mb-4 w-8 h-8 text-muted-foreground" />
									<p className="mb-4 text-sm italic">"{testimonial.content}"</p>
									<div className="flex gap-3 items-center">
										<div className="flex justify-center items-center w-10 h-10 rounded-full bg-muted">
											<span className="text-sm font-medium text-muted-foreground">
												{testimonial.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</span>
										</div>
										<div>
											<p className="text-sm font-medium">{testimonial.name}</p>
											<p className="text-xs text-muted-foreground">
												{testimonial.role}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Contact Form Section */}
				<div className="py-12 bg-muted/30">
					<div className="px-4 mx-auto max-w-7xl @2xl:px-6">
						<div className="grid grid-cols-1 gap-12 @2xl:grid-cols-2">
							{/* Contact Info */}
							<div>
								<h2 className="mb-4 text-2xl font-bold">Get In Touch</h2>
								<p className="mb-8 text-muted-foreground">
									Ready to transform your business? Let's discuss your project
									and see how we can help.
								</p>

								<div className="space-y-4">
									<div className="flex gap-3 items-center">
										<div className="flex justify-center items-center w-10 h-10 rounded-lg bg-primary/10">
											<Mail className="w-5 h-5 text-primary" />
										</div>
										<div>
											<p className="font-medium">Email</p>
											<p className="text-sm text-muted-foreground">
												{brandData.email ?? "hello@example.com"}
											</p>
										</div>
									</div>

									<div className="flex gap-3 items-center">
										<div className="flex justify-center items-center w-10 h-10 rounded-lg bg-primary/10">
											<Phone className="w-5 h-5 text-primary" />
										</div>
										<div>
											<p className="font-medium">Phone</p>
											<p className="text-sm text-muted-foreground">
												{brandData.phone ?? "+1 (555) 123-4567"}
											</p>
										</div>
									</div>

									<div className="flex gap-3 items-center">
										<div className="flex justify-center items-center w-10 h-10 rounded-lg bg-primary/10">
											<MapPin className="w-5 h-5 text-primary" />
										</div>
										<div>
											<p className="font-medium">Office</p>
											<p className="text-sm text-muted-foreground">
												{brandData.address ??
													"123 Business St, City, State 12345"}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Contact Form */}
							<div className="p-6 rounded-lg border bg-card">
								<h3 className="mb-4 text-lg font-semibold">
									Send us a message
								</h3>
								<div className="space-y-4">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<Label
												htmlFor="firstName"
												className="text-sm font-medium"
											>
												First Name
											</Label>
											<Input
												id="firstName"
												placeholder="John"
												className="mt-1"
											/>
										</div>
										<div>
											<Label htmlFor="lastName" className="text-sm font-medium">
												Last Name
											</Label>
											<Input id="lastName" placeholder="Doe" className="mt-1" />
										</div>
									</div>

									<div>
										<Label htmlFor="email" className="text-sm font-medium">
											Email
										</Label>
										<Input
											id="email"
											type="email"
											placeholder="john@example.com"
											className="mt-1"
										/>
									</div>

									<div>
										<Label htmlFor="message" className="text-sm font-medium">
											Message
										</Label>
										<Textarea
											id="message"
											placeholder="Tell us about your project..."
											className="mt-1 min-h-[100px]"
										/>
									</div>

									<Button className="w-full">
										<Check className="mr-2 w-4 h-4" />
										Send Message
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* CTA Section */}
				<div className="py-12 bg-primary/5">
					<div className="px-4 mx-auto max-w-7xl @2xl:px-6">
						<div className="mb-8 text-center">
							<h2 className="mb-2 text-2xl font-bold">Ready to Get Started?</h2>
							<p className="text-muted-foreground">
								Join thousands of satisfied customers and transform your
								business today
							</p>
						</div>

						<div className="flex gap-4 justify-center items-center">
							<Button size="lg" className="px-8 text-base">
								Start Your Journey
							</Button>
							<Button variant="secondary" size="lg" className="px-8 text-base">
								Schedule a Demo
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export const BrowserPreview = ({
	previewMode,
	brandData,
	onThemeToggle,
	themeData,
}: BrowserPreviewProps) => {
	const [cssVariables, setCssVariables] = useState<Record<string, string>>({});

	// Convert HSL values to CSS custom properties and update whenever formValues change
	useEffect(() => {
		if (!themeData) {
			setCssVariables({});
			return;
		}

		const theme = themeData[`${previewMode}Theme`];
		const variables: Record<string, string> = {};

		// Apply color variables - convert HSL to the format CSS expects
		for (const [key, value] of Object.entries(theme)) {
			if (key !== "radius") {
				const cssVariableName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
				variables[cssVariableName] = value;
			}
		}

		// Apply radius as CSS length value (not HSL)
		variables["--radius"] = themeData.lightTheme.radius;

		// Load Google Fonts for the current fonts
		if (themeData.fonts) {
			loadGoogleFont(themeData.fonts.sans);
			loadGoogleFont(themeData.fonts.serif);
			loadGoogleFont(themeData.fonts.mono);

			// Apply font families with proper fallbacks
			variables["--font-sans"] = getFontFamilyWithFallbacks(
				themeData.fonts.sans,
				"sans",
			);
			variables["--font-serif"] = getFontFamilyWithFallbacks(
				themeData.fonts.serif,
				"serif",
			);
			variables["--font-mono"] = getFontFamilyWithFallbacks(
				themeData.fonts.mono,
				"mono",
			);

			// Override Tailwind font classes by setting CSS properties directly
			variables.fontFamily = getFontFamilyWithFallbacks(
				themeData.fonts.sans,
				"sans",
			); // Default font for the container
		}

		setCssVariables(variables);
	}, [themeData, previewMode]);

	// Create CSS overrides for Tailwind font classes - Apply only to themed content
	const fontOverrideStyles = themeData?.fonts
		? `
    .themed-content {
      font-family: ${getFontFamilyWithFallbacks(themeData.fonts.sans, "sans")} !important;
      color: hsl(var(--foreground)) !important;
    }
    .themed-content .font-sans {
      font-family: ${getFontFamilyWithFallbacks(themeData.fonts.sans, "sans")} !important;
    }
    .themed-content .font-serif {
      font-family: ${getFontFamilyWithFallbacks(themeData.fonts.serif, "serif")} !important;
    }
    .themed-content .font-mono {
      font-family: ${getFontFamilyWithFallbacks(themeData.fonts.mono, "mono")} !important;
    }
    .themed-content h1, .themed-content h2, .themed-content h3, .themed-content h4, .themed-content h5, .themed-content h6 {
      color: hsl(var(--foreground)) !important;
    }
    .themed-content p, .themed-content span, .themed-content div {
      color: inherit;
    }
  `
		: "";

	return (
		<div
			className={cn(
				"h-full transition-colors duration-200",
				previewMode === "dark" ? "dark" : "",
			)}
		>
			{/* Inject font override styles - Apply only to themed content */}
			{fontOverrideStyles && (
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Safe CSS injection for font overrides
				<style dangerouslySetInnerHTML={{ __html: fontOverrideStyles }} />
			)}

			{/* Apply CSS variables only to .themed-content */}
			<style>
				{`.themed-content { ${Object.entries(cssVariables)
					.map(([key, value]) => `${key}: ${value};`)
					.join(" ")} }`}
			</style>

			<LandingPagePreview
				previewMode={previewMode}
				brandData={brandData}
				onThemeToggle={onThemeToggle}
			/>
		</div>
	);
};

export type { BrandData, BrowserPreviewProps };

"use client";

import { Icon } from "@firebuzz/ui/components/brand/icon";
import Link from "next/link";

const productLinks = [
	{ href: "https://app.getfirebuzz.com", label: "Get Started" },
	{ href: "/pricing", label: "Pricing" },
	{ href: "/templates", label: "Templates" },
];

const resourceLinks = [
	{ href: "https://help.getfirebuzz.com", label: "Help Center" },
	{ href: "/blog", label: "Blog" },
	{ href: "/changelog", label: "Changelog" },
	{ href: "/tools", label: "Tools" },
];

const legalLinks = [
	{ href: "/privacy", label: "Privacy" },
	{ href: "/terms", label: "Terms" },
];

export const Footer = () => {
	return (
		<footer className="border-t bg-muted">
			{/* Container */}
			<div className="px-8 py-12 mx-auto max-w-6xl">
				<div className="grid gap-8 lg:grid-cols-4">
					{/* Brand Section */}
					<div className="lg:col-span-2">
						<Link href="/" className="inline-block mb-4">
							<div className="p-2 rounded-lg border bg-muted border-border max-w-fit">
								<Icon className="size-8" />
							</div>
						</Link>
						<p className="max-w-md text-sm leading-relaxed text-muted-foreground">
							AI powered automation for PPC marketers. Create stunning campaigns
							and landing pages in minutes, not hours.
						</p>
					</div>

					{/* Links Section */}
					<div className="lg:col-span-2">
						<div className="grid gap-8 sm:grid-cols-3">
							{/* Product Links */}
							<div>
								<h3 className="mb-4 text-sm font-medium text-foreground">
									Product
								</h3>
								<ul className="space-y-3">
									{productLinks.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-sm transition-colors text-muted-foreground hover:text-foreground"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>

							{/* Resource Links */}
							<div>
								<h3 className="mb-4 text-sm font-medium text-foreground">
									Resources
								</h3>
								<ul className="space-y-3">
									{resourceLinks.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-sm transition-colors text-muted-foreground hover:text-foreground"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>

							{/* Legal Links */}
							<div>
								<h3 className="mb-4 text-sm font-medium text-foreground">
									Legal
								</h3>
								<ul className="space-y-3">
									{legalLinks.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-sm transition-colors text-muted-foreground hover:text-foreground"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Section */}
				<div className="flex flex-col gap-4 justify-between items-center pt-8 mt-8 border-t sm:flex-row">
					<p className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} Firebuzz. All rights reserved.
					</p>
					<p className="text-xs text-muted-foreground">
						Made with ❤️ for marketers
					</p>
				</div>
			</div>
		</footer>
	);
};

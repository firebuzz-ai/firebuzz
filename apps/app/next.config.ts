import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@firebuzz/convex"],
	serverExternalPackages: ["jsdom", "canvas", "paper"],
	/* config options here */
	async redirects() {
		return [
			{
				source: "/brand",
				destination: "/brand/identity",
				permanent: true,
			},
			{
				source: "/storage",
				destination: "/storage/media",
				permanent: true,
			},
			{
				source: "/assets",
				destination: "/assets/landing-pages",
				permanent: true,
			},
			{
				source: "/settings",
				destination: "/settings/account/profile",
				permanent: true,
			},
			{
				source: "/settings/workspace",
				destination: "/settings/workspace/general",
				permanent: true,
			},
			{
				source: "/settings/account",
				destination: "/settings/account/profile",
				permanent: true,
			},
			{
				source: "/settings/subscription",
				destination: "/settings/subscription/plan",
				permanent: true,
			},
		];
	},

	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname:
					"firebuzz-dev.560a894a506b2db116cc83038f514f4e.r2.cloudflarestorage.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname:
					"firebuzz-preview.560a894a506b2db116cc83038f514f4e.r2.cloudflarestorage.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "cdn-dev.getfirebuzz.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "cdn-preview.getfirebuzz.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "cdn.getfirebuzz.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "vercel.com",
				port: "",
				pathname: "/api/www/avatar/**",
			},
		],
	},
	experimental: {
		turbo: {
			resolveAlias: {
				canvas: "./empty-module.ts",
			},
		},
	},
};

export default nextConfig;

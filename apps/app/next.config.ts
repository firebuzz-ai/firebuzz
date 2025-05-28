import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
		];
	},
	async headers() {
		return [
			// Apply strict headers only for WebContainer routes
			{
				source: "/(.*)",
				headers: [
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin",
					},
				],
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

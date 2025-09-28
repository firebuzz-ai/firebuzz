import baseConfig from "@firebuzz/ui/tailwind.config";
import type { Config } from "tailwindcss";

const config: Config = {
	...baseConfig,
	theme: {
		...baseConfig.theme,
		container: {
			center: true,
			padding: "2rem",
			screens: {
				sm: "540px",
				md: "668px",
				lg: "824px",
				xl: "980px",
				"2xl": "1148px",
			},
		},
		extend: {
			...baseConfig.theme?.extend,
			animation: {
				...baseConfig.theme?.extend?.animation,
				marquee: "marquee var(--duration) linear infinite",
			},
			keyframes: {
				...baseConfig.theme?.extend?.keyframes,
				marquee: {
					from: { transform: "translateX(0)" },
					to: { transform: "translateX(calc(-100% - var(--gap)))" },
				},
			},
		},
	},
};

export default config;

import { ViteReactSSG } from "vite-react-ssg/single-page";
import { App } from "./app.tsx";
import { tagsConfiguration } from "./configuration/tags.ts";
import { Head } from "./head";
import "./index.css";
export const createRoot = ViteReactSSG(
	<>
		{/* Tag Manager Script Directly after Body Opening Tag */}
		{tagsConfiguration.googleTagManagerId && (
			<noscript>
				<iframe
					title="Google Tag Manager Noscript"
					src={`https://www.googletagmanager.com/ns.html?id=${tagsConfiguration.googleTagManagerId}`}
					height="0"
					width="0"
					style={{ display: "none", visibility: "hidden" }}
				/>
			</noscript>
		)}
		<Head />
		<App />
		{/* Facebook Pixel Tag */}
		{tagsConfiguration.facebookPixelId && (
			<noscript>
				<img
					alt="Facebook Pixel"
					height="1"
					width="1"
					style={{ display: "none" }}
					src={`https://www.facebook.com/tr?id=${tagsConfiguration.facebookPixelId}&ev=PageView&noscript=1`}
				/>
			</noscript>
		)}
	</>,
	async () => {},
	{
		registerComponents: true,
	},
);

"use client";

import { ChatControls } from "./chat";
import { PreviewControls } from "./preview";

export const AgentNavbar = () => {
	return (
		<div className="flex items-center w-full bg-background">
			{/* Left Section */}
			<ChatControls />
			{/* Right Section */}
			<PreviewControls />
		</div>
	);
};

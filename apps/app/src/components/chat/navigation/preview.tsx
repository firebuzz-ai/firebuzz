"use client";

import { PreviewActions } from "./preview-actions";
import { PreviewHeader } from "./preview-header";
import { PreviewTabButtons } from "./preview-tabs";

export const PreviewControls = () => {
	return (
		<div className="grid grid-cols-3 items-center w-full h-full">
			{/* Left section: Tabs */}
			<div className="justify-self-start">
				<PreviewTabButtons />
			</div>

			{/* Middle section: Header (always centered) */}
			<div className="justify-self-center">
				<PreviewHeader />
			</div>

			{/* Right section: Actions */}
			<div className="justify-self-end">
				<PreviewActions />
			</div>
		</div>
	);
};

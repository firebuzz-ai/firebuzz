"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";

export const DangerZone = () => {
	return (
		<div className="p-6 w-full border-b max-h-min">
			<div className="space-y-6 max-w-xl">
				{/* Header */}
				<div>
					<h1 className="text-lg font-semibold">Danger Zone</h1>
					<p className="text-sm text-muted-foreground">
						Delete your workspace and all its data.
					</p>
				</div>

				<Button variant="destructive" size="sm" className="w-full">
					Delete Workspace
				</Button>
				<InfoBox variant="destructive">
					<p>
						Deleting your workspace will remove all your data and cannot be
						recovered.
					</p>
				</InfoBox>
			</div>
		</div>
	);
};

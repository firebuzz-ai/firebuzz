export default function WorkspaceTeamSettings() {
	return (
		<div className="flex flex-col flex-1 p-6">
			<div className="max-w-2xl">
				<h1 className="text-2xl font-semibold mb-6">Team Settings</h1>

				<div className="space-y-6">
					<div>
						<h2 className="text-lg font-medium mb-3">Team Management</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Manage team members, seats, and send invitations to your
							workspace.
						</p>

						{/* Placeholder for team management components */}
						<div className="p-4 border rounded-lg bg-muted/50">
							<p className="text-sm text-muted-foreground">
								Team seats and invitation management will be implemented here.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

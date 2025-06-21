export default function WorkspaceProjectsSettings() {
	return (
		<div className="flex flex-col flex-1 p-6">
			<div className="max-w-2xl">
				<h1 className="text-2xl font-semibold mb-6">Projects Settings</h1>

				<div className="space-y-6">
					<div>
						<h2 className="text-lg font-medium mb-3">Project Management</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Manage your workspace projects, add new projects, and delete
							existing ones.
						</p>

						{/* Placeholder for project management components */}
						<div className="p-4 border rounded-lg bg-muted/50">
							<p className="text-sm text-muted-foreground">
								Project management functionality will be implemented here.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

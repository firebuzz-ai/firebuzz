export default function SubscriptionAddOnsSettings() {
	return (
		<div className="flex flex-col flex-1 p-6">
			<div className="max-w-2xl">
				<h1 className="text-2xl font-semibold mb-6">Add-ons Settings</h1>

				<div className="space-y-6">
					<div>
						<h2 className="text-lg font-medium mb-3">Subscription Add-ons</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Purchase and manage additional features like extra credits, seats,
							and other add-ons.
						</p>

						{/* Placeholder for add-ons management components */}
						<div className="p-4 border rounded-lg bg-muted/50">
							<p className="text-sm text-muted-foreground">
								Add-ons management including extra credits and seats will be
								implemented here.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

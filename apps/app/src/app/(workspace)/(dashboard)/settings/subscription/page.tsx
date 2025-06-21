export default function SubscriptionPlanSettings() {
  return (
    <div className="flex flex-col flex-1 p-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Plan Settings</h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-3">Current Plan</h2>
            <p className="text-sm text-muted-foreground mb-4">
              View your current subscription plan and explore other available
              plans.
            </p>

            {/* Placeholder for plan management components */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Current plan details and plan options will be implemented here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

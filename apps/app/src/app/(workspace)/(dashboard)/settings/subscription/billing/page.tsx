import { BillingInformation } from "./_components/billing-information";
import { Invoices } from "./_components/invoices";
import { PaymentMethods } from "./_components/payment-methods";

export default function SubscriptionBillingSettings() {
	return (
		<div className="flex overflow-y-auto flex-col flex-1 max-h-full">
			<PaymentMethods />
			<BillingInformation />
			<Invoices />
		</div>
	);
}

import { cookies } from "next/headers";
import { BrandIdentity } from "./_components/identity";

export default async function BrandIdentityPage() {
	const id = "brand-identity";
	const cookieStore = await cookies();
	const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
	const rightPanelSize = rightPanelSizeValue
		? Number.parseInt(rightPanelSizeValue, 10)
		: 60;
	return <BrandIdentity id={id} rightPanelSize={rightPanelSize} />;
}

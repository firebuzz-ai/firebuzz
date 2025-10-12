import { cookies } from "next/headers";
import { BrandSeo } from "./_components/seo";

export default async function BrandSeoPage() {
	const id = "brand-seo";
	const cookieStore = await cookies();
	const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
	const rightPanelSize = rightPanelSizeValue
		? Number.parseInt(rightPanelSizeValue, 10)
		: 60;
	return <BrandSeo id={id} rightPanelSize={rightPanelSize} />;
}

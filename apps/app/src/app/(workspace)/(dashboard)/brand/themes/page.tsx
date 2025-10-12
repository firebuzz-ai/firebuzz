import { cookies } from "next/headers";
import { Themes } from "./_components/themes";

export default async function BrandThemesPage() {
	const id = "brand-identity";
	const cookieStore = await cookies();
	const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
	const rightPanelSize = rightPanelSizeValue
		? Number.parseInt(rightPanelSizeValue, 10)
		: 60;
	return <Themes rightPanelSize={rightPanelSize} panelId={id} />;
}

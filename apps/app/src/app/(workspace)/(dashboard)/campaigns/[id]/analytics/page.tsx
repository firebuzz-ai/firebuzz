import { cookies } from "next/headers";
import { Analytics } from "./_components/analytics";

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const cookieStore = await cookies();
	const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
	const rightPanelSize = rightPanelSizeValue
		? Number.parseInt(rightPanelSizeValue)
		: 25;
	return <Analytics id={id} rightPanelSize={rightPanelSize} />;
}

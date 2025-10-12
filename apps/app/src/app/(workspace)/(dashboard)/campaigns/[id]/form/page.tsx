import { cookies } from "next/headers";
import { FormCampaign } from "./_components/form";

export default async function FormCampaignPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const cookieStore = await cookies();
	const rightPanelSizeValue = cookieStore.get(`${id}-right-panel-size`)?.value;
	const rightPanelSize = rightPanelSizeValue
		? Number.parseInt(rightPanelSizeValue, 10)
		: 25;
	return <FormCampaign id={id} rightPanelSize={rightPanelSize} />;
}

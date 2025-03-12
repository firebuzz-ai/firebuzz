import { cookies } from "next/headers";
import { EditCampaign } from "./_components/edit";

export default async function EditCampaignPage({
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
  return <EditCampaign id={id} rightPanelSize={rightPanelSize} />;
}

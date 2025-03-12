import { CampaignTabs } from "@/components/navigation/campaign/tabs";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col flex-1">
      <CampaignTabs id={id} />
      <div className="flex flex-1"> {children}</div>
    </div>
  );
}

import { CampaignTopbar } from "@/components/navigation/campaign/topbar";

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <CampaignTopbar />
      <div className="flex overflow-hidden flex-1"> {children}</div>
    </div>
  );
}

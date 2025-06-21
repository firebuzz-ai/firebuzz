import { WorkspaceSettingsTabs } from "@/components/navigation/settings/workspace/tabs";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <WorkspaceSettingsTabs />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}

import { AccountDangerZone } from "./_components/danger-zone";
import { ProfileForm } from "./_components/form";

export default function ProfilePage() {
  return (
    <div className="flex flex-col flex-1">
      <ProfileForm />
      <AccountDangerZone />
    </div>
  );
}

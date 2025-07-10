import { DeviceSettings } from "./_components/device-settings";
import { EmailSettings } from "./_components/email-settings";
import { PasswordSettings } from "./_components/password-settings";
import { SocialConnections } from "./_components/social-connections";

export default function SecurityPage() {
	return (
		<div className="flex overflow-y-auto flex-col flex-1 max-h-full">
			<EmailSettings />
			<SocialConnections />
			<PasswordSettings />
			<DeviceSettings />
		</div>
	);
}

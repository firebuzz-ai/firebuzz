import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { CornerDownLeft } from "@firebuzz/ui/icons/lucide";

export default function ButtonsPage() {
	return (
		<div className="grid grid-cols-8 gap-4">
			<Button>
				Default{" "}
				<ButtonShortcut>
					<span>⌘</span>
					<CornerDownLeft className="!size-3" />
				</ButtonShortcut>
			</Button>
			<Button variant="brand">
				Brand{" "}
				<ButtonShortcut>
					<span>⌘</span>
					<CornerDownLeft className="!size-3" />
				</ButtonShortcut>
			</Button>
			<Button variant="outline">
				Outline{" "}
				<ButtonShortcut>
					<span>⌘</span>
					<CornerDownLeft className="!size-3" />
				</ButtonShortcut>
			</Button>
			<Button variant="secondary">
				Secondary{" "}
				<ButtonShortcut>
					<span>⌘</span>
					<CornerDownLeft className="!size-3" />
				</ButtonShortcut>
			</Button>
			<Button variant="ghost">
				Ghost{" "}
				<ButtonShortcut>
					<span>⌘</span>
					<CornerDownLeft className="!size-3" />
				</ButtonShortcut>
			</Button>
			<Button disabled>Disabled</Button>
			<Button variant="link">Link</Button>
			<Button variant="destructive">Destructive</Button>
		</div>
	);
}

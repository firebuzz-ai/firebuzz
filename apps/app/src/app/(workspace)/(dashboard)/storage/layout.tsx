import { StorageTopbar } from "@/components/navigation/storage/topbar";

export default function StorageLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<StorageTopbar />
			<div className="flex flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

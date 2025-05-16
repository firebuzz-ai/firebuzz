import { AssetsTopbar } from "@/components/navigation/assets/topbar";

export default function AssetsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col flex-1">
			<AssetsTopbar />
			<div className="flex flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

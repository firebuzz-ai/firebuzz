export default function UtilityLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="flex flex-1">{children}</div>;
}

import { Analytics } from "./_components/analytics";

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <Analytics id={id} />;
}

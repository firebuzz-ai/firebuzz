"use client";

import { CampaignTopbar } from "@/components/navigation/campaign/topbar";
import { useParams } from "next/navigation";

export default function CampaignLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { id, pageId } = useParams<{ id?: string; pageId?: string }>();

	return (
		<div className="flex flex-col flex-1">
			{id && !pageId && <CampaignTopbar />}
			<div className="flex overflow-hidden flex-1"> {children}</div>
		</div>
	);
}

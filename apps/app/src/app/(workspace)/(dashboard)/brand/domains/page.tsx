"use client";

import { DomainsTabs } from "@/components/navigation/brand/domains-tabs";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { CustomDomains } from "./_components/custom-domains";
import { ProjectDomains } from "./_components/project-domains";

export default function BrandDomainsPage() {
	const [{ tab: currentTab }, setCurrentTab] = useQueryStates({
		tab: parseAsStringLiteral(["project-domains", "custom-domains"] as const),
	});

	return (
		<div className="flex flex-col flex-1 h-full">
			<DomainsTabs
				currentTab={currentTab ?? "project-domains"}
				setCurrentTab={(tab: "project-domains" | "custom-domains") => {
					setCurrentTab({ tab });
				}}
			/>
			{currentTab === "custom-domains" && <CustomDomains />}
			{(!currentTab || currentTab === "project-domains") && <ProjectDomains />}
		</div>
	);
}

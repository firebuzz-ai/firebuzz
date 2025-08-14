"use client";

import { DomainsTabs } from "@/components/navigation/brand/domains-tabs";
import { useState } from "react";
import { Domains } from "./_components/domains";

export default function BrandDomainsPage() {
	const [currentTab, setCurrentTab] = useState<"domains">("domains");

	return (
		<div className="flex flex-col flex-1 h-full">
			<DomainsTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
			<Domains />
		</div>
	);
}

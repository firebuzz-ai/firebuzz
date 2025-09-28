"use client";
import { ArrowUp, Radio } from "@firebuzz/ui/icons/lucide";
import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";

export const HeroGridNumbers = () => {
	const [pageviews, setPageviews] = useState(1323867);
	const [conversions, setConversions] = useState(23434);
	const [ctr, setCtr] = useState(5.7);
	const [revenue, setRevenue] = useState(345678);

	useEffect(() => {
		const interval = setInterval(() => {
			setPageviews((prev) => prev + Math.floor(Math.random() * 10) + 1);
			setConversions((prev) => prev + Math.floor(Math.random() * 2));
			setCtr((prev) => Math.max(1, prev + (Math.random() - 0.5) * 0.2));
			setRevenue((prev) => prev + Math.floor(Math.random() * 100) + 50);
		}, 2000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex z-10 flex-col items-end pt-10 opacity-50">
			<div className="flex overflow-hidden flex-wrap text-xs *:flex-1 *:whitespace-nowrap sm:grid sm:grid-cols-5">
				<div className="flex items-center gap-1 px-3 py-1.5 border-l border-t border-r">
					<div className="flex gap-1 items-center">
						<ArrowUp className="text-emerald-600 size-3.5" />
						<NumberFlow value={pageviews} format={{ notation: "compact" }} />
					</div>
					<div className="text-muted-foreground">Pageviews</div>
				</div>
				<div className="flex gap-1 px-3 items-center py-1.5 border-t border-r">
					<div className="flex gap-1 items-center">
						<ArrowUp className="text-emerald-600 size-3.5" />
						<NumberFlow value={conversions} />
					</div>
					<div className="text-muted-foreground">Conversions</div>
				</div>
				<div className="flex gap-1 items-center px-3 py-1.5 border-t border-r ">
					<div className="flex gap-1 items-center">
						<ArrowUp className="text-emerald-600 size-3.5" />
						<NumberFlow
							value={ctr}
							format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
						/>
						%
					</div>
					<div className="text-muted-foreground">CTR</div>
				</div>

				<div className="flex items-center gap-1 px-3 py-1.5 border-t bg-muted">
					<div className="flex gap-1 items-center">
						<ArrowUp className="text-emerald-600 size-3.5" />
						<NumberFlow
							value={revenue}
							format={{
								style: "currency",
								currency: "USD",
								notation: "compact",
							}}
						/>
					</div>
					<div className="text-muted-foreground">Revenue</div>
				</div>
				<div className="flex items-center gap-1 px-3 py-1.5 border-l border-t text-xs text-muted-foreground bg-muted">
					<Radio className="size-3.5 text-brand" />
					Live Metrics
				</div>
			</div>
		</div>
	);
};

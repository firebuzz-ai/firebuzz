import type { Doc } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import type { LucideIcon } from "@firebuzz/ui/icons/lucide";
import {
	FacebookIcon,
	GoogleIcon,
	LinkedInIcon,
	TwitterIcon,
} from "@firebuzz/ui/icons/social";
import { cn } from "@firebuzz/ui/lib/utils";
import NumberFlow from "@number-flow/react";

interface KPICardProps {
	title: string;
	value: number;
	previousValue: number;
	icon: LucideIcon;
	changePercent?: number;
	trend?: "positive" | "negative" | "neutral";
	suffix?: string;
	prefix?: string;
	className?: string;
	formatOptions?: {
		notation?: "standard" | "compact";
		maximumFractionDigits?: number;
	};
	source: Doc<"analyticsPipes">["source"];
	isRealtime?: boolean;
}

export const KPICard = ({
	title,
	value,
	previousValue,
	icon: Icon,
	changePercent,
	trend = "neutral",
	suffix = "",
	prefix = "",
	className,
	formatOptions,
	source,
	isRealtime = false,
}: KPICardProps) => {
	const getTrendColor = () => {
		switch (trend) {
			case "positive":
				return "text-emerald-500";
			case "negative":
				return "text-yellow-500";
			default:
				return "text-muted-foreground";
		}
	};

	const getTrendIcon = () => {
		if (trend === "positive") return "↗";
		if (trend === "negative") return "↘";
		return "";
	};

	return (
		<div
			className={cn(
				"relative text-card-foreground",
				"p-4 border-r transition-all duration-200 hover:shadow-sm border-border last:border-r-0",

				className,
			)}
		>
			{/* Header */}
			<div className="flex justify-between items-center mb-3">
				<div className="flex gap-2 items-center">
					<Icon className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
				</div>
			</div>

			{/* Main Value & Change Percent */}
			<div className="flex justify-between items-center mb-4">
				<div className="text-3xl font-bold text-foreground">
					{prefix}
					<NumberFlow
						value={value}
						format={{
							notation:
								formatOptions?.notation ??
								(value >= 1000 ? "compact" : "standard"),
							maximumFractionDigits: formatOptions?.maximumFractionDigits ?? 0,
						}}
						className="tabular-nums"
					/>
					{suffix}
				</div>
				{changePercent !== undefined ? (
					<div
						className={cn(
							"flex items-center text-sm font-medium",
							getTrendColor(),
						)}
					>
						<span className="mr-1">{getTrendIcon()}</span>
						<NumberFlow
							value={Math.abs(changePercent)}
							format={{
								style: "percent",
								maximumFractionDigits: 1,
							}}
							className="tabular-nums"
						/>
					</div>
				) : (
					<div />
				)}
			</div>

			{/* Previous Value/Realtime Label and Source */}
			<div className="flex justify-between items-center">
				<div className="text-xs text-muted-foreground">
					{isRealtime ? (
						<span className="flex gap-1 items-center">
							<div className="bg-emerald-500 rounded-[2px] size-2" />
							Realtime
						</span>
					) : (
						<>
							Previously: {prefix}
							{previousValue}
							{suffix}
						</>
					)}
				</div>
				<div className="flex gap-1 items-center text-xs text-muted-foreground">
					Source:{" "}
					<div className="flex gap-1 items-center">
						<div className="flex justify-center items-center p-1 rounded-md border size-5">
							<SourceIcon source={source} />
						</div>
						<span className="capitalize text-muted-foreground">{source}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

const SourceIcon = ({
	source,
}: {
	source: Doc<"analyticsPipes">["source"];
}) => {
	switch (source) {
		case "facebook":
			return <FacebookIcon />;
		case "google":
			return <GoogleIcon />;
		case "twitter":
			return <TwitterIcon />;
		case "linkedin":
			return <LinkedInIcon />;
		case "firebuzz":
			return <Icon className="size-4" />;
		default:
			return <Icon />;
	}
};

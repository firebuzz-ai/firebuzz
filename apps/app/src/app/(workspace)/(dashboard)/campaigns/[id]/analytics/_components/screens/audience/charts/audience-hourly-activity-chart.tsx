import {
  VerticalStackedBarChart,
  type VerticalStackedBarChartData,
} from "@/components/analytics/charts/vertical-stacked-bar-chart";
import type { Doc } from "@firebuzz/convex";
import { useMemo } from "react";

interface AudienceHourlyActivityChartProps {
  audienceData?: Extract<
    Doc<"analyticsPipes">,
    { queryId: "audience-breakdown" }
  > | null;
}

const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const displayHour = hour.toString().padStart(2, "0");
  return {
    value: hour,
    label: `${displayHour}:00`,
    shortLabel: displayHour,
  };
});

export const AudienceHourlyActivityChart = ({
  audienceData,
}: AudienceHourlyActivityChartProps) => {
  const chartData = useMemo((): VerticalStackedBarChartData[] => {
    if (
      !audienceData?.payload?.hourly_distribution ||
      audienceData.payload.hourly_distribution.length === 0
    ) {
      return [];
    }

    // Initialize all hours with 0
    const hourActivity: Record<
      number,
      { newSessions: number; returningSessions: number }
    > = {};
    for (let i = 0; i < 24; i++) {
      hourActivity[i] = { newSessions: 0, returningSessions: 0 };
    }

    // Process hourly data from audience breakdown
    // Format: [hour, total_sessions, new_sessions, returning_sessions, users, percentage]
    for (const hourData of audienceData.payload.hourly_distribution) {
      if (Array.isArray(hourData) && hourData.length >= 4) {
        const [hour, , newSessions, returningSessions] = hourData;
        const hourNum = Number(hour);
        const newSessionsNum = Number(newSessions) || 0;
        const returningSessionsNum = Number(returningSessions) || 0;

        if (hourNum >= 0 && hourNum <= 23) {
          hourActivity[hourNum] = {
            newSessions: newSessionsNum,
            returningSessions: returningSessionsNum,
          };
        }
      }
    }

    // Convert to chart data format
    return HOURS_OF_DAY.map((hourInfo) => ({
      name: hourInfo.shortLabel,
      newSessions: hourActivity[hourInfo.value]?.newSessions || 0,
      returningSessions: hourActivity[hourInfo.value]?.returningSessions || 0,
    }));
  }, [audienceData]);

  return (
    <VerticalStackedBarChart
      data={chartData}
      title="Hourly Activity"
      description="Session activity by hour of day"
      dataKeys={[
        { key: "newSessions", label: "New", color: "hsl(142 71% 45%)" },
        {
          key: "returningSessions",
          label: "Returning",
          color: "hsl(var(--brand))",
        },
      ]}
      source={audienceData?.source}
      showTrend={chartData.length > 0}
      maxItems={24}
      trendFormatter={(data) => {
        if (!data || data.length === 0) return null;
        const topHour = data.reduce((max, hour) => {
          const hourTotal = hour.newSessions + hour.returningSessions;
          const maxTotal = max.newSessions + max.returningSessions;
          return hourTotal > maxTotal ? hour : max;
        });
        const total = topHour.newSessions + topHour.returningSessions;

        // Convert back to readable hour format
        const hourIndex = HOURS_OF_DAY.findIndex(
          (h) => h.shortLabel === topHour.name
        );
        const hourInfo = HOURS_OF_DAY[hourIndex];
        const readableHour = hourInfo ? hourInfo.label : topHour.name;

        return {
          text: (
            <>
              <span className="font-medium text-emerald-500">
                {readableHour}
              </span>{" "}
              had most activity
            </>
          ),
          subtitle: `${total.toLocaleString()} sessions (${topHour.newSessions.toLocaleString()} new, ${topHour.returningSessions.toLocaleString()} returning)`,
        };
      }}
    />
  );
};

import { auth } from "@clerk/nextjs/server";
import { envTinybird } from "@firebuzz/env";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
	workspaceId: z.string(),
	periodStart: z.string(),
	periodEnd: z.string(),
});

export async function GET(request: NextRequest) {
	try {
		const token = await (await auth()).getToken({ template: "convex" });

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const workspaceId = searchParams.get("workspaceId");
		const periodStart = searchParams.get("periodStart");
		const periodEnd = searchParams.get("periodEnd");

		const validatedParams = querySchema.parse({
			workspaceId,
			periodStart,
			periodEnd,
		});

		const { TINYBIRD_TOKEN, TINYBIRD_BASE_URL } = envTinybird();

		const response = await fetch(
			`${TINYBIRD_BASE_URL}/v0/pipes/daily_usage_for_workspace.json?workspaceId=${validatedParams.workspaceId}&periodStart=${validatedParams.periodStart.replace("Z", "")}&periodEnd=${validatedParams.periodEnd.replace("Z", "")}`,
			{
				headers: {
					Authorization: `Bearer ${TINYBIRD_TOKEN}`,
				},
			},
		);

		if (!response.ok) {
			console.error("Tinybird API error:", response);
			throw new Error(`Tinybird API error: ${response.status}`);
		}

		const { data } = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Daily usage API error:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid query parameters", details: error.errors },
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{ error: "Failed to fetch daily usage data" },
			{ status: 500 },
		);
	}
}

import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { envUnsplash } from "@firebuzz/env";
import type { NextRequest } from "next/server";
import { createApi } from "unsplash-js";

export const GET = async (req: NextRequest) => {
	const unsplashEnv = envUnsplash();
	const query = req.nextUrl.searchParams.get("query");
	const page = req.nextUrl.searchParams.get("page");

	const token = await (await auth()).getToken({ template: "convex" });

	if (!token) {
		return new Response("Unauthorized", { status: 401 });
	}

	const orientation = req.nextUrl.searchParams.get("orientation") as
		| "landscape"
		| "portrait"
		| "squarish";
	const orderBy = req.nextUrl.searchParams.get("orderBy") as
		| "latest"
		| "editorial"
		| "relevant";
	const client = createApi({
		accessKey: unsplashEnv.UNSPLASH_ACCESS_KEY,
	});

	const result = await client.search.getPhotos({
		query: query ?? "",
		perPage: 10,
		page: page ? Number.parseInt(page) : 1,
		orientation: orientation ?? "landscape",
		orderBy: orderBy ?? "relevant",
	});

	return NextResponse.json(result);
};

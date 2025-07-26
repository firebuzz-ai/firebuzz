"use client";

import type { Id } from "@firebuzz/convex";
import { api, useQuery, useStablePaginatedQuery } from "@firebuzz/convex";

import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { use, useMemo, useState } from "react";
import { Controls } from "./_components/controls";
import { Table } from "./_components/table";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default function FormDataPage({ params }: PageProps) {
	const { id } = use(params);
	const [selection, setSelection] = useState<Record<string, boolean>>({});
	const [submissionType, setSubmissionType] = useState<"all" | "live" | "test">(
		"all",
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const campaignId = id as Id<"campaigns">;

	// Get the form data by campaign ID
	const form = useQuery(api.collections.forms.queries.getByCampaignId, {
		campaignId,
	});

	// Get submissions with pagination
	const {
		results: submissions,
		status,
		loadMore,
	} = useStablePaginatedQuery(
		api.collections.forms.submissions.queries.getPaginatedByCampaignId,
		{
			campaignId,
			sortOrder,
			isTest: submissionType === "all" ? undefined : submissionType === "test",
		},
		{
			initialNumItems: 10,
		},
	);

	// Transform form schema for the table
	const formSchema = useMemo(() => {
		if (!form?.schema) return [];
		return form.schema.map((field) => ({
			id: field.id,
			title: field.title,
			type: field.type,
			inputType: field.inputType,
			required: field.required,
		}));
	}, [form?.schema]);

	const loadMoreHandler = async () => {
		if (status === "CanLoadMore") {
			await loadMore(10);
		}
	};

	if (!form) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="flex overflow-hidden flex-col flex-1 max-w-full max-h-full">
			<Controls
				submissionType={submissionType}
				setSubmissionType={setSubmissionType}
				sortOrder={sortOrder}
				setSortOrder={setSortOrder}
			/>

			{/* Table */}
			<div className="flex overflow-hidden flex-col flex-1 max-w-full max-h-full">
				{status === "LoadingFirstPage" ? (
					<div className="flex flex-1 justify-center items-center">
						<Spinner size="sm" />
					</div>
				) : submissions.length === 0 ? (
					<div className="flex flex-1 justify-center items-center">
						<p className="text-sm text-center text-muted-foreground">
							No form submissions found.
						</p>
					</div>
				) : (
					<Table
						data={submissions}
						selection={selection}
						setSelection={setSelection}
						loadMoreHandler={loadMoreHandler}
						formSchema={formSchema}
					/>
				)}
			</div>
		</div>
	);
}

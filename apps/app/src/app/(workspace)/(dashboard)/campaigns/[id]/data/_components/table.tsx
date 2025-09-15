import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import { ColumnHeader } from "@firebuzz/ui/components/reusable/table/column-header";
import type { ColumnDef } from "@firebuzz/ui/components/reusable/table/table";
import { DataTable } from "@firebuzz/ui/components/reusable/table/table";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Calendar, Eye, TestTube, Trash } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatToCalendarDateTime } from "@firebuzz/utils";
import type { TableMeta } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";

export type FormSubmissionTableRowData = Doc<"formSubmissions">;

interface FormField {
	id: string;
	title: string;
	type: "string" | "number" | "boolean";
	inputType: string;
	required: boolean;
}

let lastSelectedRowId: string | null = null;

interface TableProps {
	data: FormSubmissionTableRowData[];
	selection: Record<string, boolean>;
	setSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
	loadMoreHandler: () => Promise<void>;
	formSchema: FormField[];
}

export function Table({
	data,
	selection,
	setSelection,
	loadMoreHandler,
	formSchema,
}: TableProps) {
	const deleteSubmission = useMutation(
		api.collections.forms.submissions.mutations.deleteTemporary,
	);

	// Create dynamic columns based on form schema
	const columns: ColumnDef<FormSubmissionTableRowData>[] = useMemo(() => {
		const baseColumns: ColumnDef<FormSubmissionTableRowData>[] = [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Select all"
					/>
				),
				cell: ({ row, table }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={row.getToggleSelectedHandler()}
						onClick={(e) => {
							if (e.shiftKey && lastSelectedRowId) {
								const { rows } = table.getRowModel();
								const currentIndex = rows.findIndex((r) => r.id === row.id);
								const lastIndex = rows.findIndex(
									(r) => r.id === lastSelectedRowId,
								);

								const start = Math.min(currentIndex, lastIndex);
								const end = Math.max(currentIndex, lastIndex);

								const rowsToToggle = rows.slice(start, end + 1);
								const isSelected = row.getIsSelected();
								for (const r of rowsToToggle) r.toggleSelected(!isSelected);
							} else {
								row.toggleSelected(!!e);
							}
							lastSelectedRowId = row.id;
						}}
						aria-label="Select row"
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
		];

		// Add dynamic columns based on form schema
		const dynamicColumns: ColumnDef<FormSubmissionTableRowData>[] =
			formSchema.map((field) => ({
				accessorKey: `data.${field.id}`,
				enableSorting: false,
				header: ({ column }) => (
					<ColumnHeader column={column} title={field.title} />
				),
				cell: ({ row }) => {
					const value = row.original.data[field.id];

					if (value === undefined || value === null) {
						return (
							<Badge variant="outline" className="text-muted-foreground">
								—
							</Badge>
						);
					}

					// Handle different field types
					if (field.type === "boolean") {
						return (
							<Badge
								variant="outline"
								className={cn(
									"flex gap-1 items-center whitespace-nowrap max-w-fit",
									value ? "text-emerald-600" : "text-red-600",
								)}
							>
								<div
									className={cn(
										"rounded size-2",
										value ? "bg-emerald-500" : "bg-red-500",
									)}
								/>
								{value ? "Yes" : "No"}
							</Badge>
						);
					}

					// For strings and numbers, show the value
					return (
						<Badge variant="outline" className="truncate max-w-48">
							{String(value)}
						</Badge>
					);
				},
			}));

		// Add static columns
		const staticColumns: ColumnDef<FormSubmissionTableRowData>[] = [
			{
				accessorKey: "campaignEnvironment",
				enableSorting: false,
				header: ({ column }) => <ColumnHeader column={column} title="Type" />,
				cell: ({ row }) => {
					const campaignEnvironment = row.original.campaignEnvironment;
					const isPreview = campaignEnvironment === "preview";
					return (
						<Badge
							variant="outline"
							className={cn(
								"flex gap-1 items-center whitespace-nowrap max-w-fit",
								isPreview ? "text-orange-600" : "text-blue-600",
							)}
						>
							{isPreview ? (
								<TestTube className="size-3" />
							) : (
								<Eye className="size-3" />
							)}
							{isPreview ? "Test" : "Live"}
						</Badge>
					);
				},
			},
			{
				accessorKey: "_creationTime",
				enableSorting: false,
				header: ({ column }) => (
					<ColumnHeader column={column} title="Submitted At" />
				),
				cell: ({ row }) => {
					const createdAt = row.original._creationTime;
					return (
						<Badge
							className="flex gap-2 items-center whitespace-nowrap max-w-fit text-muted-foreground"
							variant="outline"
						>
							<Calendar className="size-3" />
							{formatToCalendarDateTime(createdAt)}
						</Badge>
					);
				},
			},
			{
				accessorKey: "actions",
				enableSorting: false,
				header: ({ column }) => (
					<ColumnHeader column={column} title="Actions" />
				),
				cell: (context) => {
					const deleteHandler =
						context.table.options.meta?.handleDelete ??
						(() => Promise.resolve());

					return (
						<div className="flex gap-2 items-center">
							{/* Delete */}
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										className="!h-6 !w-6 !p-1"
										onClick={async () => {
											await deleteHandler(context);
										}}
									>
										<Trash className="!size-3" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete</TooltipContent>
							</Tooltip>
						</div>
					);
				},
			},
		];

		return [...baseColumns, ...dynamicColumns, ...staticColumns];
	}, [formSchema]);

	const meta: TableMeta<FormSubmissionTableRowData> = {
		handleDelete: async (context) => {
			const submissionId = context.row.original._id;
			try {
				toast.loading("Deleting submission...", {
					id: "delete-submission",
				});
				await deleteSubmission({ id: submissionId });
				toast.success("Submission deleted successfully", {
					id: "delete-submission",
				});
			} catch (error) {
				toast.error("Failed to delete submission", {
					id: "delete-submission",
				});
				console.error(error);
			}
		},
		handleArchive: async () => {
			// Not implemented for submissions
		},
		handleRestore: async () => {
			// Not implemented for submissions
		},
	};

	return (
		<DataTable
			columns={columns}
			data={data}
			selection={selection}
			setSelection={setSelection}
			loadMoreHandler={loadMoreHandler}
			meta={meta}
		/>
	);
}

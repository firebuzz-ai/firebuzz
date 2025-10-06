import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import { ColumnHeader } from "@firebuzz/ui/components/reusable/table/column-header";
import type { ColumnDef } from "@firebuzz/ui/components/reusable/table/table";
import { DataTable } from "@firebuzz/ui/components/reusable/table/table";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  Archive,
  Calendar,
  Pencil,
  RotateCcw,
  Trash,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatToCalendarDateTime } from "@firebuzz/utils";
import type { TableMeta } from "@tanstack/react-table";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

export type LandingPageTableRowData = Pick<
  Doc<"landingPages">,
  | "_id"
  | "title"
  | "status"
  | "campaignId"
  | "_creationTime"
  | "createdBy"
  | "isArchived"
  | "isPublished"
>;

let lastSelectedRowId: string | null = null;

export const columns: ColumnDef<LandingPageTableRowData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
            const lastIndex = rows.findIndex((r) => r.id === lastSelectedRowId);

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
  {
    accessorKey: "title",
    enableSorting: false,
    header: ({ column }) => <ColumnHeader column={column} title="Title" />,
    cell: ({ row }) => {
      const title = row.original.title;
      const isArchived = row.original.isArchived;

      return (
        <Badge
          className={cn(
            "flex max-w-fit items-center gap-1 whitespace-nowrap font-bold bg-background transition-opacity duration-300 ease-in-out",
            isArchived && "opacity-70"
          )}
          variant="outline"
        >
          <div
            className={cn(
              "rounded border size-2",
              isArchived
                ? "bg-accent border-border"
                : "bg-primary/60 border-primary"
            )}
          />
          {title}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className="flex gap-2 items-center whitespace-nowrap max-w-fit text-muted-foreground"
          variant="outline"
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              status === "published" ? "bg-emerald-500" : "bg-gray-500"
            )}
          />
          {status === "published" ? "Published" : "Draft"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "_creationTime",
    enableSorting: false,
    header: ({ column }) => <ColumnHeader column={column} title="Created At" />,
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
    header: ({ column }) => <ColumnHeader column={column} title="Actions" />,
    cell: (context) => {
      const deleteHandler =
        context.table.options.meta?.handleDelete ?? (() => Promise.resolve());
      const archiveHandler =
        context.table.options.meta?.handleArchive ?? (() => Promise.resolve());
      const restoreHandler =
        context.table.options.meta?.handleRestore ?? (() => Promise.resolve());

      return (
        <div className="flex gap-2 items-center">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={`/assets/pages-v2/${context.row.original.campaignId}/${context.row.original._id}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "!h-6 !w-6 !p-1",
                })}
              >
                <Pencil className="!size-3" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
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
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                disabled={context.row.original.isArchived}
                variant="outline"
                className="!h-6 !w-6 !p-1"
                onClick={async () => {
                  await archiveHandler(context);
                }}
              >
                <Archive className="!size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                disabled={!context.row.original.isArchived}
                variant="outline"
                className="!h-6 !w-6 !p-1"
                onClick={async () => {
                  await restoreHandler(context);
                }}
              >
                <RotateCcw className="!size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restore</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];

export function Table({
  data,
  selection,
  setSelection,
  loadMoreHandler,
}: {
  data: LandingPageTableRowData[];
  selection: Record<string, boolean>;
  setSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
  loadMoreHandler: () => Promise<void>;
}) {
  const deleteLandingPage = useMutation(
    api.collections.landingPages.mutations.deleteTemporary
  );
  const archiveLandingPage = useMutation(
    api.collections.landingPages.mutations.archive
  );
  const restoreLandingPage = useMutation(
    api.collections.landingPages.mutations.restore
  );

  const meta: TableMeta<LandingPageTableRowData> = {
    handleDelete: async (context) => {
      const id = context.row.original._id;
      try {
        toast.loading("Deleting landing page...", {
          id: "delete-landing-page",
        });
        await deleteLandingPage({ id });
        toast.success("Landing page deleted successfully", {
          id: "delete-landing-page",
        });
      } catch (error) {
        toast.error("Failed to delete landing page", {
          id: "delete-landing-page",
        });
        console.error(error);
      }
    },
    handleArchive: async (context) => {
      const id = context.row.original._id;
      try {
        toast.loading("Archiving landing page...", {
          id: "archive-landing-page",
        });
        await archiveLandingPage({ id });
        toast.success("Landing page archived successfully", {
          id: "archive-landing-page",
        });
      } catch (error) {
        toast.error("Failed to archive landing page", {
          id: "archive-landing-page",
        });
        console.error(error);
      }
    },
    handleRestore: async (context) => {
      const id = context.row.original._id;
      try {
        toast.loading("Restoring landing page...", {
          id: "restore-landing-page",
        });
        await restoreLandingPage({ id });
        toast.success("Landing page restored successfully", {
          id: "restore-landing-page",
        });
      } catch (error) {
        toast.error("Failed to restore landing page", {
          id: "restore-landing-page",
        });
        console.error(error);
      }
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

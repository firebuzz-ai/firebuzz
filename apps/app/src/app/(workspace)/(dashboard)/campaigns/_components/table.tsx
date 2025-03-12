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
import {
  capitalizeFirstLetter,
  formatToCalendarDateTime,
} from "@firebuzz/utils";
import type { TableMeta } from "@tanstack/react-table";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

export type FileTableRowData = Pick<
  Doc<"campaigns">,
  | "_id"
  | "title"
  | "status"
  | "type"
  | "_creationTime"
  | "createdBy"
  | "isArchived"
>;

let lastSelectedRowId: string | null = null;

export const columns: ColumnDef<FileTableRowData>[] = [
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
    header: ({ column }) => <ColumnHeader column={column} title="Document" />,
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
              "size-2 rounded border",
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
    header: ({ column }) => <ColumnHeader column={column} title="Published" />,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className="flex max-w-fit items-center gap-2 whitespace-nowrap text-muted-foreground"
          variant="outline"
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              status === "published"
                ? "bg-emerald-500"
                : status === "cancelled"
                  ? "bg-red-500"
                  : "bg-gray-500"
            )}
          />
          {capitalizeFirstLetter(status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "type",
    enableSorting: false,
    header: ({ column }) => <ColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge
          className="flex max-w-fit items-center gap-2 whitespace-nowrap text-muted-foreground"
          variant="outline"
        >
          {type.toUpperCase()}
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
          className="flex max-w-fit items-center gap-2 whitespace-nowrap text-muted-foreground"
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
        <div className="flex items-center gap-2">
          {/* EDit */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={`/campaigns/${context.row.original._id}/edit`}
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
          {/* Archive */}
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
          {/* Restore */}
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
  data: FileTableRowData[];
  selection: Record<string, boolean>;
  setSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
  loadMoreHandler: () => Promise<void>;
}) {
  const deleteFile = useMutation(
    api.collections.campaigns.mutations.deleteCampaign
  );
  const archiveFile = useMutation(
    api.collections.campaigns.mutations.archiveCampaign
  );
  const restoreFile = useMutation(
    api.collections.campaigns.mutations.restoreCampaign
  );

  const meta: TableMeta<FileTableRowData> = {
    handleDelete: async (context) => {
      const fileId = context.row.original._id;
      try {
        toast.loading("Deleting file...", {
          id: "delete-file",
        });
        await deleteFile({ id: fileId });
        toast.success("File deleted successfully", {
          id: "delete-file",
        });
      } catch (error) {
        toast.error("Failed to delete file", {
          id: "delete-file",
        });
        console.error(error);
      }
    },
    handleArchive: async (context) => {
      const fileId = context.row.original._id;
      try {
        toast.loading("Archiving file...", {
          id: "archive-file",
        });
        await archiveFile({ id: fileId });
        toast.success("File archived successfully", {
          id: "archive-file",
        });
      } catch (error) {
        toast.error("Failed to archive file", {
          id: "archive-file",
        });
        console.error(error);
      }
    },
    handleRestore: async (context) => {
      const fileId = context.row.original._id;
      try {
        toast.loading("Restoring file...", {
          id: "restore-file",
        });
        await restoreFile({ id: fileId });
        toast.success("File restored successfully", {
          id: "restore-file",
        });
      } catch (error) {
        toast.error("Failed to restore file", {
          id: "restore-file",
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

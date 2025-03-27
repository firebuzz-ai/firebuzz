import type { CellContext, RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
	interface TableMeta<TData extends RowData> {
		handleDelete: (context: CellContext<TData, unknown>) => Promise<void>;
		handleArchive: (context: CellContext<TData, unknown>) => Promise<void>;
		handleRestore: (context: CellContext<TData, unknown>) => Promise<void>;
	}
}

"use client";

import { ScrollArea, ScrollBar } from "@firebuzz/ui/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@firebuzz/ui/components/ui/table";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type Row,
	type TableMeta,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	meta: TableMeta<TData>;
	selection: Record<string, boolean>;
	setSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
	loadMoreHandler: () => Promise<void>;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	selection,
	setSelection,
	loadMoreHandler,
	meta,
}: DataTableProps<TData, TValue>) {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const loaderRef = useRef<HTMLTableRowElement>(null);
	const [showGradient, setShowGradient] = useState(true);
	const table = useReactTable({
		data,
		columns,
		//@ts-expect-error
		getRowId: (row) => row._id,
		getCoreRowModel: getCoreRowModel(),
		onRowSelectionChange: setSelection,
		state: {
			rowSelection: selection,
		},
		meta,
	});

	const rows = table.getRowModel().rows;

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
		getScrollElement: () => tableContainerRef.current,
		//measure dynamic row height, except in firefox because it measures table border height incorrectly
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	// Add intersection observer for infinite loading
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMoreHandler();
				}
			},
			{ threshold: 0.1 },
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}

		return () => observer.disconnect();
	}, [loadMoreHandler]);

	// Check if the table is at the bottom
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				setShowGradient(!entries[0]?.isIntersecting);
			},
			{ threshold: 0.1 },
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}
	}, []);

	return (
		<div className="relative grid flex-1 overflow-hidden">
			{/* Bottom Gradient - conditionally shown */}
			{showGradient && (
				<div className="absolute bottom-0 left-0 pointer-events-none select-none touch-none right-0 h-8 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />
			)}
			<ScrollArea ref={tableContainerRef}>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{rowVirtualizer.getVirtualItems().length > 0 ? (
							rowVirtualizer.getVirtualItems().map((virtualRow) => {
								const row = rows[virtualRow.index] as Row<TData>;

								return (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => {
											return (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											);
										})}
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
						<TableRow ref={loaderRef}>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center sr-only"
							>
								Loading...
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
				<ScrollBar className="relative z-20" orientation="horizontal" />
				<ScrollBar className="relative z-20" orientation="vertical" />
			</ScrollArea>
		</div>
	);
}

export type { ColumnDef };

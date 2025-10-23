"use client";

import type { ToolSet } from "@firebuzz/convex";
import { CheckSquare, Square, XSquare } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface TodoListProps {
	part: UIToolInvocation<ToolSet["updateTodoList"]>;
}

export const TodoList = ({ part }: TodoListProps) => {
	const status = useMemo(() => {
		if (part.state === "input-available" || part.state === "input-streaming") {
			return "loading";
		}

		if (part.state === "output-available") {
			return "success";
		}

		return "error";
	}, [part.state]);

	const message = useMemo(() => {
		if (part?.output?.success && part?.output?.todos) {
			const todos = part.output.todos;

			if (todos.length === 0) {
				return (
					<span className="text-xs text-muted-foreground">
						No todos in list
					</span>
				);
			}

			return (
				<div className="flex flex-col gap-1.5 w-full">
					{todos.map((todo) => {
						const getIcon = () => {
							switch (todo.status) {
								case "completed":
									return (
										<CheckSquare className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
									);
								case "in-progress":
									return (
										<Square className="flex-shrink-0 w-4 h-4 text-brand" />
									);
								case "failed":
								case "cancelled":
									return (
										<XSquare className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
									);
								default:
									return (
										<Square className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
									);
							}
						};

						const isCompleted = todo.status === "completed";
						const isFailed =
							todo.status === "failed" || todo.status === "cancelled";

						return (
							<div
								key={todo.id}
								className={cn(
									"flex gap-2 items-center p-2 rounded-md border bg-muted",
									{
										"opacity-50": isCompleted || isFailed,
									},
								)}
							>
								{getIcon()}
								<span
									className={cn("text-sm", {
										"line-through": isCompleted || isFailed,
									})}
								>
									{todo.title}
								</span>
							</div>
						);
					})}
				</div>
			);
		}

		if (part?.output?.error) {
			return (
				<span className="text-xs text-destructive">
					{part.output.error.message}
				</span>
			);
		}

		return (
			<span className="text-xs text-muted-foreground">
				Updating todo list...
			</span>
		);
	}, [part]);

	const completedCount = useMemo(() => {
		if (!part?.output?.todos) return 0;
		return part.output.todos.filter((t) => t.status === "completed").length;
	}, [part?.output?.todos]);

	const totalCount = part?.output?.todos?.length || 0;

	return (
		<ToolPart
			status={status}
			toolName={
				status === "success"
					? `Update Todo List ${completedCount}/${totalCount}`
					: "Update Todo List"
			}
			className="flex-col items-start"
		>
			{message}
		</ToolPart>
	);
};

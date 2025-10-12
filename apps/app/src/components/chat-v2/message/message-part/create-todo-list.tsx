"use client";

import type { ToolSet } from "@firebuzz/convex";
import { Square } from "@firebuzz/ui/icons/lucide";
import type { UIToolInvocation } from "ai";
import { useMemo } from "react";
import { ToolPart } from "./tool-part";

interface CreateTodoListProps {
	part: UIToolInvocation<ToolSet["createTodoList"]>;
}

export const CreateTodoList = ({ part }: CreateTodoListProps) => {
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
					{todos.map((todo) => (
						<div
							key={todo.id}
							className="flex gap-2 items-center p-2 rounded-md border bg-muted"
						>
							<Square className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
							<span className="text-sm">{todo.title}</span>
						</div>
					))}
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
				Creating todo list...
			</span>
		);
	}, [part]);

	return (
		<ToolPart
			status={status}
			toolName={
				status === "success"
					? `Create Todo List 0/${part.output?.todos?.length}`
					: "Create Todo List"
			}
			className="flex-col items-start"
		>
			{message}
		</ToolPart>
	);
};

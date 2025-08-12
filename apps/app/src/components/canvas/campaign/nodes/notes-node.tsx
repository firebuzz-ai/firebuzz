import { useUser } from "@/hooks/auth/use-user";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { BaseNode as BaseNodeComponent } from "@firebuzz/ui/components/ui/base-node";
import { ArrowDownRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { NodeProps } from "@xyflow/react";
import { NodeResizeControl, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { CampaignNodeIcons } from "./campaign/icons";
import type { NoteNode as NoteNodeType } from "./campaign/types";

export const NoteNode = memo(
	({ id, selected, data }: NodeProps<NoteNodeType>) => {
		const { content, author } = data;
		const [note, setNote] = useState(content);
		const { updateNodeData } = useReactFlow();
		const { user } = useUser();

		const handleSave = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			updateNodeData(id, {
				content: e.target.value,
				author: user?.fullName ?? data.author,
			});
		};

		return (
			<BaseNodeComponent
				className={cn(
					"h-full flex flex-col opacity-50 relative rounded-tl-none",
					selected && "opacity-100",
				)}
				selected={selected}
			>
				{/* Badge */}
				<div className="absolute -top-[22px] -left-[1px] z-10">
					<Badge
						className={cn(
							"flex gap-1 items-center px-3 rounded-b-none border-b-0 transition-all duration-0",
							selected
								? "hover:bg-brand/90 bg-brand/90 text-brand-foreground border-brand"
								: "bg-muted hover:bg-muted text-muted-foreground border-border",
						)}
					>
						{CampaignNodeIcons["traffic-badge"]}
						Note
					</Badge>
				</div>

				{/* Content */}
				<textarea
					value={note}
					placeholder="Write your note here..."
					onChange={(e) => setNote(e.target.value)}
					onBlur={handleSave}
					className="p-2 w-full h-full bg-transparent resize-none focus:outline-none"
				/>

				{/* Footer */}
				<div className="flex relative justify-between items-center p-2 border-t">
					{/* Author */}
					<div className="text-sm text-muted-foreground">{author}</div>

					{/* Resize */}
					<NodeResizeControl
						nodeId={id}
						minWidth={300}
						minHeight={150}
						maxWidth={500}
						maxHeight={300}
						style={{
							backgroundColor: "transparent",
							border: "none",
						}}
					>
						<ArrowDownRight className="absolute right-3 bottom-3 size-3 text-primary" />
					</NodeResizeControl>
				</div>
			</BaseNodeComponent>
		);
	},
);

NoteNode.displayName = "NoteNode";

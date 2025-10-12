"use client";

import type { Id } from "@firebuzz/convex/nextjs";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@firebuzz/ui/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@firebuzz/ui/components/ui/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	AnthropicIcon,
	GeminiIcon,
	OpenAIIcon,
	XaiIcon,
	ZaiIcon,
} from "@firebuzz/ui/icons/ai-providers";
import {
	IconArrowUp,
	IconAt,
	IconBook,
	IconPaperclip,
	IconPlayerPause,
	IconX,
} from "@firebuzz/ui/icons/tabler";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useLandingChat } from "@/hooks/agent/use-landing-chat";

const SAMPLE_DATA = {
	mentionable: [
		{
			type: "page",
			title: "Landing Page 1",
			image: "=�",
		},
		{
			type: "page",
			title: "Campaign Dashboard",
			image: "=�",
		},
		{
			type: "page",
			title: "Form Builder",
			image: "=�",
		},
		{
			type: "page",
			title: "Analytics",
			image: "=�",
		},
		{
			type: "user",
			title: "John Doe",
			image: "https://github.com/shadcn.png",
			workspace: "Workspace",
		},
	],
};

const MODEL_CONFIG = {
	"claude-sonnet-4.5": {
		name: "Claude Sonnet 4.5",
		provider: "Anthropic",
		icon: AnthropicIcon,
	},
	"gpt-5": {
		name: "GPT-5",
		provider: "OpenAI",
		icon: OpenAIIcon,
	},
	"gpt-5-mini": {
		name: "GPT-5 Mini",
		provider: "OpenAI",
		icon: OpenAIIcon,
	},
	"gemini-2.5-pro": {
		name: "Gemini 2.5 Pro",
		provider: "Google",
		icon: GeminiIcon,
	},
	"z-ai/glm-4.6": {
		name: "GLM 4.6",
		provider: "Z.ai",
		icon: ZaiIcon,
	},
	"google/gemini-2.5-flash": {
		name: "Gemini 2.5 Flash",
		provider: "Google",
		icon: GeminiIcon,
	},
	"x-ai/grok-code-fast-1": {
		name: "Grok Code Fast 1",
		provider: "X.ai",
		icon: XaiIcon,
	},
	"x-ai/grok-4-fast": {
		name: "Grok 4 Fast",
		provider: "X.ai",
		icon: XaiIcon,
	},
} as const;

function MentionableIcon({
	item,
}: {
	item: (typeof SAMPLE_DATA.mentionable)[0];
}) {
	return item.type === "page" ? (
		<span className="flex justify-center items-center size-4">
			{item.image}
		</span>
	) : (
		<Avatar className="size-4">
			<AvatarImage src={item.image} />
			<AvatarFallback>{item.title[0]}</AvatarFallback>
		</Avatar>
	);
}

interface ChatInputProps {
	landingPageId: Id<"landingPages">;
}

export const ChatInput = ({ landingPageId }: ChatInputProps) => {
	const {
		sendMessage,
		chatStatus,
		abortStream,
		availableKnowledgeBases,
		selectedKnowledgeBases,
		updateKnowledgeBases,
		model,
		updateModelMutation,
	} = useLandingChat({ landingPageId });

	const { session } = useAgentSession();

	const [inputValue, setInputValue] = useState("");
	const [mentions, setMentions] = useState<string[]>([]);
	const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
	const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
	const [scopeMenuOpen, setScopeMenuOpen] = useState(false);

	const selectedModelConfig = model
		? MODEL_CONFIG[model]
		: MODEL_CONFIG["claude-sonnet-4.5"];
	const isDisabled = chatStatus !== "ready" && chatStatus !== "error";
	const isStreaming = chatStatus === "streaming";

	const grouped = useMemo(() => {
		return SAMPLE_DATA.mentionable.reduce(
			(acc, item) => {
				const isAvailable = !mentions.includes(item.title);

				if (isAvailable) {
					if (!acc[item.type]) {
						acc[item.type] = [];
					}
					acc[item.type].push(item);
				}
				return acc;
			},
			{} as Record<string, typeof SAMPLE_DATA.mentionable>,
		);
	}, [mentions]);

	const hasMentions = mentions.length > 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputValue.trim() || isDisabled) return;

		await sendMessage(inputValue);
		setInputValue("");
	};

	const handleAbort = async () => {
		await abortStream();
	};

	const systemKnowledgeBase = availableKnowledgeBases?.find(
		(kb) => kb.isSystem,
	);
	const nonSystemKnowledgeBases =
		availableKnowledgeBases?.filter((kb) => !kb.isSystem) || [];

	const handleKnowledgeBaseToggle = async (
		kbId: Id<"knowledgeBases">,
		checked: boolean,
	) => {
		if (!session?._id) return;

		const currentIds = selectedKnowledgeBases
			?.map((kb) => kb?._id)
			.filter(Boolean) as Id<"knowledgeBases">[];
		const newKnowledgeBases = checked
			? [...currentIds, kbId]
			: currentIds.filter((id) => id !== kbId);

		await updateKnowledgeBases({
			sessionId: session._id,
			knowledgeBases: newKnowledgeBases,
		});
	};

	const handleModelChange = async (modelKey: keyof typeof MODEL_CONFIG) => {
		if (!session?._id) return;

		await updateModelMutation({
			sessionId: session._id,
			model: modelKey,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="">
			<Field>
				<FieldLabel htmlFor="chat-prompt" className="sr-only">
					Prompt
				</FieldLabel>
				<InputGroup>
					<InputGroupTextarea
						id="chat-prompt"
						placeholder="Ask me anything..."
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						disabled={isDisabled}
					/>
					<InputGroupAddon align="block-start">
						<Popover
							open={mentionPopoverOpen}
							onOpenChange={setMentionPopoverOpen}
						>
							<Tooltip>
								<TooltipTrigger
									asChild
									onFocusCapture={(e) => e.stopPropagation()}
								>
									<PopoverTrigger asChild>
										<InputGroupButton
											variant="outline"
											size={!hasMentions ? "sm" : "icon-sm"}
											className="rounded-full transition-transform"
										>
											<IconAt /> {!hasMentions && "Add context"}
										</InputGroupButton>
									</PopoverTrigger>
								</TooltipTrigger>
								<TooltipContent>Mention a page or person</TooltipContent>
							</Tooltip>
							<PopoverContent className="p-0 [--radius:1.2rem]" align="start">
								<Command>
									<CommandInput placeholder="Search..." />
									<CommandList>
										<CommandEmpty>No results found</CommandEmpty>
										{Object.entries(grouped).map(([type, items]) => (
											<CommandGroup
												key={type}
												heading={type === "page" ? "Pages" : "Users"}
											>
												{items.map((item) => (
													<CommandItem
														key={item.title}
														value={item.title}
														onSelect={(currentValue) => {
															setMentions((prev) => [...prev, currentValue]);
															setMentionPopoverOpen(false);
														}}
													>
														<MentionableIcon item={item} />
														{item.title}
													</CommandItem>
												))}
											</CommandGroup>
										))}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<div className="no-scrollbar -m-1.5 flex gap-1 overflow-y-auto p-1.5">
							{mentions.map((mention) => {
								const item = SAMPLE_DATA.mentionable.find(
									(item) => item.title === mention,
								);

								if (!item) {
									return null;
								}

								return (
									<InputGroupButton
										key={mention}
										size="sm"
										variant="secondary"
										className="rounded-full !pl-2"
										onClick={() => {
											setMentions((prev) => prev.filter((m) => m !== mention));
										}}
									>
										<MentionableIcon item={item} />
										{item.title}
										<IconX />
									</InputGroupButton>
								);
							})}
						</div>
					</InputGroupAddon>
					<InputGroupAddon align="block-end" className="gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<InputGroupButton
									size="icon-sm"
									className="rounded-full"
									aria-label="Attach file"
								>
									<IconPaperclip />
								</InputGroupButton>
							</TooltipTrigger>
							<TooltipContent>Attach file</TooltipContent>
						</Tooltip>
						<DropdownMenu
							open={modelPopoverOpen}
							onOpenChange={setModelPopoverOpen}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<InputGroupButton
											size="sm"
											className="rounded-full gap-1.5"
										>
											<span className="size-3.5">
												{<selectedModelConfig.icon />}
											</span>
											{selectedModelConfig.name}
										</InputGroupButton>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Select AI model</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								side="top"
								align="start"
								className="[--radius:1rem]"
							>
								<DropdownMenuGroup className="w-48">
									<DropdownMenuLabel className="text-xs text-muted-foreground">
										Select AI Model
									</DropdownMenuLabel>
									{Object.entries(MODEL_CONFIG).map(([key, modelData]) => {
										const ModelIcon = modelData.icon;
										const isSelected = model === key;
										return (
											<DropdownMenuCheckboxItem
												key={key}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														handleModelChange(key as keyof typeof MODEL_CONFIG);
													}
												}}
												className={cn(
													"gap-2 pl-2",
													isSelected && "first:*:hidden",
													!isSelected && "opacity-50",
												)}
											>
												<div className="p-1 rounded-sm border bg-muted">
													<div className="size-4">
														<ModelIcon />
													</div>
												</div>

												<div className="flex flex-col">
													<span className="text-sm font-medium">
														{modelData.name}
													</span>
													<span className="text-xs text-muted-foreground">
														{modelData.provider}
													</span>
												</div>
											</DropdownMenuCheckboxItem>
										);
									})}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						<DropdownMenu open={scopeMenuOpen} onOpenChange={setScopeMenuOpen}>
							<DropdownMenuTrigger asChild>
								<InputGroupButton size="sm" className="rounded-full">
									<IconBook /> Knowledge Bases
								</InputGroupButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								align="end"
								className="[--radius:1rem]"
							>
								<DropdownMenuGroup>
									<DropdownMenuLabel className="text-xs text-muted-foreground">
										Knowledge Bases
									</DropdownMenuLabel>
									{systemKnowledgeBase && (
										<DropdownMenuItem
											asChild
											onSelect={(e) => e.preventDefault()}
										>
											<label htmlFor={`kb-${systemKnowledgeBase._id}`}>
												<IconBook /> {systemKnowledgeBase.name} (System)
												<Switch
													id={`kb-${systemKnowledgeBase._id}`}
													className="ml-auto"
													checked
													disabled
												/>
											</label>
										</DropdownMenuItem>
									)}
									{nonSystemKnowledgeBases.map((kb) => {
										const isSelected = selectedKnowledgeBases?.some(
											(selected) => selected?._id === kb._id,
										);
										return (
											<DropdownMenuItem
												key={kb._id}
												asChild
												onSelect={(e) => e.preventDefault()}
											>
												<label htmlFor={`kb-${kb._id}`}>
													<IconBook /> {kb.name}
													<Switch
														id={`kb-${kb._id}`}
														className="ml-auto"
														checked={isSelected}
														onCheckedChange={(checked) =>
															handleKnowledgeBaseToggle(kb._id, checked)
														}
													/>
												</label>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						{isStreaming ? (
							<InputGroupButton
								type="button"
								aria-label="Pause"
								className="ml-auto rounded-full"
								variant="brand"
								size="icon-sm"
								onClick={handleAbort}
							>
								<IconPlayerPause />
							</InputGroupButton>
						) : (
							<InputGroupButton
								type="submit"
								aria-label="Send"
								className="ml-auto rounded-full"
								variant="brand"
								size="icon-sm"
								disabled={isDisabled || !inputValue.trim()}
							>
								<IconArrowUp />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</Field>
		</form>
	);
};

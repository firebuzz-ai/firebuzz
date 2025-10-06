"use client";

import {
  IconApps,
  IconArrowUp,
  IconAt,
  IconBook,
  IconCircleDashedPlus,
  IconPaperclip,
  IconPlus,
  IconWorld,
  IconX,
} from "@firebuzz/ui/icons/tabler";
import { useMemo, useState } from "react";

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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  ZaiIcon,
} from "@firebuzz/ui/icons/ai-providers";
import { cn } from "@firebuzz/ui/lib/utils";

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
  models: [
    {
      name: "Claude Sonnet 4.5",
      provider: "Anthropic",
      icon: AnthropicIcon,
    },
    {
      name: "GPT-5",
      provider: "OpenAI",
      icon: OpenAIIcon,
    },
    {
      name: "GLM 4.6",
      provider: "Z.ai",
      icon: ZaiIcon,
    },
    {
      name: "Gemini Pro 3.0",
      provider: "Google",
      icon: GeminiIcon,
    },
  ],
};

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

export const ChatInput = () => {
  const [mentions, setMentions] = useState<string[]>([]);
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<
    (typeof SAMPLE_DATA.models)[0]
  >(SAMPLE_DATA.models[0]);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);

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
      {} as Record<string, typeof SAMPLE_DATA.mentionable>
    );
  }, [mentions]);

  const hasMentions = mentions.length > 0;

  return (
    <form className="[--radius:1.2rem]">
      <Field>
        <FieldLabel htmlFor="chat-prompt" className="sr-only">
          Prompt
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id="chat-prompt"
            placeholder="Ask me anything..."
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
                  (item) => item.title === mention
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
                      <span className="size-3.5">{<selectedModel.icon />}</span>
                      {selectedModel.name}
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
                  {SAMPLE_DATA.models.map((model) => {
                    const ModelIcon = model.icon;
                    const isSelected = model.name === selectedModel.name;
                    return (
                      <DropdownMenuCheckboxItem
                        key={model.name}
                        checked={model.name === selectedModel.name}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedModel(model);
                          }
                        }}
                        className={cn(
                          "gap-2 pl-2",
                          isSelected && "first:*:hidden",
                          !isSelected && "opacity-50"
                        )}
                      >
                        <div className="p-1 rounded-sm border bg-muted">
                          <div className="size-4">
                            <ModelIcon />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {model.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {model.provider}
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
                  <IconWorld /> All Sources
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="[--radius:1rem]"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label htmlFor="web-search">
                      <IconWorld /> Web Search{" "}
                      <Switch
                        id="web-search"
                        className="ml-auto"
                        defaultChecked
                      />
                    </label>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label htmlFor="apps">
                      <IconApps /> Apps and Integrations
                      <Switch id="apps" className="ml-auto" defaultChecked />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconCircleDashedPlus /> All Sources I can access
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Avatar className="size-4">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      shadcn
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72 p-0 [--radius:1rem]">
                      <Command>
                        <CommandInput
                          placeholder="Find or use knowledge in..."
                          autoFocus
                        />
                        <CommandList>
                          <CommandEmpty>No knowledge found</CommandEmpty>
                          <CommandGroup>
                            {SAMPLE_DATA.mentionable
                              .filter((item) => item.type === "user")
                              .map((user) => (
                                <CommandItem
                                  key={user.title}
                                  value={user.title}
                                  onSelect={() => {
                                    console.log("Selected user:", user.title);
                                  }}
                                >
                                  <Avatar className="size-4">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback>
                                      {user.title[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.title}{" "}
                                  <span className="text-muted-foreground">
                                    - {user.workspace}
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <IconBook /> Help Center
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <IconPlus /> Connect Apps
                  </DropdownMenuItem>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    We'll only search in the sources selected here.
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupButton
              aria-label="Send"
              className="ml-auto rounded-full"
              variant="brand"
              size="icon-sm"
            >
              <IconArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  );
};

"use client";

import { getAllLocales } from "@firebuzz/utils";
import { Check, ChevronsUpDown, Languages } from "lucide-react";
import * as React from "react";

import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@firebuzz/ui/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import { cn } from "@firebuzz/ui/lib/utils";

interface LocaleSelectorProps {
	defaultValue?: string;
	onLocaleChange?: (locale: string) => void;
	className?: string;
}

export const LocaleSelector = ({
	defaultValue = "",
	onLocaleChange,
	className,
}: LocaleSelectorProps) => {
	const [open, setOpen] = React.useState(false);
	const [value, setValue] = React.useState(defaultValue);

	const locales = getAllLocales();

	const handleSelect = (currentValue: string) => {
		const newValue = currentValue === value ? "" : currentValue;
		setValue(newValue);
		setOpen(false);
		onLocaleChange?.(newValue);
	};

	const selectedLocale = locales.find((locale) => locale.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: <explanation>
					role="combobox"
					aria-expanded={open}
					className={cn(
						"w-full flex items-center justify-start gap-2",
						className,
					)}
				>
					<Languages className="h-3.5 w-3.5" />
					<div className="flex-1 text-left">
						{selectedLocale ? (
							<span className="flex items-center gap-2">
								<span className="font-medium">{selectedLocale.label1}</span>
								<span className="text-xs text-muted-foreground">
									{selectedLocale.label2}
								</span>
							</span>
						) : (
							<span className="text-muted-foreground">Select locale</span>
						)}
					</div>
					<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command>
					<CommandInput placeholder="Search locale..." />
					<CommandList>
						<CommandEmpty>No locale found.</CommandEmpty>
						<CommandGroup>
							{locales.map((locale) => (
								<CommandItem
									key={locale.value}
									value={locale.value}
									onSelect={handleSelect}
									keywords={locale.keywords}
									className="flex flex-col items-start"
								>
									<div className="flex items-center w-full">
										<Check
											className={cn(
												"mr-2 h-3.5 w-3.5",
												value === locale.value ? "opacity-100" : "opacity-0",
											)}
										/>
										<div className="flex flex-col">
											<span className="font-medium">{locale.label1}</span>
											<span className="text-xs text-muted-foreground">
												{locale.label2}
											</span>
										</div>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

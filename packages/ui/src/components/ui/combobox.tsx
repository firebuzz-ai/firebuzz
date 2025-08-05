"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ComboboxProps {
	values: { value: string; label: string }[];
	value: string;
	setValue: React.Dispatch<React.SetStateAction<string>>;
	placeholder?: string;
}

export function Combobox({
	values,
	value,
	setValue,
	placeholder = "Select...",
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: <explanation>
					role="combobox"
					aria-expanded={open}
					className="w-[200px] justify-between"
				>
					{value ? values.find((v) => v.value === value)?.label : "Select..."}
					<ChevronsUpDownIcon className="ml-2 w-4 h-4 opacity-50 shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder={placeholder} />
					<CommandList>
						<CommandEmpty>No framework found.</CommandEmpty>
						<CommandGroup>
							{values.map((valueItem) => (
								<CommandItem
									key={valueItem.value}
									value={valueItem.value}
									onSelect={(currentValue) => {
										setValue(
											currentValue === valueItem.value ? "" : currentValue,
										);
										setOpen(false);
									}}
								>
									<CheckIcon
										className={cn(
											"mr-2 h-4 w-4",
											valueItem.value === value ? "opacity-100" : "opacity-0",
										)}
									/>
									{valueItem.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

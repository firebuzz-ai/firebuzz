#!/usr/bin/env node

import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { packCommand } from "./commands/pack.js";

const program = new Command();

program
	.name("template-cli")
	.description("CLI tool for managing Firebuzz templates")
	.version("0.1.0");

program
	.command("create")
	.description("Create a new template from the base template")
	.action(async () => {
		await createCommand();
	});

program
	.command("pack")
	.description("Build, pack, and publish a template to KV and R2")
	.action(async () => {
		await packCommand();
	});

program.parse();

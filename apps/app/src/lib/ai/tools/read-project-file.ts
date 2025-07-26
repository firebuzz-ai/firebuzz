import { stripIndents } from "@firebuzz/utils";
import { tool } from "ai";
import { z } from "zod";

export const readProjectFile = tool({
  description: stripIndents`
    Read a specific file from the project.
    You must provide the path of the file to read.
    Returns the file content or an error message if the file cannot be read.
  `,
  parameters: z.object({
    path: z.string().describe("The full path to the file within the project."),
  }),
});

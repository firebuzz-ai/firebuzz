"use node";

import type { Document } from "@llamaindex/core/schema";
import { CSVReader } from "@llamaindex/readers/csv";
import { DocxReader } from "@llamaindex/readers/docx";
import { HTMLReader } from "@llamaindex/readers/html";
import { MarkdownReader } from "@llamaindex/readers/markdown";
import { PDFReader } from "@llamaindex/readers/pdf";
import { TextFileReader } from "@llamaindex/readers/text";

export {
  CSVReader,
  DocxReader,
  HTMLReader,
  MarkdownReader,
  PDFReader,
  TextFileReader,
  type Document,
};

import {
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  formatDistance,
  isToday,
} from "date-fns";
import { countriesAndLanguages } from "./contants";

export const camelCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/(?:^\w|[A-Z\s]\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

export const capitalizeFirstLetter = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const capitalizeFirstLetterOfEachWord = (str: string) => {
  return str.split(" ").map(capitalizeFirstLetter).join(" ");
};

export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s_-]/g, "") // Already allows hyphens in input
    .replace(/([a-z])([0-9])/g, "$1-$2")
    .replace(/([0-9])([a-z])/g, "$1-$2")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-") // Only collapse multiple consecutive hyphens
    .replace(/^-+|-+$/g, "");
};

export const stripIndents = (
  arg0: string | TemplateStringsArray,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ...values: any[]
) => {
  function _stripIndents(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trimStart()
      .replace(/[\r\n]$/, "");
  }

  if (typeof arg0 !== "string") {
    const processedString = arg0
      .map((curr, i) => curr + (values[i] ?? ""))
      .join("");
    return _stripIndents(processedString);
  }

  return _stripIndents(arg0);
};

// Date Operations
export const formatToCalendarDate = (date: Date | string | number) => {
  return format(date, "yyyy-MM-dd");
};

export const formatToCalendarDateTime = (date: Date | string | number) => {
  return format(date, "yyyy-MM-dd HH:mm");
};

export const formatToCalendarDateTimeWithSeconds = (
  date: Date | string | number
) => {
  return format(date, "yyyy-MM-dd HH:mm:ss");
};

export const formatToInboxTime = (date: Date | string | number) => {
  // Check if the date is today
  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  // Otherwise, format the date to "Mar 15"
  return format(date, "MMM d");
};

export const formatRelativeTimeShort = (date: Date | string | number) => {
  return formatDistance(date, new Date(), { includeSeconds: true });
};

export const calculateDurationInMinutes = (start: Date, end: Date) => {
  return differenceInMinutes(end, start);
};

export const calculateDurationInHours = (start: Date, end: Date) => {
  return differenceInHours(end, start);
};

export const calculateDurationInSeconds = (start: Date, end: Date) => {
  return differenceInSeconds(end, start);
};

// Number Operations
export const formatNumber = (num: number) => {
  return Intl.NumberFormat("en-US").format(num);
};

// File Operations
export const getFileType = (
  file: File
): {
  type: "media" | "document";
  extension: string;
} => {
  const extension = file.name.split(".").pop() ?? "unknown";
  const contentType = file.type;
  const type =
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/")
      ? "media"
      : "document";

  return { type, extension };
};

export const getMediaContentType = (
  file: File
): "image" | "video" | "audio" => {
  const contentType = file.type;
  return contentType.startsWith("image/")
    ? "image"
    : contentType.startsWith("video/")
      ? "video"
      : "audio";
};

export const formatFileSize = (
  bytes: number,
  unit: "B" | "KB" | "MB" | "GB" = "MB",
  fixed = 2
): string => {
  const unitMap = { B: 0, KB: 1, MB: 2, GB: 3 };
  const targetUnitIndex = unitMap[unit];
  let size = bytes;

  // Convert bytes to target unit
  for (let i = 0; i < targetUnitIndex; i++) {
    size /= 1024;
  }

  return size.toFixed(fixed);
};

// Convex
export const getConvexHttpUrl = (convexUrl: string) => {
  return convexUrl.replace(".convex.cloud", ".convex.site");
};
export const isValidUrlFormat = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const formatUrlWithProtocol = (url: string): string | null => {
  const urlWithProtocol = url.includes("://") ? url : `https://${url}`;

  if (isValidUrlFormat(urlWithProtocol)) return urlWithProtocol;

  return null;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/* Language Operations */
export const getAllLocales = () =>
  countriesAndLanguages
    .sort((a, b) => a.country.localeCompare(b.country))
    .flatMap((c) =>
      c.languages.map((l) => ({
        value: `${l.code}-${c.code}`,
        label1: `${c.country} - ${l.name}`,
        label2: `${l.code}-${c.code}`,
        keywords: [l.name, c.country],
      }))
    );

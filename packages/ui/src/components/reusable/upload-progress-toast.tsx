import { cn } from "@firebuzz/ui/lib/utils";
import { Files } from "lucide-react";

interface UploadProgressToastProps {
  fileName: string;
  progress: number;
  uploadedSize: number;
  totalSize: number;
  timeLeft?: string;
}

const getFileExtension = (fileName: string) => {
  return fileName.split(".").pop()?.toUpperCase();
};

const getColor = (fileExtension: string) => {
  switch (fileExtension) {
    case "PNG":
    case "JPG":
    case "JPEG":
    case "GIF":
    case "WEBP":
      return "bg-amber-500 text-amber-50";
    case "PDF":
      return "bg-red-500 text-red-50";
    case "CSV":
      return "bg-green-500 text-green-50";
    case "DOC":
    case "DOCX":
      return "bg-sky-500 text-sky-50";
    case "HTML":
    case "MD":
    case "MARKDOWN":
      return "bg-orange-500 text-orange-50";
    default:
      return "bg-gray-500 text-gray-50";
  }
};

export const UploadProgressToast = ({
  fileName,
  progress,
  uploadedSize,
  totalSize,
  timeLeft,
}: UploadProgressToastProps) => {
  const fileExtension = getFileExtension(fileName);
  const color = getColor(fileExtension ?? "");

  return (
    <div className="flex items-center gap-3 min-w-[300px]">
      <div className="h-10 w-10 rounded-full bg-muted relative flex items-center justify-center">
        <Files className="h-4 w-4" />
        <span
          className={cn(
            "text-[8px] leading-none px-1 py-0.5 font-medium absolute -top-2 -left-2 rounded-sm",
            color
          )}
        >
          {fileExtension}
        </span>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{fileName}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {(uploadedSize / (1024 * 1024)).toFixed(1)} MB /{" "}
            {(totalSize / (1024 * 1024)).toFixed(1)} MB
          </span>
          {timeLeft && (
            <>
              <span>•</span>
              <span>{timeLeft}</span>
            </>
          )}
        </div>
      </div>

      <div className="relative h-8 w-8">
        <svg className="h-full w-full rotate-[-90deg]">
          <circle
            className="text-muted/30"
            strokeWidth="2"
            stroke="currentColor"
            fill="transparent"
            r="15"
            cx="16"
            cy="16"
          />
          <circle
            className="text-primary"
            strokeWidth="2"
            strokeDasharray={94.2}
            strokeDashoffset={94.2 - (94.2 * progress) / 100}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="15"
            cx="16"
            cy="16"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px]">
          {progress}%
        </div>
      </div>
    </div>
  );
};

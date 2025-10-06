"use client";

import { useSandbox } from "@/hooks/agent/use-sandbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { ExternalLink } from "@firebuzz/ui/icons/lucide";

export const PreviewCard = () => {
  const sandbox = useSandbox();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Live sandbox preview</CardDescription>
          </div>
          {sandbox.previewURL && (
            <a
              href={sandbox.previewURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-1 items-center text-sm transition-colors text-muted-foreground hover:text-foreground"
            >
              Open in new tab
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {sandbox.previewURL ? (
          <iframe
            src={sandbox.previewURL}
            className="w-full h-full border-0"
            title="Sandbox Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            <p>No preview available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

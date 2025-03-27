import type { Action } from "@/lib/workbench/atoms";
import { javascript } from "@codemirror/lang-javascript";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { CircleCheck, XIcon } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import CodeMirror from "@uiw/react-codemirror";
import { motion } from "motion/react";

interface ActionListProps {
  actions: Action[];
}

export const ActionList = ({ actions }: ActionListProps) => {
  console.log(actions);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ul className="space-y-2.5">
        {actions.map((action, index) => (
          <ActionItem
            key={action.id}
            action={action}
            isLast={index === actions.length - 1}
          />
        ))}
      </ul>
    </motion.div>
  );
};

interface ActionItemProps {
  action: Action;
  isLast: boolean;
}

const ActionItem = ({ action, isLast }: ActionItemProps) => {
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm"
    >
      <div className="flex items-center gap-1.5">
        <StatusIcon status={action.status} />
        <div>{getActionLabel(action)}</div>
      </div>

      {action.type === "shell" && (
        <div
          className={cn("mt-2", {
            "mb-3.5": !isLast,
          })}
        >
          <TerminalCode code={action.content} />
        </div>
      )}
    </motion.li>
  );
};

interface TerminalCodeProps {
  code: string;
}

const TerminalCode = ({ code }: TerminalCodeProps) => {
  // Process the code to ensure each line starts with proper indentation and formatting
  const processedCode = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return (
    <div className="terminal-code relative rounded overflow-hidden">
      <CodeMirror
        value={processedCode}
        height="auto"
        readOnly
        extensions={[javascript({ jsx: true })]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          closeBrackets: false,
        }}
      />
    </div>
  );
};

const StatusIcon = ({ status }: { status: Action["status"] }) => {
  const iconClass = "h-4 w-4";

  switch (status) {
    case "pending":
      return <Spinner size="xs" className="mb-0.5" />;
    case "success":
      return <CircleCheck className={cn(iconClass, "text-brand")} />;
    case "error":
      return <XIcon className={cn(iconClass, "text-destructive")} />;
  }
};

const getActionLabel = (action: Action) => {
  switch (action.type) {
    case "file":
      return <span>{action.title}</span>;
    case "shell":
      return <span>{action.title}</span>;
    case "quick-edit":
      return <span>{action.title}</span>;
    default:
      return "Unknown action";
  }
};

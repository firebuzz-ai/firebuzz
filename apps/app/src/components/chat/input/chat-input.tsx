import { Textarea } from "@firebuzz/ui/components/ui/textarea";

export const ChatInput = ({
  onSubmit,
}: {
  onSubmit: (message: string) => void;
}) => {
  return (
    <div className="px-4 py-4 max-w-4xl w-full mx-auto">
      <Textarea
        className="w-full bg-background-subtle focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none"
        placeholder="Type your message here..."
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
};

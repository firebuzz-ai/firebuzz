"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

interface EmailFormProps {
  onSuccess: () => void;
}

export const EmailForm = ({ onSuccess }: EmailFormProps) => {
  const { user } = useUser();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    setIsSubmitting(true);
    try {
      // Add the email address to the user
      await user.createEmailAddress({ email });
      await user.reload();

      toast.success("Email address added successfully");
      setEmail("");
      onSuccess();
    } catch (error: unknown) {
      console.error("Error adding email:", error);
      const errorMessage =
        (error as { errors?: Array<{ longMessage?: string }> })?.errors?.[0]
          ?.longMessage || "Failed to add email address";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex overflow-hidden flex-col flex-1 h-full">
      <div className="overflow-auto flex-1 p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </form>
      </div>

      {/* Footer with Submit Button */}
      <div className="p-4 border-t">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting || !email.trim()}
        >
          {isSubmitting ? <Spinner size="xs" /> : "Add email"}
        </Button>
      </div>
    </div>
  );
};

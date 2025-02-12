"use client";
import { useSignUp } from "@clerk/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { type Dispatch, type SetStateAction, useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .email({ message: "Invalid email." }),
  firstName: z.string({ required_error: "First name is required." }),
  lastName: z.string({ required_error: "Last name is required." }),
});

interface Props {
  setIsVerificationOpen: Dispatch<SetStateAction<boolean>>;
  setEmail: Dispatch<SetStateAction<string>>;
}

const EmailSignUp = ({ setIsVerificationOpen, setEmail }: Props) => {
  const { isLoaded, signUp } = useSignUp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
    },
  });
  // STATES
  const [isHandling, setIsHandling] = useState(false);
  // HANDLERS
  const handleEmailCodeSignUp = async (values: z.infer<typeof formSchema>) => {
    // Check if already handling
    if (isHandling) return;
    // Check if loaded
    if (!isLoaded) return;

    try {
      setIsHandling(true);
      toast.loading("Signing up...", {
        id: "signup-code-flow",
      });

      // Start Signin Flow
      await signUp.create({
        emailAddress: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      // Start the Verification
      await signUp.prepareEmailAddressVerification();

      setIsHandling(false);
      setEmail(values.email);
      setIsVerificationOpen(true);

      toast.success("Check your email.", {
        description: "We have sent you a code to sign up.",
        id: "signup-code-flow",
      });
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (error: any) {
      setIsHandling(false);
      console.log(error?.errors);
      toast.error(
        error?.errors?.[0].message ?? "Something went wrong. Please try again.",
        { id: "signup-code-flow" }
      );
    }
  };
  return (
    <div>
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            handleEmailCodeSignUp(values);
          })}
        >
          <div className="flex items-center justify-between gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Steve" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jobs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="youremail@mail.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full" variant="outline" type="submit">
            {isHandling ? (
              <div className="flex items-center gap-2">
                <Spinner size="xs" variant="default" /> Sending email...
              </div>
            ) : (
              "Sign up with Email"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default EmailSignUp;

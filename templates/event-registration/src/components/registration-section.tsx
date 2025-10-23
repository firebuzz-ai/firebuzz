import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Lock, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { campaignConfiguration } from "@/configuration/campaign";
import { formApiClient } from "@/lib/form-api";

// Create Zod schema from campaign configuration
const formSchema = z.object({
	"full-name": z.string().min(2, "Name is required"),
	"email": z.string().email("Valid email required"),
	"mobile": z.string().optional().or(z.literal("")),
	"company": z.string().optional().or(z.literal("")),
	"interested-in": z.string().min(1, "Please select an option"),
});

export function RegistrationSection() {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			"full-name": "",
			"email": "",
			"mobile": "",
			"company": "",
			"interested-in": "",
		},
	});

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const result = await formApiClient.submitForm(
			campaignConfiguration.formId,
			values,
		);

		if (result.success) {
			toast.success("Registration Confirmed!", {
				description: campaignConfiguration.successMessage,
			});
			form.reset();

			// Handle redirect if configured
			if (campaignConfiguration.redirectUrl) {
				setTimeout(() => {
					window.location.href = campaignConfiguration.redirectUrl as string;
				}, 1500);
			}
		} else {
			toast.error("Registration Failed", {
				description: formApiClient.getToastMessage(result),
			});

			// Set field-specific errors
			const errors = formApiClient.getValidationErrors(result);
			for (const [field, message] of Object.entries(errors)) {
				form.setError(field as keyof z.infer<typeof formSchema>, { message });
			}
		}
	};

	return (
		<section id="registration" className="py-20 bg-muted/30">
			<div className="container mx-auto px-4">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="text-center mb-12">
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-3xl lg:text-5xl font-bold mb-4"
						>
							Secure Your Spot Today
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-xl text-muted-foreground max-w-2xl mx-auto"
						>
							Register now to join us on June 15-16, 2025. Limited seats
							available!
						</motion.p>
					</div>

					<div className="grid lg:grid-cols-3 gap-8">
						{/* Benefits Column */}
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							viewport={{ once: true }}
							className="space-y-6"
						>
							<Card>
								<CardHeader>
									<CardTitle className="text-lg">What's Included</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-start space-x-3">
										<CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="font-medium">Full Event Access</p>
											<p className="text-sm text-muted-foreground">
												Both days, all sessions
											</p>
										</div>
									</div>
									<div className="flex items-start space-x-3">
										<CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="font-medium">Networking Events</p>
											<p className="text-sm text-muted-foreground">
												Exclusive reception & lunch
											</p>
										</div>
									</div>
									<div className="flex items-start space-x-3">
										<CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="font-medium">Event Materials</p>
											<p className="text-sm text-muted-foreground">
												Digital resources & recordings
											</p>
										</div>
									</div>
									<div className="flex items-start space-x-3">
										<CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
										<div>
											<p className="font-medium">Certificate</p>
											<p className="text-sm text-muted-foreground">
												Official attendance certificate
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Security Badges */}
							<div className="space-y-3 text-sm text-muted-foreground">
								<div className="flex items-center space-x-2">
									<Shield className="w-4 h-4 text-primary" />
									<span>Secure & encrypted registration</span>
								</div>
								<div className="flex items-center space-x-2">
									<Lock className="w-4 h-4 text-primary" />
									<span>Your data is protected</span>
								</div>
								<div className="flex items-center space-x-2">
									<CheckCircle className="w-4 h-4 text-primary" />
									<span>Instant confirmation email</span>
								</div>
							</div>
						</motion.div>

						{/* Form Column */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							viewport={{ once: true }}
							className="lg:col-span-2"
						>
							<Card>
								<CardHeader>
									<CardTitle>Registration Form</CardTitle>
								</CardHeader>
								<CardContent>
									<Form {...form}>
										<form
											onSubmit={form.handleSubmit(onSubmit)}
											className="space-y-6"
										>
											{campaignConfiguration.schema
												.filter((field) => field.visible)
												.map((field) => (
													<FormField
														key={field.id}
														control={form.control}
														name={field.id as keyof z.infer<typeof formSchema>}
														render={({ field: formField }) => (
															<FormItem>
																<FormLabel>
																	{field.title}
																	{field.required && (
																		<span className="text-destructive ml-1">*</span>
																	)}
																</FormLabel>
																<FormControl>
																	{field.inputType === "select" ? (
																		<Select
																			onValueChange={formField.onChange}
																			value={formField.value as string}
																		>
																			<SelectTrigger>
																				<SelectValue
																					placeholder={field.placeholder}
																				/>
																			</SelectTrigger>
																			<SelectContent>
																				{field.options?.map((option) => (
																					<SelectItem
																						key={option.value}
																						value={option.value}
																					>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	) : (
																		<Input
																			type={field.inputType}
																			placeholder={field.placeholder}
																			{...formField}
																			value={formField.value as string}
																		/>
																	)}
																</FormControl>
																{field.description && (
																	<FormDescription>
																		{field.description}
																	</FormDescription>
																)}
																<FormMessage />
															</FormItem>
														)}
													/>
												))}

											<Button
												type="submit"
												size="lg"
												className="w-full text-lg"
												disabled={form.formState.isSubmitting}
											>
												{form.formState.isSubmitting
													? "Registering..."
													: campaignConfiguration.submitButtonText}
											</Button>

											<p className="text-xs text-center text-muted-foreground">
												By registering, you agree to receive event updates and
												communications. You can unsubscribe at any time.
											</p>
										</form>
									</Form>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}

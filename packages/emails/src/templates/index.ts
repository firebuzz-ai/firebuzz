// Re-export all email templates with consistent naming
export {
  type AuthInvitationTemplateProps,
  default as AuthInvitationTemplate,
} from "./auth-invitation";
export {
  type AuthOTPTemplateProps,
  default as AuthOTPTemplate,
} from "./auth-otp";

// Future email templates can be added here
// export { default as WelcomeTemplate, type WelcomeTemplateProps } from "../emails/welcome";
// export { default as PasswordResetTemplate, type PasswordResetTemplateProps } from "../emails/password-reset";
// export { default as PaymentConfirmationTemplate, type PaymentConfirmationTemplateProps } from "../emails/payment-confirmation";

// Email template registry for easier management
export const EMAIL_TEMPLATES = {
  AUTH_INVITATION: "AuthInvitationTemplate",
  AUTH_OTP: "AuthOTPTemplate",
  // WELCOME: "WelcomeTemplate",
  // PASSWORD_RESET: "PasswordResetTemplate",
  // PAYMENT_CONFIRMATION: "PaymentConfirmationTemplate",
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

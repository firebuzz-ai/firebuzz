// Export all email templates and types
export * from "./templates";

// Export individual templates for direct import
export {
	type AuthInvitationTemplateProps,
	default as AuthInvitationTemplate,
} from "./templates/auth-invitation";

export {
	type AuthInvitationAcceptedTemplateProps,
	default as AuthInvitationAcceptedTemplate,
} from "./templates/auth-invitation-accepted";

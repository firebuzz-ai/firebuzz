// Export all email templates and types
export * from "./templates";

// Export individual templates for direct import
export {
	default as AuthInvitationTemplate,
	type AuthInvitationTemplateProps,
} from "./templates/auth-invitation";

export {
	default as AuthInvitationAcceptedTemplate,
	type AuthInvitationAcceptedTemplateProps,
} from "./templates/auth-invitation-accepted";

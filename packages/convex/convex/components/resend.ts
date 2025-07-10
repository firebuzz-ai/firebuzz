"use node";
import { Resend } from "@convex-dev/resend";
import {
	AuthInvitationAcceptedTemplate,
	AuthInvitationTemplate,
	AuthOTPTemplate,
} from "@firebuzz/emails";
import { pretty, render } from "@react-email/render";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const resend: Resend = new Resend(components.resend, {
	testMode: false,
});

export const sendAuthInvitationEmail = internalAction({
	args: {
		to: v.string(),
		invitedByUsername: v.string(),
		teamName: v.string(),
		inviteLink: v.string(),
	},
	handler: async (ctx, { to, invitedByUsername, teamName, inviteLink }) => {
		const subject = "Invitation to Firebuzz";
		const body = await pretty(
			await render(
				AuthInvitationTemplate({
					invitedByUsername,

					teamName,
					userEmail: to,
					inviteLink,
				}),
			),
		);

		await resend.sendEmail(
			ctx,
			"Firebuzz <invitation@auth-service.getfirebuzz.com>",
			to,
			subject,
			body,
		);
	},
});

export const sendAuthInvitationAcceptedEmail = internalAction({
	args: {
		to: v.string(),
		memberEmail: v.string(),
		teamName: v.string(),
		appLink: v.string(),
	},
	handler: async (ctx, { to, memberEmail, teamName, appLink }) => {
		const subject = `New member has joined ${teamName}`;
		const body = await pretty(
			await render(
				AuthInvitationAcceptedTemplate({
					memberEmail,
					teamName,
					appLink,
				}),
			),
		);

		await resend.sendEmail(
			ctx,
			"Firebuzz <notifications@auth-service.getfirebuzz.com>",
			to,
			subject,
			body,
		);
	},
});

export const sendAuthOTPEmail = internalAction({
	args: {
		to: v.string(),
		otpCode: v.string(),
		ttlMinutes: v.number(),
		requestedAt: v.string(),
		requestedBy: v.string(),
		requestedFrom: v.string(),
	},
	handler: async (
		ctx,
		{ to, otpCode, ttlMinutes, requestedAt, requestedBy, requestedFrom },
	) => {
		const subject = "Your verification code is ready.";
		const body = await pretty(
			await render(
				AuthOTPTemplate({
					otpCode,
					ttlMinutes,
					requestedAt,
					requestedBy,
					requestedFrom,
				}),
			),
		);

		await resend.sendEmail(
			ctx,
			"Firebuzz <verification@auth-service.getfirebuzz.com>",
			to,
			subject,
			body,
		);
	},
});

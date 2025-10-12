import { DurableObject } from "cloudflare:workers";

export interface AgentSessionState {
	sessionId: string;
	maxDuration: number; // in milliseconds
	maxIdleTime: number; // in milliseconds
	expiresAt: number;
	createdAt: number;
	lastActivity: number;
	status: "active" | "idle-warning" | "ending" | "ended" | "error";
}

export class AgentSessionDurableObject extends DurableObject<Env> {
	/**
	 * Initialize agent session with configuration
	 */
	async initialize(params: {
		sessionId: string;
		sandboxId?: string;
		maxDuration: number; // milliseconds
		maxIdleTime: number; // milliseconds
	}): Promise<
		| {
				success: true;
				expiresAt: number;
				nextIdleCheck: number;
		  }
		| {
				success: false;
				error: string;
		  }
	> {
		try {
			const now = Date.now();

			// Store initial state
			const state: AgentSessionState = {
				sessionId: params.sessionId,
				maxDuration: params.maxDuration,
				expiresAt: now + params.maxDuration,
				maxIdleTime: params.maxIdleTime,
				createdAt: now,
				lastActivity: now,
				status: "active",
			};

			await this.ctx.storage.put<AgentSessionState>("state", state);

			// Schedule next idle check
			const nextIdleCheck = now + params.maxIdleTime;
			await this.ctx.storage.setAlarm(nextIdleCheck);

			return {
				success: true,
				expiresAt: state.expiresAt,
				nextIdleCheck: nextIdleCheck,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return { success: false, error: errorMessage };
		}
	}

	/**
	 * Schedule session over (idle or max duration)
	 * This notifies Convex, which will handle showing UI to the user
	 */
	async scheduleSessionOver(params: {
		type: "idle" | "max-duration";
	}): Promise<{ success: boolean }> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return { success: false };

		// If already ended, no need to schedule
		if (state.status === "ended") {
			console.log("[DO] Session already ended, skipping schedule");
			return { success: true };
		}

		// Notify Convex - it will show popup to user
		const delay = 15000; // 15 seconds

		try {
			await this.callConvex("/agent-session/schedule-over", {
				sessionId: state.sessionId,
				reason: params.type,
				delay,
			});
		} catch (error) {
			// Check if this is a "session not found" error vs network error
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			if (errorMessage.includes("not found") || errorMessage.includes("404")) {
				console.log("[DO] Session not found in Convex, ending DO");
				await this.endSession("session-not-found");
				return { success: false };
			}

			// For other errors (network, etc), log but don't end session yet
			console.error(
				"[DO] Failed to notify Convex, will retry on next alarm:",
				errorMessage,
			);
			return { success: false };
		}

		if (params.type === "idle") {
			// For idle timeout, Convex will show popup for 10 seconds
			// User can click "Continue" which calls extendSession() on this DO
			state.status = "idle-warning";
			await this.ctx.storage.put<AgentSessionState>("state", state);

			// Schedule check after 15 seconds to see if Convex received user's continue action
			// Removed allowConcurrency to prevent race conditions
			await this.ctx.storage.setAlarm(Date.now() + 15000);
		} else {
			// For max duration, end immediately (no user action possible)
			await this.endSession("max-duration-reached");
		}

		return { success: true };
	}

	/**
	 * Extend session (called from Convex when user clicks Continue)
	 */
	async extendSession(): Promise<{ success: boolean }> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return { success: false };

		state.status = "active";
		state.lastActivity = Date.now();
		await this.ctx.storage.put<AgentSessionState>("state", state);

		// Extension is handled by Convex calling this method, no need to notify back
		return { success: true };
	}

	/**
	 * Update activity timestamp (RPC method)
	 * Called from Convex when user performs actions:
	 * - Sends chat message
	 * - Uses agent tools (file edits, etc.)
	 * - Interacts with the UI
	 */
	async updateActivity(): Promise<{ success: boolean; error?: string }> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return { success: false, error: "Session not found" };

		// Prevent updating activity on ended sessions
		if (state.status === "ended") {
			console.log("[DO] Cannot update activity on ended session");
			return { success: false, error: "Session has ended" };
		}

		state.lastActivity = Date.now();
		if (state.status === "idle-warning") {
			state.status = "active";
		}
		await this.ctx.storage.put<AgentSessionState>("state", state);

		console.log(
			"[DO] Activity updated, lastActivity:",
			new Date(state.lastActivity).toISOString(),
		);

		return { success: true };
	}

	/**
	 * Alarm handler - triggered for max duration or session end check
	 */
	async alarm(): Promise<void> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return;

		if (state.status === "ended") {
			console.log(
				"[DO] Session already ended, skipping alarm. Calling cleanup...",
			);
			await this.cleanup();
			return;
		}

		const now = Date.now();

		// Check 1: Has max duration been exceeded?
		if (now >= state.expiresAt) {
			console.log("[DO] Max duration reached, ending session");
			await this.scheduleSessionOver({ type: "max-duration" });
			return;
		}

		// Check 2: Is this the follow-up check after idle warning?
		if (state.status === "idle-warning") {
			const shouldEnd = await this.checkSessionShouldEnd();
			if (shouldEnd) {
				console.log(
					"[DO] User did not continue after idle warning, ending session",
				);
				await this.endSession("idle-timeout");
				return;
			}
			// User continued, reset to active and continue monitoring
			console.log(
				"[DO] User continued after idle warning, resuming monitoring",
			);
			state.status = "active";
			await this.ctx.storage.put<AgentSessionState>("state", state);
		}

		// Check 3: Has user been idle too long?
		const timeSinceLastActivity = now - state.lastActivity;
		if (timeSinceLastActivity >= state.maxIdleTime) {
			console.log("[DO] User idle for too long, triggering idle warning");
			await this.scheduleSessionOver({ type: "idle" });
			return;
		}

		// Schedule next alarm: whichever comes first
		const nextIdleCheck = state.lastActivity + state.maxIdleTime;
		const nextMaxDurationCheck = state.expiresAt;

		const nextAlarm = Math.min(nextIdleCheck, nextMaxDurationCheck);

		console.log("[DO] Scheduling next alarm:", {
			nextIdleCheck: new Date(nextIdleCheck).toISOString(),
			nextMaxDurationCheck: new Date(nextMaxDurationCheck).toISOString(),
			chosen: new Date(nextAlarm).toISOString(),
			timeUntilAlarm: `${Math.round((nextAlarm - now) / 1000)}s`,
		});

		await this.ctx.storage.setAlarm(nextAlarm);
	}

	/**
	 * End session
	 */
	private async endSession(reason: string): Promise<void> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return;

		// Prevent duplicate end calls
		if (state.status === "ended") {
			console.log(`[DO] Session ${state.sessionId} already ended, skipping`);
			return;
		}

		console.log(`[DO] Ending session ${state.sessionId}, reason: ${reason}`);

		state.status = "ended";
		await this.ctx.storage.put<AgentSessionState>("state", state);

		// Schedule cleanup after 5 minutes to allow pending operations to complete
		await this.ctx.storage.setAlarm(Date.now() + 300000); // 5 minutes
	}

	/**
	 * Check with Convex if session should end (mock)
	 */
	private async checkSessionShouldEnd(): Promise<boolean> {
		// Check last activity timestamp
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		if (!state) return false;

		const now = Date.now();
		const sessionAge = now - state.lastActivity;
		if (sessionAge >= state.maxIdleTime) {
			return true;
		}

		return false;
	}

	/**
	 * Call Convex HTTP endpoint
	 */
	private async callConvex(
		endpoint: string,
		body: Record<string, unknown>,
	): Promise<void> {
		try {
			const convexUrl = this.env.CONVEX_HTTP_URL;
			const serviceToken = this.env.SERVICE_TOKEN;

			if (!convexUrl) {
				console.error("[DO] CONVEX_HTTP_URL not configured");
				return;
			}

			if (!serviceToken) {
				console.error("[DO] SERVICE_TOKEN not configured");
				return;
			}

			const response = await fetch(`${convexUrl}${endpoint}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: serviceToken,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const error = await response.text();
				console.error(`[DO] Convex call failed (${endpoint}):`, error);
				throw new Error(`Convex call failed: ${error}`);
			}
		} catch (error) {
			console.error(`[DO] Failed to call Convex (${endpoint}):`, error);
			throw error;
		}
	}

	/**
	 * Get current state
	 */
	async getState(): Promise<AgentSessionState | null> {
		const state = await this.ctx.storage.get<AgentSessionState>("state");
		return state ?? null;
	}

	/**
	 * Clean up and close
	 */
	async cleanup(): Promise<void> {
		await this.endSession("manual-cleanup");
		await this.ctx.storage.deleteAll();
	}
}

export default AgentSessionDurableObject;

import { DurableObject } from "cloudflare:workers";
import type { DOSessionState, EventData } from "@firebuzz/shared-types/events";
import {
	eventDataSchema,
	initSessionRequestSchema,
	trackEventRequestSchema,
} from "@firebuzz/shared-types/events";
import { getEventQueueService, getSessionQueueService } from "../lib/queue";
import { formatSessionData } from "../lib/tinybird";
import { generateUniqueId } from "../utils/id-generator";

// ============================================================================
// Constants
// ============================================================================

const SESSION_CLEANUP_DELAY_MS = 60000; // Cleanup DO 1 minute after session expires

// ============================================================================
// EventTracker Durable Object
// ============================================================================

export class EventTrackerDurableObject extends DurableObject<Env> {
	private sql: SqlStorage;
	private currentSession: DOSessionState | null = null;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = this.ctx.storage.sql;

		// Initialize database schema
		this.ctx.blockConcurrencyWhile(async () => {
			await this.initializeSchema();
		});
	}

	// ============================================================================
	// Database Schema
	// ============================================================================

	private async initializeSchema(): Promise<void> {
		this.sql.exec(`
			-- Session state table (single row per DO instance)
			CREATE TABLE IF NOT EXISTS session_state (
				id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
				session_id TEXT NOT NULL,
				user_id TEXT NOT NULL,
				campaign_id TEXT NOT NULL,
				workspace_id TEXT NOT NULL,
				project_id TEXT NOT NULL,
				attribution_id TEXT NOT NULL,
				landing_page_id TEXT NOT NULL,
				ab_test_id TEXT NULL,
				ab_test_variant_id TEXT NULL,

				-- DO management
				event_sequence INTEGER NOT NULL DEFAULT 0,
				last_activity INTEGER NOT NULL,
				session_timeout INTEGER NOT NULL,
				created_at INTEGER NOT NULL,
				is_expired INTEGER NOT NULL DEFAULT 0,

				-- Environment
				environment TEXT NOT NULL,
				campaign_environment TEXT NOT NULL,

				CONSTRAINT single_row CHECK (id = 1)
			);

			-- Event buffer table
			CREATE TABLE IF NOT EXISTS event_buffer (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				event_id TEXT NOT NULL,
				event_data TEXT NOT NULL, -- JSON string
				sequence_number INTEGER NOT NULL,
				created_at INTEGER NOT NULL,
				sent_to_tinybird INTEGER NOT NULL DEFAULT 0 -- 0 = not sent, 1 = sent
			);

			-- Session context table (stores original request context for renewals)
			CREATE TABLE IF NOT EXISTS session_context (
				id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
				context_data TEXT NOT NULL, -- JSON string with geo, device, traffic, etc.
				created_at INTEGER NOT NULL,
				CONSTRAINT single_context CHECK (id = 1)
			);

			-- Create index for efficient querying
			CREATE INDEX IF NOT EXISTS idx_event_buffer_sequence ON event_buffer(sequence_number);
		`);

		// Add migration for existing databases that don't have sent_to_tinybird column
		try {
			this.sql.exec(
				"ALTER TABLE event_buffer ADD COLUMN sent_to_tinybird INTEGER NOT NULL DEFAULT 0",
			);
		} catch (error) {
			// Column already exists, ignore error
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (!errorMessage.includes("duplicate column name")) {
				console.warn("Migration warning:", error);
			}
		}

		// Load existing session state if it exists
		await this.loadSessionFromStorage();
	}

	// ============================================================================
	// Session State Management
	// ============================================================================

	private async loadSessionFromStorage(): Promise<void> {
		const sessionRow = this.sql
			.exec("SELECT * FROM session_state WHERE id = 1")
			.toArray()[0] as Record<string, unknown> | undefined;

		if (sessionRow) {
			this.currentSession = {
				sessionId: sessionRow.session_id as string,
				userId: sessionRow.user_id as string,
				campaignId: sessionRow.campaign_id as string,
				workspaceId: sessionRow.workspace_id as string,
				projectId: sessionRow.project_id as string,
				attributionId: sessionRow.attribution_id as string,
				landingPageId: sessionRow.landing_page_id as string,
				abTestId: sessionRow.ab_test_id as string,
				abTestVariantId: sessionRow.ab_test_variant_id as string,
				eventBuffer: await this.loadEventBuffer(),
				eventSequence: sessionRow.event_sequence as number,
				lastActivity: sessionRow.last_activity as number,
				sessionTimeout: sessionRow.session_timeout as number,
				createdAt: sessionRow.created_at as number,
				isExpired: (sessionRow.is_expired as number) === 1,
				environment: sessionRow.environment as string,
				campaignEnvironment: sessionRow.campaign_environment as string,
			};

			// Check if session is expired
			await this.checkSessionExpiry();
		}
	}

	private async loadEventBuffer(): Promise<EventData[]> {
		// Only load events that haven't been sent to Tinybird yet
		const eventRows = this.sql
			.exec(
				"SELECT event_data FROM event_buffer WHERE sent_to_tinybird = 0 ORDER BY sequence_number",
			)
			.toArray() as Array<{
			event_data: string;
		}>;

		return eventRows.map((row) => JSON.parse(row.event_data) as EventData);
	}

	private async saveSessionToStorage(): Promise<void> {
		if (!this.currentSession) return;

		const session = this.currentSession; // Capture for closure

		await this.ctx.storage.transaction(async () => {
			// Upsert session state
			this.sql.exec(
				`INSERT INTO session_state (
					id, session_id, user_id, campaign_id, workspace_id, project_id,
					attribution_id, landing_page_id, ab_test_id, ab_test_variant_id,
					event_sequence, last_activity, session_timeout, created_at,
					is_expired, environment, campaign_environment
				) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					session_id = excluded.session_id,
					user_id = excluded.user_id,
					campaign_id = excluded.campaign_id,
					workspace_id = excluded.workspace_id,
					project_id = excluded.project_id,
					attribution_id = excluded.attribution_id,
					landing_page_id = excluded.landing_page_id,
					ab_test_id = excluded.ab_test_id,
					ab_test_variant_id = excluded.ab_test_variant_id,
					event_sequence = excluded.event_sequence,
					last_activity = excluded.last_activity,
					session_timeout = excluded.session_timeout,
					created_at = excluded.created_at,
					is_expired = excluded.is_expired,
					environment = excluded.environment,
					campaign_environment = excluded.campaign_environment`,
				session.sessionId,
				session.userId,
				session.campaignId,
				session.workspaceId,
				session.projectId,
				session.attributionId,
				session.landingPageId,
				session.abTestId,
				session.abTestVariantId,
				session.eventSequence,
				session.lastActivity,
				session.sessionTimeout,
				session.createdAt,
				session.isExpired ? 1 : 0,
				session.environment,
				session.campaignEnvironment,
			);
		});
	}

	// ============================================================================
	// RPC Methods
	// ============================================================================

	// ============================================================================
	// Public RPC Methods
	// ============================================================================

	async initSession(data: unknown): Promise<{
		success: boolean;
		session_id?: string;
		session_data?: DOSessionState;
		error?: string;
	}> {
		try {
			const sessionData = initSessionRequestSchema.parse(data);
			const sessionId = sessionData.session_id; // Use provided session ID
			const now = Date.now();

			// Create new session state
			this.currentSession = {
				sessionId,
				userId: sessionData.user_id,
				campaignId: sessionData.campaign_id,
				workspaceId: sessionData.workspace_id,
				projectId: sessionData.project_id,
				attributionId: sessionData.attribution_id,
				landingPageId: sessionData.landing_page_id,
				abTestId: sessionData.ab_test_id,
				abTestVariantId: sessionData.ab_test_variant_id,
				eventBuffer: [],
				eventSequence: 0,
				lastActivity: now,
				sessionTimeout: sessionData.session_timeout_minutes,
				createdAt: now,
				isExpired: false,
				environment: sessionData.environment || "production",
				campaignEnvironment: sessionData.campaign_environment || "production",
			};

			await this.saveSessionToStorage();
			await this.scheduleSessionExpiry();

			return {
				success: true,
				session_id: sessionId,
				session_data: this.currentSession,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to initialize session",
			};
		}
	}

	async trackEvent(data: unknown): Promise<{
		success: boolean;
		event_sequence?: number;
		events_in_buffer?: number;
		flushed_to_tinybird?: boolean;
		error?: string;
	}> {
		try {
			const eventRequest = trackEventRequestSchema.parse(data);

			if (
				!this.currentSession ||
				this.currentSession.sessionId !== eventRequest.session_id
			) {
				console.log("❌ Session mismatch or not found:", {
					event_id: eventRequest.event_id,
					requested_session: eventRequest.session_id,
					current_session: this.currentSession?.sessionId,
				});
				return {
					success: false,
					error: "Session not found or mismatched",
				};
			}

			// Check session expiry
			if (await this.checkSessionExpiry()) {
				return {
					success: false,
					error: "Session expired",
				};
			}

			// Update last activity
			this.currentSession.lastActivity = Date.now();

			// Increment event sequence
			this.currentSession.eventSequence += 1;

			// Create complete event data
			const internalId = generateUniqueId(); // Internal unique ID for tracking

			const eventData: EventData = {
				timestamp: new Date().toISOString(),
				id: internalId,
				event_id: eventRequest.event_id, // Use the string identifier from request
				event_value: eventRequest.event_value || 0,
				event_value_type: eventRequest.event_value_type || "static",
				event_type: eventRequest.event_type,

				// Context from session
				user_id: this.currentSession.userId,
				campaign_id: this.currentSession.campaignId,
				session_id: this.currentSession.sessionId,
				attribution_id: this.currentSession.attributionId,
				workspace_id: this.currentSession.workspaceId,
				project_id: this.currentSession.projectId,
				landing_page_id: this.currentSession.landingPageId,
				ab_test_id: this.currentSession.abTestId,
				ab_test_variant_id: this.currentSession.abTestVariantId,

				// Event-specific data
				form_id: eventRequest.form_id,
				clicked_element: eventRequest.clicked_element,
				clicked_url: eventRequest.clicked_url,
				page_load_time: eventRequest.page_load_time,
				dom_ready_time: eventRequest.dom_ready_time,
				scroll_percentage: eventRequest.scroll_percentage,
				time_on_page: eventRequest.time_on_page,
				session_event_sequence: this.currentSession.eventSequence,
				viewport_width: eventRequest.viewport_width,
				viewport_height: eventRequest.viewport_height,

				// Metadata
				metadata: eventRequest.metadata,

				// Environment
				environment: this.currentSession.environment,
				campaign_environment: this.currentSession.campaignEnvironment,
				page_url: eventRequest.page_url || "",
				referrer_url: eventRequest.referrer_url,
			};

			// Validate complete event data
			eventDataSchema.parse(eventData);

			// Add to buffer
			this.currentSession.eventBuffer.push(eventData);

			// Store in database
			await this.ctx.storage.transaction(async () => {
				this.sql.exec(
					"INSERT INTO event_buffer (event_id, event_data, sequence_number, created_at, sent_to_tinybird) VALUES (?, ?, ?, ?, ?)",
					eventData.event_id,
					JSON.stringify(eventData),
					this.currentSession!.eventSequence,
					Date.now(),
					0, // Not sent yet
				);
			});

			await this.saveSessionToStorage();

			// Send event directly to queue for processing
			try {
				const eventQueueService = getEventQueueService(this.env);
				await eventQueueService.enqueue(eventData);

				// Clear the event from buffer since it's now queued
				this.currentSession.eventBuffer = [];

				return {
					success: true,
					event_sequence: this.currentSession.eventSequence,
					events_in_buffer: 0, // Always 0 since we immediately queue
					flushed_to_tinybird: true, // Queued for processing
				};
			} catch (error) {
				console.error("Failed to enqueue event:", error);

				return {
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to queue event",
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to track event",
			};
		}
	}

	async validateSession(
		sessionId: string,
	): Promise<{ success: boolean; session?: DOSessionState; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: "Session not found",
			};
		}

		const isExpired = await this.checkSessionExpiry();
		if (isExpired) {
			return {
				success: false,
				error: "Session expired",
			};
		}

		// Update last activity
		this.currentSession.lastActivity = Date.now();
		await this.saveSessionToStorage();

		return {
			success: true,
			session: this.currentSession,
		};
	}

	async getSession(
		sessionId: string,
	): Promise<{ success: boolean; session?: DOSessionState; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: "Session not found",
			};
		}

		return {
			success: true,
			session: this.currentSession,
		};
	}

	async flushEvents(
		sessionId: string,
	): Promise<{ success: boolean; flushed_events?: boolean; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: "Session not found",
			};
		}

		// With queue system, events are immediately queued when tracked
		// No buffered events to flush
		console.log(
			"🚀 Flush requested - events are immediately queued, no buffer to flush",
		);

		return {
			success: true,
			flushed_events: true,
		};
	}

	async expireSession(
		sessionId: string,
	): Promise<{ success: boolean; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: "Session not found",
			};
		}

		// No need to flush since events are immediately queued

		// Mark as expired
		this.currentSession.isExpired = true;
		await this.saveSessionToStorage();

		// Schedule cleanup
		await this.ctx.storage.setAlarm(Date.now() + SESSION_CLEANUP_DELAY_MS);

		return {
			success: true,
		};
	}

	// ============================================================================
	// Session Context Management (for renewals)
	// ============================================================================

	async storeSessionContext(
		contextData: Record<string, unknown>,
	): Promise<{ success: boolean; error?: string }> {
		try {
			await this.ctx.storage.transaction(async () => {
				this.sql.exec(
					`INSERT INTO session_context (id, context_data, created_at) VALUES (1, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						context_data = excluded.context_data,
						created_at = excluded.created_at`,
					JSON.stringify(contextData),
					Date.now(),
				);
			});

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to store session context",
			};
		}
	}

	async queueRenewalSessionData(): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			if (!this.currentSession) {
				return {
					success: false,
					error: "No current session to queue",
				};
			}

			// Get stored context data
			const contextRow = this.sql
				.exec("SELECT context_data FROM session_context WHERE id = 1")
				.toArray()[0] as { context_data: string } | undefined;

			if (!contextRow) {
				return {
					success: false,
					error: "No session context stored",
				};
			}

			const contextData = JSON.parse(contextRow.context_data);
			const queueService = getSessionQueueService(this.env);

			// Format session data using stored context + current session data
			const sessionQueueData = formatSessionData({
				timestamp: new Date().toISOString(),
				sessionId: this.currentSession.sessionId,
				attributionId: this.currentSession.attributionId,
				userId: this.currentSession.userId,
				projectId: this.currentSession.projectId,
				workspaceId: this.currentSession.workspaceId,
				campaignId: this.currentSession.campaignId,
				landingPageId: this.currentSession.landingPageId,
				abTestId: this.currentSession.abTestId,
				abTestVariantId: this.currentSession.abTestVariantId,
				// Use stored context for rich data
				utm: contextData.utm,
				geo: contextData.geo,
				device: contextData.device,
				traffic: contextData.traffic,
				localization: contextData.localization,
				bot: contextData.bot,
				network: contextData.network,
				session: {
					isReturning: true, // This is a renewal
					campaignEnvironment: this.currentSession.campaignEnvironment as
						| "production"
						| "preview",
					environment: this.currentSession.environment,
					uri: contextData.session.uri,
					fullUri: contextData.session.fullUri,
				},
			});

			await queueService.enqueue(sessionQueueData);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to queue renewal session data",
			};
		}
	}

	// ============================================================================
	// Session Management
	// ============================================================================

	private async checkSessionExpiry(): Promise<boolean> {
		if (!this.currentSession || this.currentSession.isExpired) {
			return true;
		}

		const now = Date.now();
		const sessionAgeMs = now - this.currentSession.lastActivity;
		const timeoutMs = this.currentSession.sessionTimeout * 60 * 1000;

		if (sessionAgeMs > timeoutMs) {
			// Session has expired
			await this.expireSession(this.currentSession.sessionId);
			return true;
		}

		return false;
	}

	private async scheduleSessionExpiry(): Promise<void> {
		if (!this.currentSession) return;

		const expiryTime =
			this.currentSession.lastActivity +
			this.currentSession.sessionTimeout * 60 * 1000;

		await this.ctx.storage.setAlarm(expiryTime);
	}

	// ============================================================================
	// Session Management - Queue-based event processing
	// ============================================================================

	// ============================================================================
	// Alarm Handler
	// ============================================================================

	async alarm(): Promise<void> {
		try {
			if (this.currentSession && !this.currentSession.isExpired) {
				// Check if this is session expiry
				const isExpired = await this.checkSessionExpiry();
				if (!isExpired) {
					// Reschedule if session is still active
					await this.scheduleSessionExpiry();
				}
			} else {
				// This is cleanup alarm - no events to flush with queue system
				console.log("🧹 Cleaning up expired session, events already queued");

				// Clear all storage for this DO
				await this.ctx.storage.deleteAll();
				this.currentSession = null;

				console.log("EventTracker DO cleaned up after session expiry");
			}
		} catch (error) {
			console.error("EventTracker alarm error:", error);
		}
	}
}

export default EventTrackerDurableObject;

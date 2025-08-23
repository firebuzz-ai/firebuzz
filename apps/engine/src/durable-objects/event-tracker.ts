import type {
	DOSessionState,
	EventData,
} from '@firebuzz/shared-types/events';
import { eventDataSchema, initSessionRequestSchema, trackEventRequestSchema } from '@firebuzz/shared-types/events';
import { DurableObject } from 'cloudflare:workers';
import { batchIngestEvents } from '../lib/tinybird';
import { generateUniqueId } from '../utils/id-generator';

// ============================================================================
// Constants
// ============================================================================

const BATCH_SIZE_THRESHOLD = 50; // Flush after 50 events
const TIME_THRESHOLD_MS = 30000; // Flush after 30 seconds
const SESSION_CLEANUP_DELAY_MS = 60000; // Cleanup DO 1 minute after session expires

// ============================================================================
// EventTracker Durable Object
// ============================================================================

export class EventTrackerDurableObject extends DurableObject<Env> {
	private sql: SqlStorage;
	private currentSession: DOSessionState | null = null;
	private flushTimer: number | null = null;

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
				created_at INTEGER NOT NULL
			);

			-- Create index for efficient querying
			CREATE INDEX IF NOT EXISTS idx_event_buffer_sequence ON event_buffer(sequence_number);
		`);

		// Load existing session state if it exists
		await this.loadSessionFromStorage();
	}

	// ============================================================================
	// Session State Management
	// ============================================================================

	private async loadSessionFromStorage(): Promise<void> {
		const sessionRow = this.sql.exec('SELECT * FROM session_state WHERE id = 1').toArray()[0] as
			| Record<string, unknown>
			| undefined;

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
		const eventRows = this.sql.exec('SELECT event_data FROM event_buffer ORDER BY sequence_number').toArray() as Array<{
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

	async initSession(data: unknown): Promise<{ success: boolean; session_id?: string; session_data?: DOSessionState; error?: string }> {
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
				environment: 'production', // TODO: Get from request context
				campaignEnvironment: 'production',
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
				error: error instanceof Error ? error.message : 'Failed to initialize session',
			};
		}
	}

	async trackEvent(data: unknown): Promise<{ success: boolean; event_sequence?: number; events_in_buffer?: number; flushed_to_tinybird?: boolean; error?: string }> {
		try {
			const eventRequest = trackEventRequestSchema.parse(data);

			if (!this.currentSession || this.currentSession.sessionId !== eventRequest.session_id) {
				return {
					success: false,
					error: 'Session not found or mismatched',
				};
			}

			// Check session expiry
			if (await this.checkSessionExpiry()) {
				return {
					success: false,
					error: 'Session expired',
				};
			}

			// Update last activity
			this.currentSession.lastActivity = Date.now();

			// Increment event sequence
			this.currentSession.eventSequence += 1;

			// Create complete event data
			const eventId = generateUniqueId();
			const eventData: EventData = {
				timestamp: new Date().toISOString(),
				id: eventId,
				event_id: eventId,
				event_value: eventRequest.event_value || '',
				event_value_type: eventRequest.event_value_type || 'static',
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
				page_url: eventRequest.page_url || '',
				referrer_url: eventRequest.referrer_url,
			};

			// Validate complete event data
			eventDataSchema.parse(eventData);

			// Add to buffer
			this.currentSession.eventBuffer.push(eventData);

			// Store in database
			await this.ctx.storage.transaction(async () => {
				this.sql.exec(
					'INSERT INTO event_buffer (event_id, event_data, sequence_number, created_at) VALUES (?, ?, ?, ?)',
					eventId,
					JSON.stringify(eventData),
					this.currentSession!.eventSequence,
					Date.now(),
				);
			});

			await this.saveSessionToStorage();

			// Check if we should flush
			const shouldFlush = this.currentSession.eventBuffer.length >= BATCH_SIZE_THRESHOLD || !this.flushTimer;

			let flushedToTinybird = false;
			if (shouldFlush) {
				flushedToTinybird = await this.flushEventsToTinybird();
			} else {
				// Schedule flush if not already scheduled
				this.scheduleFlush();
			}

			return {
				success: true,
				event_sequence: this.currentSession.eventSequence,
				events_in_buffer: this.currentSession.eventBuffer.length,
				flushed_to_tinybird: flushedToTinybird,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to track event',
			};
		}
	}

	async validateSession(sessionId: string): Promise<{ success: boolean; session?: DOSessionState; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: 'Session not found',
			};
		}

		const isExpired = await this.checkSessionExpiry();
		if (isExpired) {
			return {
				success: false,
				error: 'Session expired',
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

	async getSession(sessionId: string): Promise<{ success: boolean; session?: DOSessionState; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: 'Session not found',
			};
		}

		return {
			success: true,
			session: this.currentSession,
		};
	}

	async flushEvents(sessionId: string): Promise<{ success: boolean; flushed_events?: boolean; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: 'Session not found',
			};
		}

		const flushed = await this.flushEventsToTinybird();
		return {
			success: true,
			flushed_events: flushed,
		};
	}

	async expireSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
		if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
			return {
				success: false,
				error: 'Session not found',
			};
		}

		// Flush remaining events first
		await this.flushEventsToTinybird();

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

		const expiryTime = this.currentSession.lastActivity + this.currentSession.sessionTimeout * 60 * 1000;

		await this.ctx.storage.setAlarm(expiryTime);
	}

	// ============================================================================
	// Event Buffer Management
	// ============================================================================

	private scheduleFlush(): void {
		if (this.flushTimer) return; // Already scheduled

		this.flushTimer = setTimeout(async () => {
			await this.flushEventsToTinybird();
			this.flushTimer = null;
		}, TIME_THRESHOLD_MS) as unknown as number;
	}

	private async flushEventsToTinybird(): Promise<boolean> {
		if (!this.currentSession || this.currentSession.eventBuffer.length === 0) {
			return false;
		}

		try {
			// Send events to Tinybird
			const events = [...this.currentSession.eventBuffer];
			const result = await batchIngestEvents(events, this.env);

			console.log(`Flushed ${events.length} events to Tinybird:`, {
				successful: result.successful_rows,
				quarantined: result.quarantined_rows,
				session_id: this.currentSession.sessionId,
			});

			// Clear buffer on successful flush
			if (result.successful_rows > 0) {
				this.currentSession.eventBuffer = [];

				// Clear event buffer from storage
				await this.ctx.storage.transaction(async () => {
					this.sql.exec('DELETE FROM event_buffer');
				});

				await this.saveSessionToStorage();
			}

			// Clear flush timer
			if (this.flushTimer) {
				clearTimeout(this.flushTimer);
				this.flushTimer = null;
			}

			return result.successful_rows > 0;
		} catch (error) {
			console.error('Failed to flush events to Tinybird:', error);
			return false;
		}
	}

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
				// This is cleanup alarm - flush remaining events and cleanup
				await this.flushEventsToTinybird();

				// Clear all storage for this DO
				await this.ctx.storage.deleteAll();
				this.currentSession = null;

				console.log('EventTracker DO cleaned up after session expiry');
			}
		} catch (error) {
			console.error('EventTracker alarm error:', error);
		}
	}
}

export default EventTrackerDurableObject;

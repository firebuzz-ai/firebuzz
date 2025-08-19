import type { ABTest, ABTestVariant } from '../types/campaign';

// ============================================================================
// Types
// ============================================================================

interface VariantStats {
	variantId: string;
	visitors: number;
	conversions: number;
	conversionRate: number;
}

interface TestState {
	testId: string;
	status: 'draft' | 'running' | 'completed' | 'paused';
	startedAt: number;
	endedAt?: number;
	winner?: string;
	completionReason?: 'duration' | 'sample_size' | 'manual' | 'statistical_significance';
	totalVisitors: number;
	config: string; // JSON stringified ABTest
}

interface VisitorAssignment {
	visitorId: string;
	variantId: string;
	assignedAt: number;
	converted: boolean;
}

// ============================================================================
// Durable Object Implementation
// ============================================================================

export class ABTestDurableObject implements DurableObject {
	private state: DurableObjectState;
	private sql: SqlStorage;

	constructor(state: DurableObjectState, _env: unknown) {
		this.state = state;
		this.sql = state.storage.sql;

		// Initialize database schema on first use
		this.state.blockConcurrencyWhile(async () => {
			await this.initializeSchema();
		});
	}

	// ============================================================================
	// Database Schema
	// ============================================================================

	private async initializeSchema() {
		// Create tables if they don't exist
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS test_state (
				id INTEGER PRIMARY KEY,
				test_id TEXT NOT NULL,
				status TEXT NOT NULL,
				started_at INTEGER NOT NULL,
				ended_at INTEGER,
				winner TEXT,
				completion_reason TEXT,
				total_visitors INTEGER DEFAULT 0,
				config TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS variant_stats (
				variant_id TEXT PRIMARY KEY,
				visitors INTEGER DEFAULT 0,
				conversions INTEGER DEFAULT 0,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS visitor_assignments (
				visitor_id TEXT PRIMARY KEY,
				variant_id TEXT NOT NULL,
				assigned_at INTEGER NOT NULL,
				converted INTEGER DEFAULT 0,
				converted_at INTEGER
			);

			CREATE INDEX IF NOT EXISTS idx_assignments_variant 
			ON visitor_assignments(variant_id);

			CREATE INDEX IF NOT EXISTS idx_assignments_converted 
			ON visitor_assignments(converted);
		`);
	}

	// ============================================================================
	// HTTP Request Handler
	// ============================================================================

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const method = request.method;

		try {
			// Route based on path and method
			if (method === 'POST' && url.pathname === '/initialize') {
				return await this.handleInitialize(request);
			}
			
			if (method === 'GET' && url.pathname === '/assign-variant') {
				return await this.handleAssignVariant(request);
			}
			
			if (method === 'POST' && url.pathname === '/record-conversion') {
				return await this.handleRecordConversion(request);
			}
			
			if (method === 'GET' && url.pathname === '/stats') {
				return await this.handleGetStats();
			}
			
			if (method === 'POST' && url.pathname === '/complete') {
				return await this.handleCompleteTest(request);
			}
			
			if (method === 'POST' && url.pathname === '/pause') {
				return await this.handlePauseTest();
			}
			
			if (method === 'POST' && url.pathname === '/resume') {
				return await this.handleResumeTest();
			}

			return new Response('Not found', { status: 404 });
		} catch (error) {
			console.error('AB Test DO error:', error);
			return new Response('Internal error', { status: 500 });
		}
	}

	// ============================================================================
	// Test Initialization
	// ============================================================================

	private async handleInitialize(request: Request): Promise<Response> {
		const { config, duration }: { config: ABTest; duration?: number } = await request.json();

		// Check if already initialized
		const existingCursor = this.sql.exec(
			"SELECT * FROM test_state LIMIT 1"
		);
		const existingRows = [...existingCursor];
		const existing = existingRows[0] as unknown as TestState | undefined;

		if (existing) {
			return Response.json({ 
				success: false, 
				error: 'Test already initialized' 
			}, { status: 400 });
		}

		// Initialize test state
		const now = Date.now();
		this.sql.exec(
			`INSERT INTO test_state (
				id, test_id, status, started_at, total_visitors, 
				config, updated_at
			) VALUES (1, ?, ?, ?, 0, ?, ?)`,
			config.id, 
			config.status || 'running',
			now,
			JSON.stringify(config),
			now
		);

		// Initialize variant stats
		for (const variant of config.variants) {
			this.sql.exec(
				"INSERT INTO variant_stats (variant_id, visitors, conversions, updated_at) VALUES (?, 0, 0, ?)",
				variant.id,
				now
			);
		}

		// Set alarm for test duration if specified
		if (duration && duration > 0) {
			const alarmTime = now + duration;
			await this.state.storage.setAlarm(alarmTime);
		}

		return Response.json({ 
			success: true, 
			testId: config.id,
			status: config.status 
		});
	}

	// ============================================================================
	// Variant Assignment
	// ============================================================================

	private async handleAssignVariant(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const visitorId = url.searchParams.get('visitorId');

		if (!visitorId) {
			return Response.json({ 
				error: 'Visitor ID required' 
			}, { status: 400 });
		}

		// Check test status
		const testStateCursor = this.sql.exec(
			"SELECT * FROM test_state LIMIT 1"
		);
		const testStateRows = [...testStateCursor];
		const testState = testStateRows[0] as unknown as TestState | undefined;

		if (!testState || testState.status !== 'running') {
			// Return control variant if test is not running
			const configStr = testState?.config || '{}';
			const config: ABTest = JSON.parse(configStr);
			const controlVariant = config.variants?.find(v => v.isControl);
			return Response.json({ 
				variantId: controlVariant?.id || null,
				isControl: true,
				testStatus: testState?.status || 'not_initialized'
			});
		}

		// Check if visitor already has assignment
		const existingCursor = this.sql.exec(
			"SELECT * FROM visitor_assignments WHERE visitor_id = ?",
			visitorId
		);
		const existingRows = [...existingCursor];
		const existing = existingRows[0] as unknown as VisitorAssignment | undefined;

		if (existing) {
			return Response.json({ 
				variantId: existing.variantId,
				isNew: false 
			});
		}

		// Assign new visitor to variant
		const config: ABTest = JSON.parse(testState.config);
		const variant = this.selectVariant(config);

		if (!variant) {
			return Response.json({ 
				error: 'No variants available' 
			}, { status: 500 });
		}

		const now = Date.now();

		// Record assignment
		this.sql.exec(
			"INSERT INTO visitor_assignments (visitor_id, variant_id, assigned_at, converted) VALUES (?, ?, ?, 0)",
			visitorId,
			variant.id,
			now
		);

		// Update variant stats
		this.sql.exec(
			"UPDATE variant_stats SET visitors = visitors + 1, updated_at = ? WHERE variant_id = ?",
			now,
			variant.id
		);

		// Update total visitors
		this.sql.exec(
			"UPDATE test_state SET total_visitors = total_visitors + 1, updated_at = ? WHERE id = 1",
			now
		);

		// Check if we should complete test based on sample size
		await this.checkSampleSizeCompletion(config);

		return Response.json({ 
			variantId: variant.id,
			isNew: true,
			landingPageId: variant.landingPageId
		});
	}

	// ============================================================================
	// Variant Selection Logic
	// ============================================================================

	private selectVariant(config: ABTest): ABTestVariant | null {
		const { variants, poolingPercent = 100 } = config;

		if (!variants || variants.length === 0) {
			return null;
		}

		// Check if visitor should be in the test pool
		const inPool = Math.random() * 100 < poolingPercent;
		if (!inPool) {
			// Return control variant for visitors outside the pool
			return variants.find(v => v.isControl) || variants[0];
		}

		// Select variant based on traffic allocation
		const random = Math.random() * 100;
		let cumulative = 0;

		for (const variant of variants) {
			cumulative += variant.trafficAllocation;
			if (random < cumulative) {
				return variant;
			}
		}

		// Fallback to last variant if allocations don't sum to 100
		return variants[variants.length - 1];
	}

	// ============================================================================
	// Conversion Tracking
	// ============================================================================

	private async handleRecordConversion(request: Request): Promise<Response> {
		const { visitorId }: { visitorId: string } = await request.json();

		if (!visitorId) {
			return Response.json({ 
				error: 'Visitor ID required' 
			}, { status: 400 });
		}

		// Get visitor assignment
		const assignmentCursor = this.sql.exec(
			"SELECT * FROM visitor_assignments WHERE visitor_id = ?",
			visitorId
		);
		const assignmentRows = [...assignmentCursor];
		const assignment = assignmentRows[0] as unknown as VisitorAssignment | undefined;

		if (!assignment) {
			return Response.json({ 
				error: 'Visitor not found in test' 
			}, { status: 404 });
		}

		if (assignment.converted) {
			return Response.json({ 
				success: false,
				message: 'Conversion already recorded' 
			});
		}

		const now = Date.now();

		// Update visitor assignment
		this.sql.exec(
			"UPDATE visitor_assignments SET converted = 1, converted_at = ? WHERE visitor_id = ?",
			now,
			visitorId
		);

		// Update variant stats
		this.sql.exec(
			"UPDATE variant_stats SET conversions = conversions + 1, updated_at = ? WHERE variant_id = ?",
			now,
			assignment.variantId
		);

		// Check for statistical significance
		await this.checkStatisticalSignificance();

		return Response.json({ 
			success: true,
			variantId: assignment.variantId 
		});
	}

	// ============================================================================
	// Statistics and Reporting
	// ============================================================================

	private async handleGetStats(): Promise<Response> {
		const testStateCursor = this.sql.exec(
			"SELECT * FROM test_state LIMIT 1"
		);
		const testStateRows = [...testStateCursor];
		const testState = testStateRows[0] as unknown as TestState | undefined;

		if (!testState) {
			return Response.json({ 
				error: 'Test not initialized' 
			}, { status: 404 });
		}

		const variantStatsCursor = this.sql.exec(
			"SELECT variant_id as variantId, visitors, conversions, CASE WHEN visitors > 0 THEN CAST(conversions AS REAL) / visitors * 100 ELSE 0 END as conversionRate FROM variant_stats"
		);
		const variantStats = [...variantStatsCursor] as unknown as VariantStats[];

		const config: ABTest = JSON.parse(testState.config);

		return Response.json({
			testId: testState.testId,
			status: testState.status,
			startedAt: testState.startedAt,
			endedAt: testState.endedAt,
			totalVisitors: testState.totalVisitors,
			winner: testState.winner,
			completionReason: testState.completionReason,
			variants: variantStats.map((stats: VariantStats) => {
				const variant = config.variants.find(v => v.id === stats.variantId);
				return {
					...stats,
					name: variant?.name,
					isControl: variant?.isControl,
					trafficAllocation: variant?.trafficAllocation
				};
			})
		});
	}

	// ============================================================================
	// Test Completion
	// ============================================================================

	private async handleCompleteTest(request: Request): Promise<Response> {
		const body = await request.json() as { reason?: string; winnerId?: string };
		const { reason = 'manual', winnerId } = body;

		const testStateCursor = this.sql.exec(
			"SELECT * FROM test_state LIMIT 1"
		);
		const testStateRows = [...testStateCursor];
		const testState = testStateRows[0] as unknown as TestState | undefined;

		if (!testState || testState.status === 'completed') {
			return Response.json({ 
				error: 'Test not running or already completed' 
			}, { status: 400 });
		}

		// Determine winner if not specified
		let winner: string | undefined = winnerId;
		if (!winner) {
			winner = await this.determineWinner();
		}

		const now = Date.now();

		// Update test state
		this.sql.exec(
			"UPDATE test_state SET status = 'completed', ended_at = ?, winner = ?, completion_reason = ?, updated_at = ? WHERE id = 1",
			now,
			winner,
			reason,
			now
		);

		// Cancel any pending alarms
		await this.state.storage.deleteAlarm();

		return Response.json({ 
			success: true,
			winner,
			reason 
		});
	}

	// ============================================================================
	// Test Control
	// ============================================================================

	private async handlePauseTest(): Promise<Response> {
		this.sql.exec(
			"UPDATE test_state SET status = 'paused', updated_at = ? WHERE id = 1 AND status = 'running'",
			Date.now()
		);

		return Response.json({ success: true });
	}

	private async handleResumeTest(): Promise<Response> {
		this.sql.exec(
			"UPDATE test_state SET status = 'running', updated_at = ? WHERE id = 1 AND status = 'paused'",
			Date.now()
		);

		return Response.json({ success: true });
	}

	// ============================================================================
	// Alarm Handler
	// ============================================================================

	async alarm(): Promise<void> {
		// Complete test due to duration
		await this.handleCompleteTest(
			new Request('http://internal/complete', {
				method: 'POST',
				body: JSON.stringify({ reason: 'duration' })
			})
		);
	}

	// ============================================================================
	// Statistical Analysis
	// ============================================================================

	private async determineWinner(): Promise<string | undefined> {
		const variantStatsCursor = this.sql.exec(
			"SELECT variant_id as variantId, visitors, conversions, CASE WHEN visitors > 0 THEN CAST(conversions AS REAL) / visitors ELSE 0 END as conversionRate FROM variant_stats ORDER BY conversionRate DESC"
		);
		const variantStats = [...variantStatsCursor] as unknown as VariantStats[];

		if (variantStats.length === 0) {
			return undefined;
		}

		// Simple winner: highest conversion rate with minimum sample size
		const MIN_SAMPLE_SIZE = 100;
		const winner = variantStats.find((v: VariantStats) => v.visitors >= MIN_SAMPLE_SIZE);

		return winner?.variantId || undefined;
	}

	private async checkStatisticalSignificance(): Promise<boolean> {
		// Simplified statistical significance check
		// In production, implement proper statistical tests (e.g., Chi-square, Bayesian)
		
		const variantStatsCursor = this.sql.exec(
			"SELECT variant_id as variantId, visitors, conversions, CASE WHEN visitors > 0 THEN CAST(conversions AS REAL) / visitors ELSE 0 END as conversionRate FROM variant_stats WHERE visitors >= 100"
		);
		const variantStats = [...variantStatsCursor] as unknown as VariantStats[];

		if (variantStats.length < 2) {
			return false;
		}

		// Check if we have enough data for significance
		const control = variantStats.find((v: VariantStats) => v.variantId.includes('control')) || variantStats[0];
		const challenger = variantStats.find((v: VariantStats) => v.variantId !== control.variantId);

		if (!challenger) {
			return false;
		}

		// Simple confidence check (95% confidence)
		const diff = Math.abs(control.conversionRate - challenger.conversionRate);
		const threshold = 0.05; // 5% difference threshold

		if (diff > threshold && control.visitors >= 500 && challenger.visitors >= 500) {
			// Auto-complete test with statistical significance
			const winner = control.conversionRate > challenger.conversionRate 
				? control.variantId 
				: challenger.variantId;

			await this.handleCompleteTest(
				new Request('http://internal/complete', {
					method: 'POST',
					body: JSON.stringify({ 
						reason: 'statistical_significance',
						winnerId: winner 
					})
				})
			);

			return true;
		}

		return false;
	}

	private async checkSampleSizeCompletion(_config: ABTest): Promise<void> {
		const TARGET_SAMPLE_SIZE = 1000; // Configure based on requirements

		const testStateCursor = this.sql.exec(
			"SELECT total_visitors FROM test_state LIMIT 1"
		);
		const testStateRows = [...testStateCursor];
		const testState = testStateRows[0] as unknown as { totalVisitors: number } | undefined;

		if (testState && testState.totalVisitors >= TARGET_SAMPLE_SIZE) {
			await this.handleCompleteTest(
				new Request('http://internal/complete', {
					method: 'POST',
					body: JSON.stringify({ reason: 'sample_size' })
				})
			);
		}
	}
}

// ============================================================================
// Export Configuration
// ============================================================================

export default ABTestDurableObject;
import { DurableObject } from 'cloudflare:workers';
import type { CleanedABTest as ABTest } from '@firebuzz/shared-types/campaign';

// ============================================================================
// Types
// ============================================================================

export interface Test {
	test_id: string;
	campaign_id: string;
	config_json: string;
	status: 'running' | 'paused' | 'completed' | 'draft';
	end_date: string;
	duration_days: number;
	target_sample_size: number;
	total_visitors: number;
}

export interface Variant {
	variant_id: string;
	traffic_allocation: number;
	visitors: number;
	created_at: number;
}

export interface VariantStats {
	variantId: string;
	visitors: number;
	allocatedPercentage: number;
}

export interface TestStats {
	totalVisitors: number;
	variantStats: VariantStats[];
	startedAt: number;
	completedAt?: number;
	completionReason?: 'duration' | 'sample_size' | 'manual';
	winner?: string;
}

// ============================================================================
// Simplified RPC Durable Object - Only manages test state and statistics
// ============================================================================

export class ABTestDurableObject extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = this.ctx.storage.sql;

		// Initialize database schema on first use
		this.ctx.blockConcurrencyWhile(async () => {
			await this.initializeSchema();
		});
	}

	// ============================================================================
	// Database Schema (Simplified - no visitor tracking)
	// ============================================================================

	private async initializeSchema(): Promise<void> {
		// Create tables if they don't exist
		this.sql.exec(`
			-- Configuration table (single row)
			CREATE TABLE IF NOT EXISTS test_config (
				id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
				test_id TEXT NOT NULL,
				campaign_id TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'running',
				end_date TEXT NOT NULL,
				duration_days INTEGER NOT NULL,
				target_sample_size INTEGER,
				total_visitors INTEGER DEFAULT 0,
				config_json TEXT NOT NULL,
				CONSTRAINT single_row CHECK (id = 1)
			);

			-- Variant statistics
			CREATE TABLE IF NOT EXISTS variants (
				variant_id TEXT PRIMARY KEY,
				traffic_allocation REAL NOT NULL,
				visitors INTEGER DEFAULT 0,
				created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
			);
		`);
	}

	// ============================================================================
	// RPC Methods
	// ============================================================================

	/**
	 * Check if the AB test is initialized
	 */
	async isInitialized(): Promise<boolean> {
		const existing = this.sql.exec('SELECT COUNT(*) as count FROM test_config').toArray()[0] as
			| { count: number }
			| undefined;

		return Boolean(existing && existing.count > 0);
	}

	/**
	 * Initialize the AB test with configuration
	 */
	async initialize(config: ABTest, campaignId: string): Promise<{ success: boolean; error?: string }> {
		const now = Date.now();
		const endDateISO = config.endDate
			? config.endDate
			: new Date(now + config.completionCriteria.testDuration * 60 * 1000).toISOString();

		// Insert configuration and variants inside a storage transaction
		await this.ctx.storage.transaction(async () => {
			// Insert test configuration
			this.sql.exec(
				`INSERT INTO test_config (
					test_id, campaign_id, config_json, status,
					end_date, duration_days, target_sample_size
				) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				config.id,
				campaignId,
				JSON.stringify(config),
				config.status,
				endDateISO,
				config.completionCriteria.testDuration || null,
				config.completionCriteria.sampleSizePerVariant || null,
			);

			// Insert variant configurations
			for (const variant of config.variants) {
				this.sql.exec(
					'INSERT INTO variants (variant_id, traffic_allocation, visitors) VALUES (?, ?, 0)',
					variant.id,
					variant.trafficAllocation,
				);
			}
		});

		// Set alarm for test duration
		const endTime = new Date(endDateISO).getTime();
		await this.ctx.storage.setAlarm(endTime);

		return { success: true };
	}

	/**
	 * Get the current configuration of the AB test
	 */
	async getJsonConfig(): Promise<ABTest> {
		const config = this.sql.exec('SELECT config_json FROM test_config WHERE id = 1').toArray()[0] as
			| { config_json: string }
			| undefined;

		if (!config) {
			throw new Error('Test not initialized');
		}

		return JSON.parse(config.config_json) as ABTest;
	}

	/**
	 * Update the AB test configuration (variants, traffic allocation, etc.)
	 */
	async sync(latestConfig: ABTest): Promise<{ success: boolean; error?: string }> {
		// Check if test exists
		const testData = this.getTestData();

		if (!testData) {
			return { success: false, error: 'Test not found' };
		}

		const currentStatus = testData.status;
		const latestStatus = latestConfig.status;

		// Pause Test
		if (currentStatus === 'running' && latestStatus === 'paused') {
			await this.pauseTest();
		}

		// Resume Test
		if (currentStatus === 'paused' && latestStatus === 'running' && latestConfig.endDate) {
			await this.resumeTest(latestConfig.endDate);
		}

		// Complete Test
		if (latestStatus === 'completed') {
			await this.completeTest('manual');
		}

		// Check if there is a change (compare traffic allocation, number of variants, etc.)
		const hasConfigurationChanged = await this.hasConfigurationChanged(latestConfig);
		if (hasConfigurationChanged) {
			await this.recreateVariants(latestConfig);
		}

		return { success: true };
	}

	/**
	 * Select a variant based on traffic allocation weights and real pageview data to maintain proper allocation.
	 * Uses intelligent balancing to ensure actual traffic matches intended allocation percentages.
	 * Selection and counting happens inside the Durable Object to ensure consistency.
	 */
	async selectVariant(): Promise<{
		variantId: string;
		trafficAllocation: number;
	}> {
		let selectedVariantId = '';
		let selectedTraffic = 0;
		let shouldComplete = false;

		await this.ctx.storage.transaction(async () => {
			// Ensure test is running
			const statusRow = this.sql.exec('SELECT status FROM test_config WHERE id = 1').toArray()[0] as
				| { status: string }
				| undefined;
			if (!statusRow || statusRow.status !== 'running') {
				throw new Error('Test is not running');
			}

			// Get variants with current visitor counts
			const variants = this.sql
				.exec('SELECT variant_id, traffic_allocation, visitors FROM variants ORDER BY variant_id')
				.toArray() as Array<{
				variant_id: string;
				traffic_allocation: number;
				visitors: number;
			}>;
			if (variants.length === 0) {
				throw new Error('No variants configured');
			}

			// Get total visitors to calculate current allocation percentages
			const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);

			// Calculate which variant is most underrepresented based on real data
			let selectedVariant = variants[0];
			let maxDeficit = Number.NEGATIVE_INFINITY;

			for (const variant of variants) {
				// Calculate current allocation percentage vs intended percentage
				const currentPercentage = totalVisitors > 0 ? (variant.visitors / totalVisitors) * 100 : 0;
				const intendedPercentage = variant.traffic_allocation;

				// Calculate deficit (positive means underrepresented)
				const deficit = intendedPercentage - currentPercentage;

				// For very low visitor counts, use weighted random selection to avoid bias
				// Once we have enough data (>50 visitors), prioritize balancing
				if (totalVisitors < 50) {
					// Early stage: Use weighted random with slight bias toward underrepresented variants
					const random = Math.random() * 100;
					let cumulative = 0;

					for (const v of variants) {
						const vCurrentPercentage = totalVisitors > 0 ? (v.visitors / totalVisitors) * 100 : 0;
						const vDeficit = v.traffic_allocation - vCurrentPercentage;
						const vAdjustedWeight = v.traffic_allocation + vDeficit * 0.5;
						cumulative += vAdjustedWeight;

						if (random < cumulative) {
							selectedVariant = v;
							break;
						}
					}
				} else {
					// Mature stage: Prioritize the most underrepresented variant
					if (deficit > maxDeficit) {
						maxDeficit = deficit;
						selectedVariant = variant;
					}
				}
			}

			selectedVariantId = selectedVariant.variant_id;
			selectedTraffic = selectedVariant.traffic_allocation;

			// Read current totals for sample-size completion check
			const totals = this.sql
				.exec('SELECT target_sample_size, total_visitors FROM test_config WHERE id = 1')
				.toArray()[0] as { target_sample_size: number | null; total_visitors: number } | undefined;
			if (!totals) {
				throw new Error('Test not initialized');
			}

			// Increment counters
			this.sql.exec('UPDATE variants SET visitors = visitors + 1 WHERE variant_id = ?', selectedVariantId);
			this.sql.exec('UPDATE test_config SET total_visitors = total_visitors + 1 WHERE id = 1');

			const newTotal = totals.total_visitors + 1;
			if (totals.target_sample_size && newTotal >= totals.target_sample_size) {
				shouldComplete = true;
			}
		});

		if (shouldComplete) {
			await this.completeTestInternal('sample_size');
		}

		return { variantId: selectedVariantId, trafficAllocation: selectedTraffic };
	}

	/**
	 * Complete the AB test
	 */
	async completeTest(reason: 'duration' | 'sample_size' | 'manual' = 'manual'): Promise<void> {
		await this.completeTestInternal(reason);
	}

	/**
	 * Get current test data
	 */
	private getTestData(): Test | null {
		const data = this.sql.exec('SELECT * FROM test_config WHERE id = 1').toArray()[0] as unknown as Test;

		return data || null;
	}
	private getVariantsData(): Variant[] | null {
		const data = this.sql.exec('SELECT * FROM variants').toArray() as unknown as Variant[];
		return data || null;
	}

	/**
	 * Internal method to complete test
	 */
	private async completeTestInternal(reason: 'duration' | 'sample_size' | 'manual'): Promise<void> {
		// Check if already completed
		const status = this.sql.exec('SELECT status FROM test_config WHERE id = 1').toArray()[0] as
			| { status: string }
			| undefined;

		if (!status || status.status === 'completed') {
			return; // Already completed or not initialized
		}

		// Update test configuration
		this.sql.exec(
			`UPDATE test_config
			SET status = 'completed'
			WHERE id = 1`,
		);

		if (reason === 'duration' || reason === 'sample_size') {
			// TODO: Notify Convex backend about test completion
			// This would typically be done via an API call or webhook
		}

		// Cancel any pending alarms
		await this.ctx.storage.deleteAlarm();

		// Clean up storage
		await this.ctx.storage.deleteAll();
	}

	/**
	 * Pause the AB test
	 */
	async pauseTest(): Promise<void> {
		const result = this.sql.exec("UPDATE test_config SET status = 'paused' WHERE id = 1 AND status = 'running'");

		if (result.rowsWritten === 0) {
			throw new Error('Test is not running or not initialized');
		}

		// Cancel the alarm
		await this.ctx.storage.deleteAlarm();
	}

	/**
	 * Resume the AB test with a new end date
	 */
	async resumeTest(newEndDate: string): Promise<void> {
		const result = this.sql.exec(
			"UPDATE test_config SET status = 'running', end_date = ? WHERE id = 1 AND status = 'paused'",
			newEndDate,
		);

		if (result.rowsWritten === 0) {
			throw new Error('Test is not paused or not initialized');
		}

		// Set new alarm
		const endTime = new Date(newEndDate).getTime();
		await this.ctx.storage.setAlarm(endTime);
	}

	/**
	 * Check if variants configuration has changed (traffic allocation, number of variants, etc.)
	 */
	private async hasConfigurationChanged(newConfig: ABTest): Promise<boolean> {
		try {
			const currentConfig = await this.getJsonConfig();

			// Create comparison objects with only variant-related fields
			const currentVariants = currentConfig.variants
				.map((v) => ({
					id: v.id,
					trafficAllocation: v.trafficAllocation,
				}))
				.sort((a, b) => a.id.localeCompare(b.id));

			const newVariants = newConfig.variants
				.map((v) => ({
					id: v.id,
					trafficAllocation: v.trafficAllocation,
				}))
				.sort((a, b) => a.id.localeCompare(b.id));

			// Compare JSON strings for deep equality
			return JSON.stringify(currentVariants) !== JSON.stringify(newVariants);
		} catch (error) {
			// If we can't get current config, assume it has changed
			console.error('Error getting current config', error);
			return true;
		}
	}

	/**
	 * Remove all variants and insert new ones from the updated configuration
	 */
	private async recreateVariants(newConfig: ABTest): Promise<void> {
		await this.ctx.storage.transaction(async () => {
			// Remove all existing variants
			this.sql.exec('DELETE FROM variants');

			// Insert new variant configurations
			for (const variant of newConfig.variants) {
				this.sql.exec(
					'INSERT INTO variants (variant_id, traffic_allocation, visitors) VALUES (?, ?, 0)',
					variant.id,
					variant.trafficAllocation,
				);
			}

			// Update the stored configuration JSON
			this.sql.exec('UPDATE test_config SET config_json = ? WHERE id = 1', JSON.stringify(newConfig));
		});
	}

	/**
	 * Get current test statistics with allocation analysis
	 */
	async getStats(): Promise<{
		test: Test | null;
		variants: Variant[] | null;
		allocationAnalysis?: {
			totalVisitors: number;
			variantAnalysis: Array<{
				variantId: string;
				intendedPercentage: number;
				actualPercentage: number;
				deficit: number;
				visitors: number;
			}>;
		};
	}> {
		// Get test configuration
		const test = this.getTestData();
		const variants = this.getVariantsData();

		let allocationAnalysis:
			| {
					totalVisitors: number;
					variantAnalysis: Array<{
						variantId: string;
						intendedPercentage: number;
						actualPercentage: number;
						deficit: number;
						visitors: number;
					}>;
			  }
			| undefined;
		if (variants && variants.length > 0) {
			const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);

			const variantAnalysis = variants.map((variant) => {
				const actualPercentage = totalVisitors > 0 ? (variant.visitors / totalVisitors) * 100 : 0;
				const intendedPercentage = variant.traffic_allocation;
				const deficit = intendedPercentage - actualPercentage;

				return {
					variantId: variant.variant_id,
					intendedPercentage,
					actualPercentage: Math.round(actualPercentage * 100) / 100, // Round to 2 decimals
					deficit: Math.round(deficit * 100) / 100, // Round to 2 decimals
					visitors: variant.visitors,
				};
			});

			allocationAnalysis = {
				totalVisitors,
				variantAnalysis,
			};
		}

		return {
			test,
			variants,
			allocationAnalysis,
		};
	}

	// ============================================================================
	// Alarm Handler
	// ============================================================================

	async alarm(): Promise<void> {
		// Complete test due to duration expiry
		await this.completeTestInternal('duration');
	}
}

export default ABTestDurableObject;

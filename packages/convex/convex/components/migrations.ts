import { Migrations } from "@convex-dev/migrations";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { aggregateCurrentPeriodAdditions } from "./aggregates";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const backfillTransactionsMigration = migrations.define({
	table: "transactions",
	batchSize: 100,
	migrateOne: async (ctx, doc) => {
		/* await aggregateCreditsBalance.insertIfDoesNotExist(ctx, doc);
    await aggregateCurrentPeriodUsage.insertIfDoesNotExist(ctx, doc); */
		await aggregateCurrentPeriodAdditions.insertIfDoesNotExist(ctx, doc);
	},
});

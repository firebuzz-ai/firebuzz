import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";

export const cascadePool = new Workpool(components.cascadeOperations, {
  maxParallelism: 100,
});

export const batchDeleteStoragePool = new Workpool(
  components.batchDeleteStorage,
  {
    maxParallelism: 50,
    retryActionsByDefault: true,
  }
);

---
allowed-tools: Bash(cd:*), Bash(pnpm exec tb*), Bash(pwd:*)
argument-hint: [local|prod|both]
description: Deploy Tinybird datasources and pipes to specified environment
---

## Context

Current directory: !`pwd`
Tinybird files status: !`cd packages/tinybird && find . -name "*.datasource" -o -name "*.pipe" | head -10`

## Task

Deploy Tinybird changes to the specified environment.

Arguments provided: $ARGUMENTS

Based on the argument:
- If "local" or no argument: Deploy to local Tinybird environment only
- If "prod" or "production": Deploy to production Tinybird environment only  
- If "both": Deploy to both local and production environments

Steps to follow:

1. First, navigate to the packages/tinybird directory
2. Check the deployment validity with --check flag
3. If validation passes, deploy with --wait --auto flags
4. For production deployments, use --cloud flag

Important notes:
- Always validate deployments before executing them
- Use --wait --auto for automatic promotion after successful deployment
- If schema changes are detected, ensure FORWARD_QUERY is present in datasources
- Report any errors clearly and suggest fixes if deployment fails

Deploy the Tinybird changes now based on the argument provided.
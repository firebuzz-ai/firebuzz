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
2. Check the deployment validity:
   - For local: `tb deploy --check`
   - For production: `tb --cloud deploy --check`
3. If validation passes, deploy:
   - For local: `tb deploy --wait --auto`
   - For production: `tb --cloud deploy --wait --auto`

Note: The --cloud flag is a global flag that must come BEFORE the deploy command, not after

Important notes:
- Always validate deployments before executing them using --check flag
- Use --wait --auto for automatic promotion after successful deployment
- If schema changes are detected, ensure FORWARD_QUERY is present in datasources with proper default values
- For new columns in schema, add them to FORWARD_QUERY using defaultValueOfTypeName() function
- Report any errors clearly and suggest fixes if deployment fails
- The deployment will show URLs for monitoring: local uses localhost:7181, cloud uses cloud.tinybird.co

Deploy the Tinybird changes now based on the argument provided.
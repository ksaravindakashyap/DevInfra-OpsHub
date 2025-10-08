# DevInfra OpsHub CLI

A command-line interface for DevInfra OpsHub operations.

## Installation

```bash
# Build the CLI
pnpm -w --filter @opshub/cli build

# Link globally
pnpm link -w

# Or install locally
pnpm -w --filter @opshub/cli install
```

## Configuration

The CLI stores configuration in `~/.opshubrc.json`:

```json
{
  "apiBaseUrl": "http://localhost:4000",
  "cookie": "your-auth-cookie"
}
```

## Commands

### Authentication

```bash
# Login with test user (requires ALLOW_TEST_LOGIN=1)
opshub login --email owner@demo.local
```

### Demo Mode

```bash
# Reset demo data
opshub demo reset

# Open demo PR
opshub demo open-pr

# Close demo PR
opshub demo close-pr

# Degrade health check
opshub demo degrade

# Recover health check
opshub demo recover
```

### Preview Deployments

```bash
# Open preview deployment
opshub preview open --repo owner/repo --pr 123 --branch feature/new-feature

# Close preview deployment
opshub preview close --repo owner/repo --pr 123
```

### Secret Management

```bash
# Rotate secrets for a project
opshub secrets rotate --project proj_123
```

### Health Checks

```bash
# Run health check manually
opshub health run --check check_123
```

### Analytics

```bash
# Send weekly digest
opshub digest weekly --project proj_123
```

## Options

- `--api <url>`: Override API base URL
- `--verbose`: Enable verbose logging

## Examples

```bash
# Complete demo workflow
opshub login --email owner@demo.local
opshub demo reset
opshub demo open-pr
opshub demo degrade
opshub demo recover
opshub demo close-pr

# Preview deployment workflow
opshub preview open --repo myorg/myapp --pr 42 --branch feature/auth
# ... wait for deployment ...
opshub preview close --repo myorg/myapp --pr 42

# Health monitoring
opshub health run --check check_abc123

# Secret rotation
opshub secrets rotate --project proj_xyz789
```

## Development

```bash
# Run in development mode
pnpm --filter @opshub/cli dev

# Build
pnpm --filter @opshub/cli build

# Clean
pnpm --filter @opshub/cli clean
```

# API Reference

This document provides comprehensive API documentation for DevInfra OpsHub.

## Base URL

- **Development**: `http://localhost:4000`
- **Production**: `https://api.opshub.dev`

## Authentication

All API endpoints require authentication via JWT token stored in an HttpOnly cookie.

### Login Flow

```bash
# 1. Initiate GitHub OAuth
GET /auth/github

# 2. GitHub redirects to callback
GET /auth/github/callback?code=...

# 3. API sets HttpOnly cookie
Set-Cookie: opshub_token=jwt_token; HttpOnly; Secure; SameSite=Lax
```

### Test Login (Development Only)

```bash
# Login as test user
POST /test/login-as
Content-Type: application/json

{
  "email": "owner@demo.local"
}
```

## Endpoints

### Authentication

#### `GET /auth/github`
Initiates GitHub OAuth flow.

**Response:**
```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?..."
}
```

#### `GET /auth/github/callback`
GitHub OAuth callback handler.

**Query Parameters:**
- `code` (string): Authorization code from GitHub
- `state` (string): OAuth state parameter

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### `POST /auth/logout`
Logs out the current user.

**Response:**
```json
{
  "success": true
}
```

### User Management

#### `GET /me`
Get current user information.

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "User Name",
  "avatarUrl": "https://avatars.githubusercontent.com/u/123?v=4",
  "organizations": [
    {
      "id": "org_123",
      "name": "Demo Org",
      "role": "OWNER"
    }
  ]
}
```

### Organizations

#### `GET /orgs`
List organizations for the current user.

**Response:**
```json
[
  {
    "id": "org_123",
    "name": "Demo Org",
    "slug": "demo-org",
    "description": "Demo organization",
    "role": "OWNER",
    "projects": [
      {
        "id": "proj_123",
        "name": "Frontend App",
        "repoFullName": "demo-org/frontend-app"
      }
    ]
  }
]
```

#### `POST /orgs`
Create a new organization.

**Request:**
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "description": "Organization description"
}
```

**Response:**
```json
{
  "id": "org_456",
  "name": "New Organization",
  "slug": "new-org",
  "description": "Organization description",
  "role": "OWNER"
}
```

### Projects

#### `GET /projects`
List projects for the current user.

**Response:**
```json
[
  {
    "id": "proj_123",
    "name": "Frontend App",
    "repoFullName": "demo-org/frontend-app",
    "description": "React frontend application",
    "organization": {
      "id": "org_123",
      "name": "Demo Org"
    },
    "providerConfig": {
      "provider": "VERCEL",
      "vercelProjectId": "proj_abc123"
    }
  }
]
```

#### `GET /projects/:id`
Get project details.

**Response:**
```json
{
  "id": "proj_123",
  "name": "Frontend App",
  "repoFullName": "demo-org/frontend-app",
  "description": "React frontend application",
  "organization": {
    "id": "org_123",
    "name": "Demo Org"
  },
  "providerConfig": {
    "provider": "VERCEL",
    "vercelProjectId": "proj_abc123"
  },
  "deployments": [
    {
      "id": "deploy_123",
      "prNumber": 42,
      "branch": "feature/new-feature",
      "status": "READY",
      "url": "https://pr-42-frontend-app.vercel.app",
      "createdAt": "2023-12-01T10:00:00Z"
    }
  ]
}
```

#### `POST /projects`
Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "repoFullName": "demo-org/new-project",
  "description": "Project description",
  "orgId": "org_123"
}
```

**Response:**
```json
{
  "id": "proj_456",
  "name": "New Project",
  "repoFullName": "demo-org/new-project",
  "description": "Project description",
  "organization": {
    "id": "org_123",
    "name": "Demo Org"
  }
}
```

### Provider Configuration

#### `GET /projects/:id/provider`
Get provider configuration.

**Response:**
```json
{
  "provider": "VERCEL",
  "vercelToken": "vrc_***",
  "vercelProjectId": "proj_abc123",
  "vercelTeamId": "team_123"
}
```

#### `PUT /projects/:id/provider`
Update provider configuration.

**Request:**
```json
{
  "provider": "VERCEL",
  "vercelToken": "vrc_new_token",
  "vercelProjectId": "proj_new_id"
}
```

**Response:**
```json
{
  "provider": "VERCEL",
  "vercelToken": "vrc_***",
  "vercelProjectId": "proj_new_id"
}
```

### Slack Configuration

#### `GET /projects/:id/slack`
Get Slack notification configuration.

**Response:**
```json
{
  "slackBotToken": "xoxb-***",
  "slackChannel": "C1234567890",
  "enabled": true
}
```

#### `PUT /projects/:id/slack`
Update Slack notification configuration.

**Request:**
```json
{
  "slackBotToken": "xoxb-new-token",
  "slackChannel": "C0987654321",
  "enabled": true
}
```

**Response:**
```json
{
  "slackBotToken": "xoxb-***",
  "slackChannel": "C0987654321",
  "enabled": true
}
```

### Webhooks

#### `POST /webhooks/github`
GitHub webhook handler for pull request events.

**Headers:**
- `X-Hub-Signature-256`: HMAC-SHA256 signature
- `Content-Type`: application/json

**Request:**
```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "number": 42,
    "head": {
      "ref": "feature/new-feature"
    },
    "merged": false
  },
  "repository": {
    "full_name": "demo-org/frontend-app"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

### Environments

#### `GET /projects/:id/environments`
List environments for a project.

**Response:**
```json
[
  {
    "id": "env_123",
    "type": "PREVIEW",
    "name": "Preview",
    "vars": [
      {
        "id": "var_123",
        "key": "API_BASE_URL",
        "value": "••••••••••••••••",
        "version": 1,
        "createdAt": "2023-12-01T10:00:00Z"
      }
    ]
  }
]
```

#### `GET /environments/:id/envvars`
List environment variables for an environment.

**Response:**
```json
[
  {
    "id": "var_123",
    "key": "API_BASE_URL",
    "value": "••••••••••••••••",
    "version": 1,
    "createdAt": "2023-12-01T10:00:00Z",
    "createdBy": {
      "id": "user_123",
      "name": "User Name"
    }
  }
]
```

#### `POST /environments/:id/envvars`
Create a new environment variable.

**Request:**
```json
{
  "key": "NEW_VARIABLE",
  "value": "secret_value",
  "meta": {
    "description": "New environment variable"
  }
}
```

**Response:**
```json
{
  "id": "var_456",
  "key": "NEW_VARIABLE",
  "value": "••••••••••••••••",
  "version": 1,
  "createdAt": "2023-12-01T10:00:00Z"
}
```

#### `PUT /environments/:id/envvars/:key`
Update an environment variable.

**Request:**
```json
{
  "value": "new_secret_value"
}
```

**Response:**
```json
{
  "id": "var_123",
  "key": "API_BASE_URL",
  "value": "••••••••••••••••",
  "version": 2,
  "createdAt": "2023-12-01T10:00:00Z",
  "updatedAt": "2023-12-01T11:00:00Z"
}
```

#### `GET /environments/:id/envvars/:key/versions`
Get version history for an environment variable.

**Response:**
```json
[
  {
    "id": "var_123",
    "key": "API_BASE_URL",
    "value": "••••••••••••••••",
    "version": 2,
    "createdAt": "2023-12-01T11:00:00Z"
  },
  {
    "id": "var_123",
    "key": "API_BASE_URL",
    "value": "••••••••••••••••",
    "version": 1,
    "createdAt": "2023-12-01T10:00:00Z"
  }
]
```

### Health Checks

#### `GET /projects/:id/health-checks`
List health checks for a project.

**Response:**
```json
[
  {
    "id": "check_123",
    "name": "API Health Check",
    "url": "https://api.example.com/health",
    "method": "GET",
    "intervalSec": 60,
    "timeoutMs": 5000,
    "enabled": true,
    "lastStatus": "OK",
    "lastLatencyMs": 150,
    "lastCheckedAt": "2023-12-01T10:00:00Z",
    "uptime": 99.5
  }
]
```

#### `POST /projects/:id/health-checks`
Create a new health check.

**Request:**
```json
{
  "name": "API Health Check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "intervalSec": 60,
  "timeoutMs": 5000,
  "failureThreshold": 3,
  "recoveryThreshold": 2,
  "alertCooldownMin": 30
}
```

**Response:**
```json
{
  "id": "check_456",
  "name": "API Health Check",
  "url": "https://api.example.com/health",
  "method": "GET",
  "intervalSec": 60,
  "timeoutMs": 5000,
  "enabled": true
}
```

#### `POST /health-checks/:id/run`
Run a health check manually.

**Response:**
```json
{
  "success": true,
  "message": "Health check executed"
}
```

#### `GET /health-checks/:id/samples`
Get health check samples for a time range.

**Query Parameters:**
- `from` (string): Start date (ISO 8601)
- `to` (string): End date (ISO 8601)

**Response:**
```json
[
  {
    "id": "sample_123",
    "statusCode": 200,
    "ok": true,
    "latencyMs": 150,
    "createdAt": "2023-12-01T10:00:00Z"
  }
]
```

### Analytics

#### `GET /projects/:id/metrics/deploy`
Get deployment metrics for a project.

**Query Parameters:**
- `from` (string): Start date (ISO 8601)
- `to` (string): End date (ISO 8601)
- `bucket` (string): Time bucket (default: "day")

**Response:**
```json
{
  "kpis": {
    "window": {
      "from": "2023-12-01T00:00:00Z",
      "to": "2023-12-07T23:59:59Z"
    },
    "createAttempts": 25,
    "createSuccess": 23,
    "createError": 2,
    "successRate": 0.92,
    "p50CreateMs": 4500,
    "p95CreateMs": 8500,
    "p99CreateMs": 12000,
    "meanCreateMs": 5200,
    "errorByReason": {
      "PROVIDER_TIMEOUT": 1,
      "PROVIDER_ERROR": 1
    }
  },
  "series": [
    {
      "day": "2023-12-01T00:00:00Z",
      "createAttempts": 5,
      "successRate": 0.8,
      "p95CreateMs": 7000,
      "errorByReason": {
        "PROVIDER_TIMEOUT": 1
      }
    }
  ]
}
```

#### `POST /projects/:id/metrics/deploy/weekly-digest`
Send weekly deployment digest to Slack.

**Response:**
```json
{
  "success": true,
  "message": "Weekly digest sent"
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

### Common Error Scenarios

#### Authentication Errors

```json
{
  "error": "UnauthorizedError",
  "message": "Authentication required",
  "statusCode": 401
}
```

#### Authorization Errors

```json
{
  "error": "ForbiddenError",
  "message": "Insufficient permissions",
  "statusCode": 403
}
```

#### Validation Errors

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 422,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes per IP
- **Webhook endpoints**: 50 requests per 15 minutes per IP
- **Authentication endpoints**: 20 requests per 15 minutes per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Initialize API client
const api = new OpsHubAPI({
  baseURL: 'https://api.opshub.dev',
  credentials: 'include' // Use cookies for authentication
});

// Get projects
const projects = await api.projects.list();

// Create environment variable
const envVar = await api.environments.createVariable('env_123', {
  key: 'API_KEY',
  value: 'secret_value'
});

// Run health check
await api.healthChecks.run('check_123');
```

### Python

```python
import requests

# Initialize session
session = requests.Session()
session.cookies.set('opshub_token', 'your-jwt-token')

# Get projects
response = session.get('https://api.opshub.dev/projects')
projects = response.json()

# Create environment variable
data = {
    'key': 'API_KEY',
    'value': 'secret_value'
}
response = session.post(
    'https://api.opshub.dev/environments/env_123/envvars',
    json=data
)
```

### cURL Examples

```bash
# Get current user
curl -H "Cookie: opshub_token=your-jwt-token" \
  https://api.opshub.dev/me

# Create project
curl -X POST \
  -H "Cookie: opshub_token=your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","repoFullName":"org/repo"}' \
  https://api.opshub.dev/projects

# Update provider config
curl -X PUT \
  -H "Cookie: opshub_token=your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"provider":"VERCEL","vercelToken":"vrc_token"}' \
  https://api.opshub.dev/projects/proj_123/provider
```

## Webhooks

### GitHub Webhook Configuration

1. **Webhook URL**: `https://api.opshub.dev/webhooks/github`
2. **Content Type**: `application/json`
3. **Secret**: Use `GITHUB_WEBHOOK_SECRET` environment variable
4. **Events**: Select "Pull requests"

### Webhook Payload Example

```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "number": 42,
    "head": {
      "ref": "feature/new-feature",
      "sha": "abc123def456"
    },
    "base": {
      "ref": "main",
      "sha": "def456ghi789"
    },
    "merged": false,
    "state": "open"
  },
  "repository": {
    "full_name": "demo-org/frontend-app",
    "name": "frontend-app",
    "owner": {
      "login": "demo-org"
    }
  }
}
```

---

For more examples and integration guides, see the [Demo Guide](DEMO.md).

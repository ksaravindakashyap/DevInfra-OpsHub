# Demo Guide

This guide provides step-by-step instructions for demonstrating DevInfra OpsHub capabilities.

## Prerequisites

- DevInfra OpsHub running locally or deployed
- GitHub repository with webhook configured
- Slack workspace (optional, for notifications)

## Quick Demo (5 minutes)

### 1. Login and Setup

```bash
# Start the application
pnpm dev

# Open browser
open http://localhost:3000
```

**Login Options:**
- **GitHub OAuth**: Click "Login with GitHub"
- **Test Login**: Use test endpoint for demo
  ```bash
  curl -X POST http://localhost:4000/test/login-as \
    -H "Content-Type: application/json" \
    -d '{"email": "owner@demo.local"}'
  ```

### 2. Create Organization and Project

1. **Create Organization**:
   - Click "Create Organization"
   - Name: "Demo Corp"
   - Slug: "demo-corp"
   - Description: "Demo organization"

2. **Create Project**:
   - Click "Create Project"
   - Name: "Demo App"
   - Repository: "demo-corp/demo-app"
   - Description: "Demo application"

### 3. Configure Provider

1. **Go to Project Settings**:
   - Navigate to your project
   - Click "Settings" tab

2. **Set Provider Configuration**:
   - Provider: "Vercel"
   - Vercel Token: `vrc_demo_token_123`
   - Vercel Project ID: `demo-project-123`

### 4. Add Environment Variables

1. **Go to Environments Tab**:
   - Click "Environments" tab
   - Select "Preview" environment

2. **Add Variables**:
   - Key: `API_BASE_URL`
   - Value: `https://api.demo.com`
   - Key: `SECRET_TOKEN`
   - Value: `demo-secret-token-12345`

3. **Create Rotation Policy**:
   - Pattern: `^SECRET_`
   - Rotate every: 30 days

### 5. Configure Health Monitoring

1. **Go to Health Tab**:
   - Click "Health" tab

2. **Create Health Check**:
   - Name: "API Health Check"
   - URL: `https://httpbin.org/status/200`
   - Method: GET
   - Interval: 60 seconds
   - Timeout: 5 seconds

3. **Run Manual Check**:
   - Click "Run Now" button
   - Verify status shows "OK"

### 6. Simulate Pull Request

```bash
# Simulate PR opened webhook
pnpm demo:open --repo demo-corp/demo-app --pr 42 --branch feature/demo

# Check dashboard for new deployment
# Should see:
# - New preview deployment
# - Health check auto-created
# - Slack notification (if configured)
```

### 7. View Analytics

1. **Go to Analytics Tab**:
   - Click "Analytics" tab
   - View deployment metrics
   - Check success rates and performance

2. **Close Pull Request**:
   ```bash
   pnpm demo:close --repo demo-corp/demo-app --pr 42
   ```

## Advanced Demo Scenarios

### Scenario 1: Multi-Environment Setup

**Objective**: Demonstrate environment-specific configurations

**Steps**:
1. Create Preview, Staging, and Production environments
2. Add different environment variables for each
3. Show environment-specific health checks
4. Demonstrate environment variable rotation

**Key Points**:
- Environment isolation
- Secret management
- Rotation policies

### Scenario 2: Health Monitoring

**Objective**: Demonstrate health check capabilities

**Steps**:
1. Create multiple health checks
2. Simulate service degradation
3. Show alert cooldown and recovery
4. Demonstrate health check analytics

**Key Points**:
- State machine (OK/DEGRADED)
- Alert throttling
- Recovery detection

### Scenario 3: Deploy Analytics

**Objective**: Demonstrate analytics and reporting

**Steps**:
1. Generate multiple deployments
2. Show success rate trends
3. Demonstrate error taxonomy
4. Show weekly digest

**Key Points**:
- Performance metrics
- Error classification
- Trend analysis

## Demo Scripts

### Seed Demo Data

```bash
# Seed comprehensive demo data
pnpm demo:seed

# This creates:
# - Multiple users with different roles
# - Organizations and projects
# - Environment variables
# - Health checks
# - Historical deployment data
```

### Simulate PR Lifecycle

```bash
# Open PR
pnpm demo:open --repo demo-org/frontend-app --pr 123 --branch feature/new-feature

# Wait for deployment to complete
sleep 30

# Close PR
pnpm demo:close --repo demo-org/frontend-app --pr 123
```

### Generate Screenshots

```bash
# Generate automated screenshots
pnpm demo:screens

# Screenshots saved to docs/screenshots/
```

## Demo Checklist

### Pre-Demo Setup

- [ ] Application running and accessible
- [ ] Demo data seeded
- [ ] GitHub webhook configured
- [ ] Slack notifications configured (optional)
- [ ] Test user accounts available

### Demo Flow

- [ ] Login and authentication
- [ ] Organization and project creation
- [ ] Provider configuration
- [ ] Environment variable management
- [ ] Health check setup
- [ ] PR simulation and deployment
- [ ] Analytics and monitoring
- [ ] Cleanup and teardown

### Post-Demo

- [ ] Clean up demo data
- [ ] Reset environment
- [ ] Document any issues
- [ ] Gather feedback

## Troubleshooting

### Common Issues

**Login Problems**:
```bash
# Check authentication
curl -H "Cookie: opshub_token=your-token" http://localhost:4000/me

# Reset test login
curl -X POST http://localhost:4000/test/login-as \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@demo.local"}'
```

**Deployment Issues**:
```bash
# Check queue status
redis-cli llen "bull:preview-queue:waiting"

# Check provider configuration
curl -H "Cookie: opshub_token=your-token" \
  http://localhost:4000/projects/proj_123/provider
```

**Health Check Issues**:
```bash
# Test health check endpoint
curl -I https://httpbin.org/status/200

# Check health check status
curl -H "Cookie: opshub_token=your-token" \
  http://localhost:4000/projects/proj_123/health-checks
```

### Demo Environment Reset

```bash
# Reset database
pnpm --filter @opshub/api prisma db push --force-reset

# Reseed demo data
pnpm --filter @opshub/api prisma db seed

# Clear Redis cache
redis-cli flushall
```

## Demo Assets

### Screenshots

Automated screenshots are generated in `docs/screenshots/`:

- `01-dashboard.png` - Main dashboard
- `02-org.png` - Organization view
- `03-settings.png` - Project settings
- `04-envs.png` - Environment variables
- `05-health.png` - Health monitoring
- `06-analytics.png` - Deploy analytics
- `07-deployments.png` - Deployment history

### Sample Data

Demo data includes:

- **Users**: 4 users with different roles
- **Organizations**: 2 organizations
- **Projects**: 3 projects with different configurations
- **Environments**: Preview, Staging, Production
- **Variables**: Encrypted environment variables
- **Health Checks**: Automated health monitoring
- **Deployments**: Historical deployment data
- **Analytics**: Performance metrics and trends

## Best Practices

### Demo Preparation

1. **Test Everything**: Verify all features work before demo
2. **Prepare Scripts**: Have demo scripts ready
3. **Backup Data**: Keep clean demo data available
4. **Practice Flow**: Rehearse the demo flow
5. **Prepare Questions**: Anticipate audience questions

### During Demo

1. **Start Simple**: Begin with basic features
2. **Show Value**: Highlight business benefits
3. **Interactive**: Engage audience with questions
4. **Real Examples**: Use realistic scenarios
5. **Handle Issues**: Be prepared for problems

### Post-Demo

1. **Gather Feedback**: Collect audience feedback
2. **Document Issues**: Note any problems
3. **Follow Up**: Provide additional resources
4. **Iterate**: Improve demo based on feedback

## Demo Variations

### Technical Audience

- Focus on architecture and implementation
- Show code examples and configurations
- Demonstrate scalability and performance
- Highlight security and compliance features

### Business Audience

- Focus on business value and ROI
- Show time savings and efficiency gains
- Demonstrate cost reduction and optimization
- Highlight competitive advantages

### Mixed Audience

- Balance technical and business aspects
- Use real-world scenarios
- Show end-to-end workflows
- Demonstrate team collaboration features

---

For additional demo resources or questions, contact demo@opshub.dev.

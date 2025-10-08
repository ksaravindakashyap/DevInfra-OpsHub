# Operations

This document provides operational guidance for running DevInfra OpsHub in production environments.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-jwt-secret-here` |
| `ENCRYPTION_KEY_BASE64` | 32-byte base64 encryption key | `dGhpc2lzMzJieXRlc2VjcmV0a2V5dGhpc2lzMzJieXRl` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | `Iv1.8a61f9b3a7aba766` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | `your-github-client-secret` |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret | `your-webhook-secret` |

### Optional Variables

| Variable | Description | Default | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `API_BASE_URL` | API base URL | `http://localhost:4000` | `https://api.opshub.dev` |
| `WEB_BASE_URL` | Web app base URL | `http://localhost:3000` | `https://opshub.dev` |
| `LOG_LEVEL` | Logging level | `info` | `warn` |
| `ALLOW_TEST_LOGIN` | Enable test login | `0` | `0` |
| `DISABLE_SLACK` | Disable Slack notifications | `0` | `0` |
| `USE_MOCK_PROVIDER` | Use mock provider | `0` | `0` |

### Provider-Specific Variables

#### Vercel
| Variable | Description |
|----------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_PROJECT_ID` | Vercel project ID |

#### Netlify
| Variable | Description |
|----------|-------------|
| `NETLIFY_TOKEN` | Netlify API token |
| `NETLIFY_SITE_ID` | Netlify site ID |

#### Slack
| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack bot token |
| `SLACK_CHANNEL` | Slack channel ID |

## Database Management

### PostgreSQL Setup

**Connection Requirements:**
- PostgreSQL 15+
- SSL/TLS encryption
- Connection pooling (recommended: 20 connections)
- Regular backups

**Database Initialization:**
```bash
# Run migrations
pnpm --filter @opshub/api prisma migrate deploy

# Generate Prisma client
pnpm --filter @opshub/api prisma generate

# Seed initial data
pnpm --filter @opshub/api prisma db seed
```

**Backup Strategy:**
```bash
# Daily backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20231201.sql
```

### Redis Setup

**Configuration:**
- Redis 7+
- Memory limit: 512MB (adjust based on usage)
- Persistence: RDB + AOF
- Max connections: 100

**Monitoring:**
```bash
# Check Redis status
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## Monitoring & Alerting

### Health Checks

**API Health Endpoint:**
```bash
curl http://localhost:4000/healthz
# Expected: {"ok": true}
```

**Database Health:**
```bash
# Check database connection
pnpm --filter @opshub/api prisma db execute --stdin <<< "SELECT 1"
```

**Redis Health:**
```bash
# Check Redis connection
redis-cli ping
# Expected: PONG
```

### Metrics Collection

**Application Metrics:**
- Response time (P50, P95, P99)
- Error rate
- Request throughput
- Queue job processing time

**Business Metrics:**
- Deployment success rate
- Preview creation time
- Health check uptime
- User activity

**Infrastructure Metrics:**
- CPU usage
- Memory consumption
- Disk I/O
- Network traffic

### Logging

**Log Levels:**
- `DEBUG`: Detailed debugging information
- `INFO`: General application flow
- `WARN`: Warning conditions
- `ERROR`: Error conditions

**Log Format:**
```json
{
  "timestamp": "2023-12-01T10:00:00.000Z",
  "level": "info",
  "message": "Preview deployment created",
  "context": "DeploymentProcessor",
  "metadata": {
    "projectId": "proj_123",
    "prNumber": 42,
    "duration": 5000
  }
}
```

**Log Retention:**
- Application logs: 30 days
- Audit logs: 1 year
- Error logs: 90 days
- Access logs: 30 days

## Deployment

### Docker Deployment

**Production Docker Compose:**
```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      NODE_ENV: production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  web:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_BASE_URL: ${API_BASE_URL}
      NODE_ENV: production
    depends_on:
      - api
    restart: unless-stopped
```

### Kubernetes Deployment

**API Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opshub-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opshub-api
  template:
    metadata:
      labels:
        app: opshub-api
    spec:
      containers:
      - name: api
        image: opshub/api:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: opshub-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: opshub-secrets
              key: redis-url
```

## Runbooks

### Failed Preview Deployment

**Symptoms:**
- Preview deployment stuck in "BUILDING" status
- Error logs showing provider failures
- User reports missing preview URL

**Diagnosis:**
```bash
# Check deployment status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:4000/projects/{projectId}/deployments

# Check provider logs
docker logs opshub-api | grep "Provider"

# Check queue status
redis-cli llen "bull:preview-queue:waiting"
```

**Resolution:**
1. Check provider credentials and quotas
2. Verify repository access permissions
3. Retry deployment manually
4. Contact provider support if needed

### Degraded Health Check

**Symptoms:**
- Health check status shows "DEGRADED"
- Slack alerts for health issues
- High error rates in health samples

**Diagnosis:**
```bash
# Check health check status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:4000/projects/{projectId}/health-checks

# Check recent health samples
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:4000/health-checks/{checkId}/samples?from=2023-12-01&to=2023-12-02"

# Check target endpoint
curl -I https://target-endpoint.com/health
```

**Resolution:**
1. Verify target endpoint is accessible
2. Check network connectivity
3. Review health check configuration
4. Adjust thresholds if needed

### Slack Notification Issues

**Symptoms:**
- No Slack notifications received
- Slack API errors in logs
- Missing webhook configuration

**Diagnosis:**
```bash
# Check Slack configuration
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:4000/projects/{projectId}/notifications

# Test Slack API
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test

# Check notification logs
docker logs opshub-api | grep "Slack"
```

**Resolution:**
1. Verify Slack bot token and permissions
2. Check channel configuration
3. Test Slack API connectivity
4. Review notification settings

### Database Performance Issues

**Symptoms:**
- Slow API response times
- Database connection timeouts
- High CPU usage on database server

**Diagnosis:**
```bash
# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

**Resolution:**
1. Optimize slow queries
2. Add database indexes
3. Scale database resources
4. Implement connection pooling

## Maintenance

### Regular Tasks

**Daily:**
- Monitor system health and metrics
- Check error logs for issues
- Verify backup completion
- Review security alerts

**Weekly:**
- Update dependencies
- Review performance metrics
- Clean up old logs
- Test disaster recovery procedures

**Monthly:**
- Security updates and patches
- Database maintenance and optimization
- Capacity planning review
- Documentation updates

### Backup & Recovery

**Database Backup:**
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to cloud storage
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).sql.gz s3://opshub-backups/
```

**Recovery Procedure:**
```bash
# Download backup
aws s3 cp s3://opshub-backups/backup_20231201_120000.sql.gz .

# Decompress backup
gunzip backup_20231201_120000.sql.gz

# Restore database
psql $DATABASE_URL < backup_20231201_120000.sql
```

### Scaling

**Horizontal Scaling:**
- API servers: 2-10 instances
- Database: Read replicas for analytics
- Redis: Cluster mode for high availability
- Workers: Multiple worker instances

**Vertical Scaling:**
- API servers: 2-8 CPU cores, 4-16GB RAM
- Database: 4-16 CPU cores, 16-64GB RAM
- Redis: 2-8 CPU cores, 4-32GB RAM

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check database connectivity
telnet $DB_HOST $DB_PORT

# Verify credentials
psql $DATABASE_URL -c "SELECT 1;"
```

**Redis Connection Errors:**
```bash
# Check Redis connectivity
telnet $REDIS_HOST $REDIS_PORT

# Test Redis commands
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

**API Timeout Errors:**
```bash
# Check API health
curl -f http://localhost:4000/healthz

# Check API logs
docker logs opshub-api --tail 100
```

### Performance Tuning

**Database Optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_deploy_events_project_created ON deploy_events(project_id, created_at);
CREATE INDEX idx_health_samples_check_created ON health_samples(health_check_id, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM deploy_events WHERE project_id = 'proj_123';
```

**Redis Optimization:**
```bash
# Configure Redis memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor Redis performance
redis-cli --latency-history
```

## Security Operations

### Access Control

**User Management:**
- Regular access reviews
- Remove inactive users
- Audit admin privileges
- Monitor failed login attempts

**API Security:**
- Rate limiting configuration
- API key rotation
- Request validation
- Response sanitization

### Incident Response

**Security Incident Procedure:**
1. **Detection**: Monitor security alerts
2. **Assessment**: Evaluate impact and severity
3. **Containment**: Isolate affected systems
4. **Investigation**: Determine root cause
5. **Recovery**: Restore normal operations
6. **Post-Incident**: Document lessons learned

**Contact Information:**
- **On-Call**: ops-oncall@opshub.dev
- **Security**: security@opshub.dev
- **Escalation**: management@opshub.dev

---

For operational questions or issues, contact ops-oncall@opshub.dev.

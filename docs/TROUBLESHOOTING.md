# Troubleshooting

This guide helps resolve common issues when running DevInfra OpsHub.

## Quick Diagnostics

### Health Check

```bash
# Check API health
curl http://localhost:4000/healthz

# Expected: {"ok": true}
```

### Service Status

```bash
# Check all services
docker compose ps

# Check logs
docker compose logs api
docker compose logs web
```

## Common Issues

### Authentication Issues

#### Problem: "Authentication required" error

**Symptoms:**
- API returns 401 Unauthorized
- Login redirects fail
- JWT token invalid

**Diagnosis:**
```bash
# Check JWT secret
echo $JWT_SECRET

# Check cookie
curl -v http://localhost:4000/me

# Check GitHub OAuth config
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET
```

**Solutions:**

1. **Missing JWT Secret**:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   
   # Add to .env
   echo "JWT_SECRET=your-secret-here" >> .env
   ```

2. **GitHub OAuth Misconfiguration**:
   - Verify GitHub OAuth app settings
   - Check callback URL: `http://localhost:4000/auth/github/callback`
   - Ensure client ID and secret are correct

3. **Cookie Issues**:
   ```bash
   # Clear cookies and retry
   # Or use test login
   curl -X POST http://localhost:4000/test/login-as \
     -H "Content-Type: application/json" \
     -d '{"email": "owner@demo.local"}'
   ```

#### Problem: GitHub OAuth callback fails

**Symptoms:**
- Redirect to GitHub works
- Callback returns error
- User not logged in

**Solutions:**

1. **Check Callback URL**:
   - GitHub OAuth app callback: `http://localhost:4000/auth/github/callback`
   - Ensure URL matches exactly

2. **Check Environment Variables**:
   ```bash
   echo $GITHUB_CLIENT_ID
   echo $GITHUB_CLIENT_SECRET
   ```

3. **Check GitHub App Permissions**:
   - Ensure app has required scopes
   - Check organization access if needed

### Database Issues

#### Problem: Database connection failed

**Symptoms:**
- API fails to start
- Database connection errors
- Prisma errors

**Diagnosis:**
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database status
docker compose logs db
```

**Solutions:**

1. **Database Not Running**:
   ```bash
   # Start database
   docker compose up -d db
   
   # Wait for startup
   sleep 10
   ```

2. **Connection String Issues**:
   ```bash
   # Check DATABASE_URL format
   # Should be: postgresql://user:pass@host:port/db
   ```

3. **Database Permissions**:
   ```bash
   # Check user permissions
   psql $DATABASE_URL -c "SELECT current_user;"
   ```

#### Problem: Migration failures

**Symptoms:**
- Prisma migrate fails
- Schema out of sync
- Database errors

**Solutions:**

1. **Reset Database**:
   ```bash
   # Reset and migrate
   pnpm --filter @opshub/api prisma db push --force-reset
   pnpm --filter @opshub/api prisma db seed
   ```

2. **Manual Migration**:
   ```bash
   # Generate migration
   pnpm --filter @opshub/api prisma migrate dev
   
   # Apply migration
   pnpm --filter @opshub/api prisma migrate deploy
   ```

### Redis Issues

#### Problem: Redis connection failed

**Symptoms:**
- Queue jobs not processing
- Redis connection errors
- BullMQ failures

**Diagnosis:**
```bash
# Check Redis URL
echo $REDIS_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis logs
docker compose logs redis
```

**Solutions:**

1. **Redis Not Running**:
   ```bash
   # Start Redis
   docker compose up -d redis
   ```

2. **Connection Issues**:
   ```bash
   # Check Redis URL format
   # Should be: redis://host:port
   ```

3. **Memory Issues**:
   ```bash
   # Check Redis memory
   redis-cli info memory
   
   # Clear Redis if needed
   redis-cli flushall
   ```

### Provider Issues

#### Problem: Vercel deployment fails

**Symptoms:**
- Preview deployment stuck in "BUILDING"
- Vercel API errors
- Provider timeout

**Diagnosis:**
```bash
# Check provider config
curl -H "Cookie: opshub_token=your-token" \
  http://localhost:4000/projects/proj_123/provider

# Check Vercel token
echo $VERCEL_TOKEN

# Test Vercel API
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/user
```

**Solutions:**

1. **Invalid Vercel Token**:
   - Generate new token in Vercel dashboard
   - Update provider configuration

2. **Project Not Found**:
   - Verify Vercel project ID
   - Check project permissions

3. **Rate Limiting**:
   - Check Vercel API rate limits
   - Implement exponential backoff

#### Problem: Netlify deployment fails

**Symptoms:**
- Netlify API errors
- Site not created
- Build failures

**Solutions:**

1. **Invalid Netlify Token**:
   - Generate new token in Netlify dashboard
   - Update provider configuration

2. **Site Configuration**:
   - Verify Netlify site settings
   - Check build configuration

### Webhook Issues

#### Problem: GitHub webhook not working

**Symptoms:**
- PR events not processed
- Webhook signature verification fails
- 401/403 errors

**Diagnosis:**
```bash
# Check webhook secret
echo $GITHUB_WEBHOOK_SECRET

# Test webhook endpoint
curl -X POST http://localhost:4000/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"test": "data"}'
```

**Solutions:**

1. **Missing Webhook Secret**:
   ```bash
   # Generate webhook secret
   openssl rand -hex 32
   
   # Add to .env
   echo "GITHUB_WEBHOOK_SECRET=your-secret" >> .env
   ```

2. **Webhook Configuration**:
   - Verify webhook URL in GitHub
   - Check webhook events selected
   - Ensure secret matches

3. **Signature Verification**:
   - Check webhook signature algorithm
   - Verify payload format

### Health Check Issues

#### Problem: Health checks failing

**Symptoms:**
- Health checks show "DEGRADED"
- Timeout errors
- SSL certificate issues

**Diagnosis:**
```bash
# Test health check URL
curl -I https://httpbin.org/status/200

# Check health check config
curl -H "Cookie: opshub_token=your-token" \
  http://localhost:4000/projects/proj_123/health-checks
```

**Solutions:**

1. **URL Issues**:
   - Ensure URL is accessible
   - Check HTTPS requirement
   - Verify SSL certificates

2. **Timeout Issues**:
   - Increase timeout setting
   - Check network connectivity
   - Optimize target endpoint

3. **SSL Issues**:
   - Check SSL certificate validity
   - Update CA certificates
   - Use HTTP for testing (not recommended for production)

### Slack Issues

#### Problem: Slack notifications not working

**Symptoms:**
- No Slack messages received
- Slack API errors
- Bot token issues

**Diagnosis:**
```bash
# Check Slack config
curl -H "Cookie: opshub_token=your-token" \
  http://localhost:4000/projects/proj_123/slack

# Test Slack API
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

**Solutions:**

1. **Invalid Bot Token**:
   - Generate new bot token in Slack
   - Update Slack configuration

2. **Channel Issues**:
   - Verify channel ID
   - Check bot permissions
   - Ensure bot is in channel

3. **Rate Limiting**:
   - Check Slack API rate limits
   - Implement cooldown periods

### Performance Issues

#### Problem: Slow API responses

**Symptoms:**
- High response times
- Timeout errors
- High CPU usage

**Diagnosis:**
```bash
# Check API performance
curl -w "@curl-format.txt" http://localhost:4000/healthz

# Check database performance
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Check Redis performance
redis-cli --latency-history
```

**Solutions:**

1. **Database Optimization**:
   - Add database indexes
   - Optimize slow queries
   - Increase connection pool size

2. **Redis Optimization**:
   - Check Redis memory usage
   - Optimize Redis configuration
   - Clear old data

3. **Application Optimization**:
   - Check for memory leaks
   - Optimize database queries
   - Implement caching

### SSL/TLS Issues

#### Problem: SSL certificate errors

**Symptoms:**
- SSL handshake failures
- Certificate validation errors
- HTTPS connection issues

**Solutions:**

1. **Certificate Issues**:
   - Check certificate validity
   - Update CA certificates
   - Verify certificate chain

2. **TLS Configuration**:
   - Check TLS version support
   - Update TLS configuration
   - Test with different TLS versions

### Environment Issues

#### Problem: Environment variables not working

**Symptoms:**
- Variables not loaded
- Configuration errors
- Missing values

**Diagnosis:**
```bash
# Check environment variables
env | grep -E "(DATABASE|REDIS|JWT|GITHUB)"

# Check .env file
cat .env
```

**Solutions:**

1. **Missing Variables**:
   - Check .env file exists
   - Verify variable names
   - Restart application

2. **Variable Format**:
   - Check for quotes and spaces
   - Verify encoding
   - Test variable values

### Log Analysis

#### Common Log Patterns

**Database Connection Errors:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Start PostgreSQL service

**Redis Connection Errors:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis service

**Authentication Errors:**
```
Error: JWT token invalid
```
**Solution**: Check JWT secret and token

**Provider Errors:**
```
Error: Provider API timeout
```
**Solution**: Check provider credentials and API status

### Debug Mode

#### Enable Debug Logging

```bash
# Set debug log level
export LOG_LEVEL=debug

# Restart application
pnpm dev
```

#### Debug Specific Components

```bash
# Debug database
export DEBUG=prisma:*

# Debug Redis
export DEBUG=redis:*

# Debug authentication
export DEBUG=passport:*
```

### Recovery Procedures

#### Complete Reset

```bash
# Stop all services
docker compose down

# Remove volumes
docker compose down -v

# Start services
docker compose up -d

# Reset database
pnpm --filter @opshub/api prisma db push --force-reset

# Seed data
pnpm --filter @opshub/api prisma db seed
```

#### Partial Reset

```bash
# Reset specific service
docker compose restart api

# Clear Redis
redis-cli flushall

# Restart workers
docker compose restart api
```

## Getting Help

### Support Channels

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Documentation**: [Read the docs](https://docs.opshub.dev)
- **Community**: [Join our Discord](https://discord.gg/opshub)

### Reporting Issues

When reporting issues, include:

1. **Environment Information**:
   - OS and version
   - Node.js version
   - Docker version
   - Application version

2. **Error Details**:
   - Error messages
   - Stack traces
   - Log files
   - Screenshots

3. **Reproduction Steps**:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Workarounds

4. **Configuration**:
   - Environment variables (sanitized)
   - Configuration files
   - Network setup

### Contributing Fixes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your fix
5. Submit a pull request

---

For additional help, contact support@opshub.dev.

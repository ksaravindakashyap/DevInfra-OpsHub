# DevInfra OpsHub

A GitOps control plane for managing preview environments, built with TypeScript, NestJS, Next.js, and PostgreSQL.

## Features

- **GitHub OAuth Authentication** - Secure login with GitHub accounts
- **Role-Based Access Control (RBAC)** - Owner, Maintainer, Developer, Viewer roles
- **Organization Management** - Create and manage organizations
- **Project Management** - Link GitHub repositories to projects
- **Audit Logging** - Track all actions and changes
- **Webhook Support** - Handle GitHub webhook events

## Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL, Redis
- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis (for future BullMQ integration)
- **Authentication**: GitHub OAuth with JWT cookies
- **Monorepo**: pnpm workspaces with Turbo

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd DevInfra-OpsHub
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```
   
   Edit `.env` and add your credentials:
   ```env
   # Database credentials (for Docker Compose)
   POSTGRES_PASSWORD=your_secure_password_here
   
   # GitHub OAuth
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```
   
   **⚠️ Security Note**: Change the default PostgreSQL password in `docker-compose.override.yml` for production use.

3. **Generate encryption key:**
   ```bash
   openssl rand -base64 32
   ```
   Add the output to `ENCRYPTION_KEY_BASE64` in your `.env` file.

4. **Start the development environment:**
   ```bash
   pnpm setup
   pnpm dev
   ```

This will:
- Start PostgreSQL and Redis with Docker Compose
- Generate Prisma client
- Push database schema
- Seed with demo data
- Start both API (port 4000) and web (port 3000) servers

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - **Authorization callback URL**: `http://localhost:4000/auth/github/callback`
   - **Homepage URL**: `http://localhost:3000`
3. Copy the Client ID and Client Secret to your `.env` file

## Development

### Available Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Run ESLint on all code
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run tests
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Create and run database migrations
- `pnpm db:seed` - Seed database with demo data

### Project Structure

```
├── apps/
│   ├── api/                 # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/        # Authentication & RBAC
│   │   │   ├── users/       # User management
│   │   │   ├── orgs/        # Organization management
│   │   │   ├── projects/    # Project management
│   │   │   ├── audit/       # Audit logging
│   │   │   └── webhooks/    # Webhook handlers
│   │   └── prisma/          # Database schema & migrations
│   └── web/                 # Next.js web application
│       └── src/
│           ├── app/         # App Router pages
│           ├── components/  # React components
│           └── lib/         # Utilities & API client
├── packages/
│   └── types/               # Shared TypeScript types
└── docker-compose.yml       # PostgreSQL & Redis services
```

## API Endpoints

### Authentication
- `POST /auth/github` - Redirect to GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `POST /auth/logout` - Logout user

### User Management
- `GET /me` - Get current user profile

### Organizations
- `GET /orgs` - List user's organizations
- `POST /orgs` - Create new organization

### Projects
- `GET /projects/:id` - Get project details
- `POST /orgs/:orgId/projects` - Create project (requires MAINTAINER+ role)

### Webhooks
- `POST /webhooks/github` - GitHub webhook endpoint

## Database Schema

The application uses the following main entities:

- **User** - GitHub user information
- **Organization** - Groups of users and projects
- **OrgMember** - User membership in organizations with roles
- **Project** - GitHub repository links
- **WebhookEvent** - Incoming webhook events
- **AuditLog** - Action tracking and audit trail

## Role-Based Access Control

- **OWNER** - Full access to organization and all projects
- **MAINTAINER** - Can create projects and manage most settings
- **DEVELOPER** - Can view and work with projects
- **VIEWER** - Read-only access to projects

## Next Steps

This is Day 1-2 implementation. Future features will include:

- Environment management and secret rotation
- Preview deployment automation
- Health monitoring and alerting
- Slack notifications
- Advanced RBAC with project-level permissions
- OpenTelemetry observability

## Security Considerations

### Development Environment
- **Default credentials** are used for local development only
- **Change passwords** in `docker-compose.override.yml` for any shared environment
- **Never commit** `.env` or `docker-compose.override.yml` files

### Production Deployment
- Use **strong, unique passwords** for all services
- Enable **SSL/TLS** for database connections
- Use **secrets management** (e.g., Docker Secrets, Kubernetes Secrets)
- Regularly **rotate credentials** and API keys
- Monitor **audit logs** for suspicious activity

### Environment Variables
```bash
# Generate secure passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For GITHUB_WEBHOOK_SECRET
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

All rights reserved.

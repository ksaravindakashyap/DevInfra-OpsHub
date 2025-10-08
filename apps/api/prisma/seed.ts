import { PrismaClient, Role, EnvironmentType, Provider, DeployStage, DeployErrorReason, CheckStatus } from '@prisma/client';
import { EncryptionService } from '../src/crypto/encryption.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with rich demo data...');

  const encryptionService = new EncryptionService();

  // Create multiple users with different roles
  const users = [
    { email: 'owner@demo.local', name: 'Demo Owner', role: Role.OWNER },
    { email: 'maintainer@demo.local', name: 'Demo Maintainer', role: Role.MAINTAINER },
    { email: 'dev@demo.local', name: 'Demo Developer', role: Role.DEVELOPER },
    { email: 'viewer@demo.local', name: 'Demo Viewer', role: Role.VIEWER },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        githubId: `demo-${userData.email.split('@')[0]}`,
        email: userData.email,
        name: userData.name,
        avatarUrl: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000)}?v=4`,
      },
    });
    createdUsers.push({ ...user, role: userData.role });
  }

  console.log('✅ Created demo users');

  // Create multiple organizations
  const orgs = [
    { name: 'Demo Org', slug: 'demo-org', description: 'Main demo organization' },
    { name: 'Platform Org', slug: 'platform-org', description: 'Platform engineering team' },
  ];

  const createdOrgs = [];
  for (const orgData of orgs) {
    const org = await prisma.organization.upsert({
      where: { slug: orgData.slug },
      update: {},
      create: orgData,
    });
    createdOrgs.push(org);
  }

  console.log('✅ Created demo organizations');

  // Add users to organizations with different roles
  const memberships = [
    { userId: createdUsers[0].id, orgId: createdOrgs[0].id, role: Role.OWNER },
    { userId: createdUsers[1].id, orgId: createdOrgs[0].id, role: Role.MAINTAINER },
    { userId: createdUsers[2].id, orgId: createdOrgs[0].id, role: Role.DEVELOPER },
    { userId: createdUsers[3].id, orgId: createdOrgs[0].id, role: Role.VIEWER },
    { userId: createdUsers[0].id, orgId: createdOrgs[1].id, role: Role.OWNER },
    { userId: createdUsers[1].id, orgId: createdOrgs[1].id, role: Role.MAINTAINER },
  ];

  for (const membership of memberships) {
    await prisma.orgMember.upsert({
      where: {
        orgId_userId: {
          orgId: membership.orgId,
          userId: membership.userId,
        },
      },
      update: {},
      create: membership,
    });
  }

  console.log('✅ Created organization memberships');

  // Create projects for each organization
  const projects = [
    {
      name: 'Frontend App',
      repoFullName: 'demo-org/frontend-app',
      orgId: createdOrgs[0].id,
      description: 'React frontend application',
    },
    {
      name: 'Backend API',
      repoFullName: 'demo-org/backend-api',
      orgId: createdOrgs[0].id,
      description: 'Node.js backend API',
    },
    {
      name: 'Platform Service',
      repoFullName: 'platform-org/platform-service',
      orgId: createdOrgs[1].id,
      description: 'Core platform service',
    },
  ];

  const createdProjects = [];
  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { repoFullName: projectData.repoFullName },
      update: {},
      create: {
        name: projectData.name,
        repoFullName: projectData.repoFullName,
        orgId: projectData.orgId,
        description: projectData.description,
      },
    });
    createdProjects.push(project);
  }

  console.log('✅ Created demo projects');

  // Create provider configurations
  for (const project of createdProjects) {
    await prisma.providerConfig.upsert({
      where: { projectId: project.id },
      update: {},
      create: {
        projectId: project.id,
        provider: Provider.VERCEL,
        vercelToken: 'mock_vercel_token_for_testing',
        vercelProjectId: `mock-project-${project.id}`,
      },
    });
  }

  console.log('✅ Created provider configurations');

  // Create environments for each project
  for (const project of createdProjects) {
    const environments = [
      { type: EnvironmentType.PREVIEW, name: 'Preview' },
      { type: EnvironmentType.STAGING, name: 'Staging' },
      { type: EnvironmentType.PRODUCTION, name: 'Production' },
    ];

    for (const envData of environments) {
      await prisma.environment.upsert({
        where: {
          projectId_type: {
            projectId: project.id,
            type: envData.type,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          type: envData.type,
          name: envData.name,
        },
      });
    }
  }

  console.log('✅ Created environments');

  // Create environment variables with encryption
  for (const project of createdProjects) {
    const previewEnv = await prisma.environment.findUnique({
      where: {
        projectId_type: {
          projectId: project.id,
          type: EnvironmentType.PREVIEW,
        },
      },
    });

    if (previewEnv) {
      const envVars = [
        { key: 'API_BASE_URL', value: 'https://api.demo.com' },
        { key: 'SECRET_TOKEN', value: 'demo-secret-token-12345' },
        { key: 'DATABASE_URL', value: 'postgresql://demo:demo@localhost:5432/demo' },
      ];

      for (const envVar of envVars) {
        const encrypted = encryptionService.encryptString(envVar.value);
        
        await prisma.envVar.create({
          data: {
            environmentId: previewEnv.id,
            key: envVar.key,
            valueCiphertext: encrypted.ciphertext,
            valueIv: encrypted.iv,
            valueTag: encrypted.tag,
            createdById: createdUsers[0].id,
          },
        });
      }
    }
  }

  console.log('✅ Created encrypted environment variables');

  // Create secret rotation policies
  for (const project of createdProjects) {
    await prisma.secretPolicy.upsert({
      where: {
        projectId_keyPattern: {
          projectId: project.id,
          keyPattern: '^SECRET_',
        },
      },
      update: {},
      create: {
        projectId: project.id,
        keyPattern: '^SECRET_',
        rotateEveryDays: 30,
      },
    });
  }

  console.log('✅ Created secret rotation policies');

  // Create health checks
  for (const project of createdProjects) {
    const previewEnv = await prisma.environment.findUnique({
      where: {
        projectId_type: {
          projectId: project.id,
          type: EnvironmentType.PREVIEW,
        },
      },
    });

    if (previewEnv) {
      await prisma.healthCheck.create({
        data: {
          projectId: project.id,
          environmentId: previewEnv.id,
          name: `Health Check - ${project.name}`,
          url: 'https://httpbin.org/status/200',
          method: 'GET',
          intervalSec: 60,
          timeoutMs: 5000,
          failureThreshold: 3,
          recoveryThreshold: 2,
          alertCooldownMin: 30,
          enabled: true,
        },
      });
    }
  }

  console.log('✅ Created health checks');

  // Create preview deployments with mixed statuses
  const deploymentStatuses = ['READY', 'READY', 'ERROR'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const status = deploymentStatuses[i % deploymentStatuses.length];
    
    const deployment = await prisma.previewDeployment.create({
      data: {
        projectId: project.id,
        prNumber: 100 + i,
        branch: `feature/demo-${i}`,
        status: status as any,
        url: status === 'READY' ? `https://demo-${i}.vercel.app` : null,
        providerDeploymentId: `deploy-${i}`,
        metadata: { demo: true },
      },
    });

    // Create deploy events for each deployment
    const attemptId = `attempt-${i}-${Date.now()}`;
    
    // CREATE_REQUESTED
    await prisma.deployEvent.create({
      data: {
        projectId: project.id,
        prNumber: deployment.prNumber,
        branch: deployment.branch,
        provider: Provider.VERCEL,
        attemptId,
        stage: DeployStage.CREATE_REQUESTED,
        createdAt: new Date(Date.now() - 10000), // 10 seconds ago
      },
    });

    // CREATE_STARTED
    await prisma.deployEvent.create({
      data: {
        projectId: project.id,
        prNumber: deployment.prNumber,
        branch: deployment.branch,
        provider: Provider.VERCEL,
        attemptId,
        stage: DeployStage.CREATE_STARTED,
        createdAt: new Date(Date.now() - 9000), // 9 seconds ago
      },
    });

    if (status === 'READY') {
      // PROVIDER_BUILDING
      await prisma.deployEvent.create({
        data: {
          projectId: project.id,
          prNumber: deployment.prNumber,
          branch: deployment.branch,
          provider: Provider.VERCEL,
          attemptId,
          stage: DeployStage.PROVIDER_BUILDING,
          createdAt: new Date(Date.now() - 8000), // 8 seconds ago
        },
      });

      // READY
      await prisma.deployEvent.create({
        data: {
          projectId: project.id,
          prNumber: deployment.prNumber,
          branch: deployment.branch,
          provider: Provider.VERCEL,
          attemptId,
          stage: DeployStage.READY,
          durationMs: 5000 + Math.floor(Math.random() * 4000), // 5-9 seconds
          createdAt: new Date(Date.now() - 5000), // 5 seconds ago
        },
      });
    } else {
      // ERROR
      await prisma.deployEvent.create({
        data: {
          projectId: project.id,
          prNumber: deployment.prNumber,
          branch: deployment.branch,
          provider: Provider.VERCEL,
          attemptId,
          stage: DeployStage.ERROR,
          errorReason: DeployErrorReason.PROVIDER_TIMEOUT,
          message: 'Provider timeout during deployment',
          durationMs: 10000,
          createdAt: new Date(Date.now() - 5000), // 5 seconds ago
        },
      });
    }
  }

  console.log('✅ Created preview deployments and deploy events');

  // Create daily deploy stats for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setUTCHours(0, 0, 0, 0);

    for (const project of createdProjects) {
      const createAttempts = Math.floor(Math.random() * 10) + 5; // 5-14 attempts
      const createSuccess = Math.floor(createAttempts * (0.85 + Math.random() * 0.1)); // 85-95% success
      const createError = createAttempts - createSuccess;
      const successRate = createAttempts > 0 ? createSuccess / createAttempts : 0;

      const durations = Array.from({ length: createSuccess }, () => 
        3000 + Math.floor(Math.random() * 7000) // 3-10 seconds
      ).sort((a, b) => a - b);

      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
      const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
      const mean = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      const errorByReason = createError > 0 ? {
        [DeployErrorReason.PROVIDER_TIMEOUT]: Math.floor(createError * 0.6),
        [DeployErrorReason.PROVIDER_ERROR]: Math.floor(createError * 0.3),
        [DeployErrorReason.UNKNOWN]: Math.floor(createError * 0.1),
      } : {};

      await prisma.dailyDeployStat.upsert({
        where: {
          projectId_day: {
            projectId: project.id,
            day,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          day,
          createAttempts,
          createSuccess,
          createError,
          successRate,
          p50CreateMs: p50,
          p95CreateMs: p95,
          p99CreateMs: p99,
          meanCreateMs: mean,
          errorByReason,
        },
      });
    }
  }

  console.log('✅ Created daily deploy stats');

  // Create audit logs for key actions
  const auditActions = [
    { action: 'org.created', metadata: { name: 'Demo Org' } },
    { action: 'project.created', metadata: { name: 'Frontend App' } },
    { action: 'envvar.created', metadata: { key: 'API_BASE_URL' } },
    { action: 'healthcheck.created', metadata: { name: 'Health Check - Frontend App' } },
  ];

  for (const audit of auditActions) {
    await prisma.auditLog.create({
      data: {
        actorUserId: createdUsers[0].id,
        projectId: createdProjects[0].id,
        action: audit.action,
        metadataJson: audit.metadata,
      },
    });
  }

  console.log('✅ Created audit logs');

  console.log('🎉 Rich seed data created successfully!');
  console.log(`📊 Created ${createdUsers.length} users, ${createdOrgs.length} orgs, ${createdProjects.length} projects`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
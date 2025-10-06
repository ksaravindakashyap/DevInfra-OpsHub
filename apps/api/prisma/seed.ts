import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { githubId: 'demo-user-123' },
    update: {},
    create: {
      githubId: 'demo-user-123',
      email: 'demo@opshub.dev',
      name: 'Demo User',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Org',
      slug: 'demo-org',
    },
  });

  console.log('✅ Created demo organization:', demoOrg.name);

  // Add user as owner of demo org
  await prisma.orgMember.upsert({
    where: {
      orgId_userId: {
        orgId: demoOrg.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      userId: demoUser.id,
      role: Role.OWNER,
    },
  });

  console.log('✅ Added user as owner of demo org');

  // Create demo project
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      orgId: demoOrg.id,
      name: 'Hello World',
      repoFullName: 'octocat/Hello-World',
      defaultBranch: 'main',
    },
  });

  console.log('✅ Created demo project:', demoProject.name);

  // Create audit log entries
  await prisma.auditLog.create({
    data: {
      actorUserId: demoUser.id,
      orgId: demoOrg.id,
      action: 'ORG_CREATED',
      metadataJson: { name: demoOrg.name, slug: demoOrg.slug },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: demoUser.id,
      orgId: demoOrg.id,
      projectId: demoProject.id,
      action: 'PROJECT_CREATED',
      metadataJson: { 
        name: demoProject.name, 
        repoFullName: demoProject.repoFullName,
        defaultBranch: demoProject.defaultBranch 
      },
    },
  });

  console.log('✅ Created audit log entries');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

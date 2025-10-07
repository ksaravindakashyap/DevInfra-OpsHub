import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async processPullRequestEvent(payload: any) {
    const { action, pull_request, repository } = payload;
    const repoFullName = repository.full_name;
    const prNumber = pull_request.number;
    const branch = pull_request.head.ref;

    this.logger.log(`Processing PR ${action} for ${repoFullName}#${prNumber}`);

    // Find the project by repository name
    const project = await this.prisma.project.findFirst({
      where: { repoFullName },
    });

    if (!project) {
      this.logger.warn(`No project found for repository: ${repoFullName}`);
      return;
    }

    // Handle different PR actions
    switch (action) {
      case 'opened':
      case 'reopened':
      case 'synchronize':
        await this.queueService.enqueueCreatePreview({
          projectId: project.id,
          prNumber,
          branch,
        });
        break;

      case 'closed':
        if (pull_request.merged || pull_request.state === 'closed') {
          await this.queueService.enqueueTearDownPreview({
            projectId: project.id,
            prNumber,
          });
        }
        break;

      default:
        this.logger.debug(`Unhandled PR action: ${action}`);
    }
  }
}

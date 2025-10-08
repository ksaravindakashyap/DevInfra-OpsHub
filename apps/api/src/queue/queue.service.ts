import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface CreatePreviewJob {
  projectId: string;
  prNumber: number;
  branch: string;
}

export interface TearDownPreviewJob {
  projectId: string;
  prNumber: number;
}

export interface SlackNotifyJob {
  projectId: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface HealthProbeJob {
  healthCheckId: string;
  projectId: string;
  immediate?: boolean;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('preview-queue')
    private previewQueue: Queue,
  ) {}

  async enqueueCreatePreview(data: CreatePreviewJob) {
    await this.previewQueue.add('create-preview', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async enqueueTearDownPreview(data: TearDownPreviewJob) {
    await this.previewQueue.add('tear-down-preview', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async enqueueSlackNotification(data: SlackNotifyJob) {
    await this.previewQueue.add('slack-notify', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async enqueueHealthProbe(data: HealthProbeJob) {
    const jobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    if (data.immediate) {
      // Run immediately
      await this.previewQueue.add('health-probe', data, jobOptions);
    } else {
      // Register as repeatable job
      const repeatOptions = {
        every: 60000, // Default 60 seconds, will be overridden by intervalSec
        jobId: `health-probe-${data.healthCheckId}`,
      };
      
      await this.previewQueue.add('health-probe', data, {
        ...jobOptions,
        repeat: repeatOptions,
      });
    }
  }

  async removeHealthProbe(healthCheckId: string) {
    const jobId = `health-probe-${healthCheckId}`;
    await this.previewQueue.removeRepeatable('health-probe', { jobId });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface MockPreviewResult {
  deploymentId: string;
  url: string;
  metadata?: any;
}

@Injectable()
export class MockProvider {
  private readonly logger = new Logger(MockProvider.name);

  async createPreview(input: {
    repoFullName: string;
    branch: string;
    env?: Record<string, string>;
  }): Promise<MockPreviewResult> {
    const { repoFullName, branch, env } = input;
    
    // Simulate provider processing time (200-400ms)
    const delay = Math.random() * 200 + 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    const deploymentId = uuidv4();
    const timestamp = Date.now();
    const url = `https://mock.example/pr/${branch}/${timestamp}`;

    this.logger.log(`Mock preview created: ${url} for ${repoFullName}/${branch}`);

    return {
      deploymentId,
      url,
      metadata: {
        provider: 'mock',
        branch,
        env: env ? Object.keys(env).length : 0,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async destroyPreview(input: {
    deploymentId: string;
  }): Promise<void> {
    const { deploymentId } = input;
    
    // Simulate immediate teardown
    this.logger.log(`Mock preview destroyed: ${deploymentId}`);
    
    // No actual delay for teardown
    return Promise.resolve();
  }
}

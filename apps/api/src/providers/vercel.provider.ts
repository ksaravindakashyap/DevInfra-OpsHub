import { Injectable, Logger } from '@nestjs/common';
import { PreviewProvider, CreatePreviewInput, CreatePreviewResult } from './provider.interface';

@Injectable()
export class VercelProvider implements PreviewProvider {
  private readonly logger = new Logger(VercelProvider.name);
  private readonly apiBase = process.env.VERCEL_API_BASE || 'https://api.vercel.com';

  async createPreview(input: CreatePreviewInput & { vercelToken: string; vercelProjectId: string }): Promise<CreatePreviewResult> {
    const { repoFullName, branch, env = {}, vercelToken, vercelProjectId } = input;
    const [owner, repo] = repoFullName.split('/');

    this.logger.log(`Creating Vercel preview for ${repoFullName}#${branch}`);

    // Create deployment
    const deploymentResponse = await fetch(`${this.apiBase}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo,
        project: vercelProjectId,
        target: 'preview',
        gitSource: {
          type: 'github',
          repo: {
            owner,
            name: repo,
            ref: branch,
          },
        },
        env: Object.entries(env).map(([key, value]) => ({
          key,
          value,
          type: 'encrypted',
        })),
      }),
    });

    if (!deploymentResponse.ok) {
      const error = await deploymentResponse.text();
      throw new Error(`Vercel deployment failed: ${error}`);
    }

    const deployment = await deploymentResponse.json();
    const deploymentId = deployment.id;

    // Poll for completion
    const result = await this.pollDeploymentStatus(deploymentId, vercelToken);

    return {
      deploymentId,
      url: result.url,
      metadata: {
        vercelDeploymentId: deploymentId,
        state: result.state,
      },
    };
  }

  async destroyPreview(deploymentId: string, token: string): Promise<void> {
    this.logger.log(`Destroying Vercel deployment ${deploymentId}`);

    const response = await fetch(`${this.apiBase}/v13/deployments/${deploymentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to destroy Vercel deployment: ${error}`);
    }
  }

  private async pollDeploymentStatus(deploymentId: string, token: string): Promise<{ state: string; url?: string }> {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.apiBase}/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check deployment status: ${response.statusText}`);
      }

      const deployment = await response.json();
      const state = deployment.state;

      if (state === 'READY') {
        return {
          state,
          url: deployment.url,
        };
      }

      if (state === 'ERROR') {
        throw new Error(`Deployment failed: ${deployment.error?.message || 'Unknown error'}`);
      }

      // Wait before next attempt (exponential backoff)
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    throw new Error('Deployment timeout - status check exceeded maximum attempts');
  }
}

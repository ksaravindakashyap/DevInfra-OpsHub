import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeployStage, DeployErrorReason, Provider } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface DeployEventData {
  projectId: string;
  prNumber: number;
  branch: string;
  provider: Provider;
  attemptId: string;
  stage: DeployStage;
  errorReason?: DeployErrorReason;
  message?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: any;
}

@Injectable()
export class DeployEventsService {
  private readonly logger = new Logger(DeployEventsService.name);

  constructor(private prisma: PrismaService) {}

  async emit(eventData: DeployEventData): Promise<void> {
    try {
      // Truncate message to 250 characters
      const truncatedMessage = eventData.message 
        ? eventData.message.substring(0, 250)
        : null;

      await this.prisma.deployEvent.create({
        data: {
          projectId: eventData.projectId,
          prNumber: eventData.prNumber,
          branch: eventData.branch,
          provider: eventData.provider,
          attemptId: eventData.attemptId,
          stage: eventData.stage,
          errorReason: eventData.errorReason,
          message: truncatedMessage,
          statusCode: eventData.statusCode,
          durationMs: eventData.durationMs,
          metadata: eventData.metadata,
        },
      });

      this.logger.debug(`Emitted deploy event: ${eventData.stage} for attempt ${eventData.attemptId}`);
    } catch (error) {
      this.logger.error('Failed to emit deploy event', error);
    }
  }

  generateAttemptId(): string {
    return uuidv4();
  }

  mapErrorToReason(error: any): DeployErrorReason {
    if (!error) return DeployErrorReason.UNKNOWN;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.status || error.statusCode;

    // Check for specific error patterns
    if (errorMessage.includes('missing') && errorMessage.includes('config')) {
      return DeployErrorReason.MISSING_PROVIDER_CONFIG;
    }

    if (errorMessage.includes('timeout') || errorCode === 408) {
      return DeployErrorReason.PROVIDER_TIMEOUT;
    }

    if (errorCode >= 400 && errorCode < 500) {
      return DeployErrorReason.PROVIDER_ERROR;
    }

    if (errorCode >= 500) {
      return DeployErrorReason.PROVIDER_ERROR;
    }

    if (errorMessage.includes('webhook') || errorMessage.includes('ignored')) {
      return DeployErrorReason.WEBHOOK_IGNORED;
    }

    return DeployErrorReason.UNKNOWN;
  }

  async emitCreateRequested(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.CREATE_REQUESTED,
    });
  }

  async emitCreateStarted(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.CREATE_STARTED,
    });
  }

  async emitProviderBuilding(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string,
    metadata?: any
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.PROVIDER_BUILDING,
      metadata,
    });
  }

  async emitReady(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string,
    durationMs: number,
    metadata?: any
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.READY,
      durationMs,
      metadata,
    });
  }

  async emitError(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string,
    error: any,
    durationMs?: number
  ): Promise<void> {
    const errorReason = this.mapErrorToReason(error);
    const message = error.message || error.toString();

    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.ERROR,
      errorReason,
      message,
      statusCode: error.status || error.statusCode,
      durationMs,
    });
  }

  async emitTeardownRequested(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.TEARDOWN_REQUESTED,
    });
  }

  async emitTeardownDone(
    projectId: string,
    prNumber: number,
    branch: string,
    provider: Provider,
    attemptId: string,
    durationMs?: number
  ): Promise<void> {
    await this.emit({
      projectId,
      prNumber,
      branch,
      provider,
      attemptId,
      stage: DeployStage.TEARDOWN_DONE,
      durationMs,
    });
  }
}

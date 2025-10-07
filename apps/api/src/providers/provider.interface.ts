export interface CreatePreviewInput {
  repoFullName: string;
  branch: string;
  env?: Record<string, string>;
}

export interface CreatePreviewResult {
  deploymentId: string;
  url?: string;
  metadata?: any;
}

export interface PreviewProvider {
  createPreview(input: CreatePreviewInput): Promise<CreatePreviewResult>;
  destroyPreview(deploymentId: string): Promise<void>;
}

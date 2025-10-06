export interface User {
  id: string;
  githubId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  createdAt: Date;
}

export interface CreateOrgRequest {
  name: string;
}

export interface CreateProjectRequest {
  name: string;
  repoFullName: string;
  defaultBranch?: string;
}

export enum Role {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

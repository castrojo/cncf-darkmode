export interface PipelineProject {
  name: string;
  slug: string;
  logoUrl: string;
  maturity: string;
  category: string;
  subcategory: string;
  updatedAt: string;
  description?: string;
  homepageUrl?: string;
  repoUrl?: string;
  acceptedDate?: string;
  incubatingDate?: string;
  graduatedDate?: string;
  archivedDate?: string;
  stars?: number;
  forks?: number;
  contributors?: number;
  lastCommitDate?: string;
  lastReleaseDate?: string;
  firstCommitDate?: string;
  license?: string;
  primaryLanguage?: string;
  topics?: string[];
}

export interface PipelineMember {
  name: string;
  slug: string;
  logoUrl: string;
  tier: string;
  isEndUser: boolean;
  updatedAt: string;
  description?: string;
  homepageUrl?: string;
  joinedAt?: string;
  city?: string;
  country?: string;
  industries?: string[];
}

export interface PipelineArchitectureProject {
  name: string;
  logoUrl?: string;
  maturity?: string;
  usingSince?: string;
  description?: string;
}

export interface PipelineArchitecture {
  slug: string;
  title: string;
  orgName: string;
  orgLogoUrl: string;
  archUrl: string;
  submittedAt?: string;
  projects?: PipelineArchitectureProject[];
}

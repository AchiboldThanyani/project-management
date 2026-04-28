export interface VaultFolder {
  id: string;
  projectId: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VaultDocument {
  id: string;
  projectId: string;
  folderId?: string;
  title: string;
  createdById: string;
  createdByName: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VaultDocumentDetail extends VaultDocument {
  contentJson: string;
}

export interface VaultFile {
  id: string;
  projectId: string;
  folderId?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

export interface CreateVaultDocumentRequest {
  title: string;
  folderId?: string;
}

export interface UpdateVaultDocumentRequest {
  title: string;
  contentJson: string;
}

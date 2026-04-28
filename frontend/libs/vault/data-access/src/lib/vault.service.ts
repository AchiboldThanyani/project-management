import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  VaultFolder, VaultDocument, VaultDocumentDetail, VaultFile,
  CreateVaultDocumentRequest, UpdateVaultDocumentRequest
} from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class VaultService {
  constructor(private http: HttpClient) {}

  private base(projectId: string) {
    return `${environment.apiUrl}/projects/${projectId}/vault`;
  }

  // Folders
  getFolders(projectId: string) {
    return this.http.get<VaultFolder[]>(`${this.base(projectId)}/folders`);
  }
  createFolder(projectId: string, name: string) {
    return this.http.post<VaultFolder>(`${this.base(projectId)}/folders`, { name });
  }
  renameFolder(projectId: string, folderId: string, name: string) {
    return this.http.put<VaultFolder>(`${this.base(projectId)}/folders/${folderId}`, { name });
  }
  deleteFolder(projectId: string, folderId: string) {
    return this.http.delete(`${this.base(projectId)}/folders/${folderId}`);
  }

  // Documents
  getDocuments(projectId: string, folderId?: string) {
    const params = folderId ? `?folderId=${folderId}` : '';
    return this.http.get<VaultDocument[]>(`${this.base(projectId)}/documents${params}`);
  }
  getDocument(projectId: string, documentId: string) {
    return this.http.get<VaultDocumentDetail>(`${this.base(projectId)}/documents/${documentId}`);
  }
  createDocument(projectId: string, request: CreateVaultDocumentRequest) {
    return this.http.post<VaultDocument>(`${this.base(projectId)}/documents`, request);
  }
  updateDocument(projectId: string, documentId: string, request: UpdateVaultDocumentRequest) {
    return this.http.put<VaultDocumentDetail>(`${this.base(projectId)}/documents/${documentId}`, request);
  }
  deleteDocument(projectId: string, documentId: string) {
    return this.http.delete(`${this.base(projectId)}/documents/${documentId}`);
  }
  moveDocument(projectId: string, documentId: string, folderId: string | null) {
    return this.http.patch<VaultDocument>(`${this.base(projectId)}/documents/${documentId}/move`, { folderId });
  }

  // Files
  getFiles(projectId: string, folderId?: string) {
    const params = folderId ? `?folderId=${folderId}` : '';
    return this.http.get<VaultFile[]>(`${this.base(projectId)}/files${params}`);
  }
  uploadFile(projectId: string, file: File, folderId?: string) {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    return this.http.post<VaultFile>(`${this.base(projectId)}/files`, form);
  }
  downloadFile(projectId: string, fileId: string) {
    return this.http.get(`${this.base(projectId)}/files/${fileId}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  deleteFile(projectId: string, fileId: string) {
    return this.http.delete(`${this.base(projectId)}/files/${fileId}`);
  }
  moveFile(projectId: string, fileId: string, folderId: string | null) {
    return this.http.patch<VaultFile>(`${this.base(projectId)}/files/${fileId}/move`, { folderId });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectBoard, ProjectBoardDetail } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class BoardService {
  constructor(private http: HttpClient) {}

  getBoards(projectId: string) {
    return this.http.get<ProjectBoard[]>(`${environment.apiUrl}/projects/${projectId}/boards`);
  }

  getBoard(projectId: string, boardId: string) {
    return this.http.get<ProjectBoardDetail>(`${environment.apiUrl}/projects/${projectId}/boards/${boardId}`);
  }

  createBoard(projectId: string, title: string) {
    return this.http.post<ProjectBoard>(`${environment.apiUrl}/projects/${projectId}/boards`, { title });
  }

  updateBoard(projectId: string, boardId: string, title?: string, contentJson?: string) {
    return this.http.put<ProjectBoardDetail>(
      `${environment.apiUrl}/projects/${projectId}/boards/${boardId}`,
      { title, contentJson }
    );
  }

  deleteBoard(projectId: string, boardId: string) {
    return this.http.delete(`${environment.apiUrl}/projects/${projectId}/boards/${boardId}`);
  }
}

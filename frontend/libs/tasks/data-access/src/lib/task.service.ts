import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { CreateTaskRequest, SubTask, Task, TaskAttachment, TimeLog, UpdateTaskRequest, UpdateTaskStatusRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getByProject(projectId: string) {
    return this.http.get<PagedResult<Task>>(`${this.base}/project/${projectId}`).pipe(map(r => r.items));
  }

  getById(id: string) {
    return this.http.get<Task>(`${this.base}/${id}`);
  }

  create(request: CreateTaskRequest) {
    return this.http.post<Task>(this.base, request);
  }

  update(id: string, request: UpdateTaskRequest) {
    return this.http.put<Task>(`${this.base}/${id}`, request);
  }

  updateStatus(id: string, request: UpdateTaskStatusRequest) {
    return this.http.patch<Task>(`${this.base}/${id}/status`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  createSubTask(taskId: string, title: string) {
    return this.http.post<SubTask>(`${this.base}/${taskId}/subtasks`, { title });
  }

  toggleSubTask(subTaskId: string) {
    return this.http.patch<SubTask>(`${this.base}/subtasks/${subTaskId}/toggle`, {});
  }

  deleteSubTask(subTaskId: string) {
    return this.http.delete<void>(`${this.base}/subtasks/${subTaskId}`);
  }

  logTime(taskId: string, hours: number, loggedDate: string, description?: string, subTaskId?: string) {
    return this.http.post<TimeLog>(`${this.base}/${taskId}/timelogs`, { hours, loggedDate, description, subTaskId });
  }

  deleteTimeLog(timeLogId: string) {
    return this.http.delete<void>(`${this.base}/timelogs/${timeLogId}`);
  }

  updateTimeLog(timeLogId: string, hours: number, loggedDate: string, description?: string) {
    return this.http.put<TimeLog>(`${this.base}/timelogs/${timeLogId}`, { hours, loggedDate, description });
  }

  setSubTaskEstimate(subTaskId: string, estimatedHours: number | null) {
    return this.http.patch<SubTask>(`${this.base}/subtasks/${subTaskId}/estimate`, { estimatedHours });
  }

  uploadAttachment(taskId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<TaskAttachment>(`${this.base}/${taskId}/attachments`, form);
  }

  deleteAttachment(attachmentId: string) {
    return this.http.delete<void>(`${this.base}/attachments/${attachmentId}`);
  }

  fetchAttachmentBlob(attachmentId: string) {
    return this.http.get(`${this.base}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}

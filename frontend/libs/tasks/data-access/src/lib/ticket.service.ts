import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import { Ticket, TicketComment, SubmitTicketRequest, UpdateTicketStatusRequest, TicketStatus, Project } from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // Internal endpoints
  getByProject(projectId: string, status?: TicketStatus) {
    let params = new HttpParams();
    if (status !== undefined) params = params.set('status', status);
    return this.http.get<Ticket[]>(`${this.base}/projects/${projectId}/tickets`, { params });
  }

  getById(projectId: string, ticketId: string) {
    return this.http.get<Ticket>(`${this.base}/projects/${projectId}/tickets/${ticketId}`);
  }

  updateStatus(projectId: string, ticketId: string, body: UpdateTicketStatusRequest) {
    return this.http.patch<Ticket>(`${this.base}/projects/${projectId}/tickets/${ticketId}/status`, body);
  }

  getComments(projectId: string, ticketId: string) {
    return this.http.get<TicketComment[]>(`${this.base}/projects/${projectId}/tickets/${ticketId}/comments`);
  }

  addComment(projectId: string, ticketId: string, content: string) {
    return this.http.post<TicketComment>(`${this.base}/projects/${projectId}/tickets/${ticketId}/comments`, { content });
  }

  convertToTask(projectId: string, ticketId: string, body?: object) {
    return this.http.post(`${this.base}/projects/${projectId}/tickets/${ticketId}/convert`, body ?? {});
  }

  // Customer portal endpoints
  getMyProjects() {
    return this.http.get<Project[]>(`${this.base}/portal/projects`);
  }

  getMyTickets(projectId?: string) {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<Ticket[]>(`${this.base}/portal/tickets`, { params });
  }

  getMyTicketById(ticketId: string) {
    return this.http.get<Ticket>(`${this.base}/portal/tickets/${ticketId}`);
  }

  submitTicket(projectId: string, body: SubmitTicketRequest) {
    return this.http.post<Ticket>(`${this.base}/portal/projects/${projectId}/tickets`, body);
  }

  getPortalComments(ticketId: string) {
    return this.http.get<TicketComment[]>(`${this.base}/portal/tickets/${ticketId}/comments`);
  }

  addPortalComment(ticketId: string, content: string) {
    return this.http.post<TicketComment>(`${this.base}/portal/tickets/${ticketId}/comments`, { content });
  }
}

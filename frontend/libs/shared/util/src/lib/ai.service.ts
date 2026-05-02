import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface AiResponse  { answer: string; suggestions: string[]; }

export interface PlanConversationMessage { role: 'user' | 'assistant'; content: string; }
export type PlanConversationPhase = 'Clarifying' | 'Generating' | 'Extracting';
export interface PlanTaskItem { title: string; description: string; priority: 'Low' | 'Medium' | 'High'; }
export interface PlanConversationResponse { response: string | null; tasks: PlanTaskItem[] | null; }
export interface CreateProjectFromPlanRequest { name: string; description: string; tasks: PlanTaskItem[]; }

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${environment.apiUrl}/ai`;
  private readonly projectsBase = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  ask(question: string, projectId?: string, history: ChatMessage[] = [], deepThinking = false): Observable<AiResponse> {
    return this.http.post<AiResponse>(this.base + '/ask', { question, projectId, history, deepThinking });
  }

  planConversation(
    history: PlanConversationMessage[],
    newMessage: string,
    phase: PlanConversationPhase
  ): Observable<PlanConversationResponse> {
    return this.http.post<PlanConversationResponse>(this.base + '/plan/conversation', { history, newMessage, phase });
  }

  createProjectFromPlan(req: CreateProjectFromPlanRequest): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(this.projectsBase + '/from-plan', req);
  }

  addPlanTasks(projectId: string, tasks: PlanTaskItem[]): Observable<unknown> {
    return this.http.post(this.projectsBase + `/${projectId}/plan-tasks`, { tasks });
  }
}

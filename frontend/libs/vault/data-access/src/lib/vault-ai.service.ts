import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@pm/shared/util';

interface AiResponse { content: string; suggestions: string[]; }

const HTML_RULES = `
RESPONSE FORMAT:
- Respond with clean HTML only
- Use ONLY these tags: h1, h2, h3, p, ul, ol, li, strong, em, code, blockquote, hr
- Do NOT include DOCTYPE, html, head, body, script, or style tags
- Do NOT use markdown syntax, backtick code fences, or any text outside the document
- Start directly with content, no preamble or explanation`;

@Injectable({ providedIn: 'root' })
export class VaultAiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/ai/ask`;

  generateSpec(brief: string, projectId: string): Observable<string> {
    const question = `You are a technical specification writer embedded in a project management tool.
Generate a comprehensive, well-structured specification document based on this brief:

"${brief}"
${HTML_RULES}
Start with an <h1> title. Include relevant sections such as: Overview, Goals & Requirements,
Technical Design, API / Data Model, Acceptance Criteria, Out of Scope.
Adjust sections to what makes sense for the brief. Reference actual project data where relevant.
Be specific, technical, and actionable.`;

    return this.http.post<AiResponse>(this.base, { question, projectId })
      .pipe(map(r => r.content));
  }

  editSelection(text: string, instruction: string): Observable<string> {
    const question = `${instruction} the following text. Return only the rewritten text — no explanation, no preamble, no surrounding quotes.

Text:
${text}`;
    return this.http.post<AiResponse>(this.base, { question })
      .pipe(map(r => r.content));
  }

  documentCommand(instruction: string, projectId: string): Observable<string> {
    const question = `You are an AI writing assistant embedded in a document editor.
Carry out the following instruction for the document:

"${instruction}"
${HTML_RULES}`;
    return this.http.post<AiResponse>(this.base, { question, projectId })
      .pipe(map(r => r.content));
  }
}

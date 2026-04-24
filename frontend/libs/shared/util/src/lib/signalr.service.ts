import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

export interface SignalRMessage {
  event: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private hub: signalR.HubConnection | null = null;
  private readonly messages$ = new Subject<SignalRMessage>();

  readonly events$ = this.messages$.asObservable();

  async connect(): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5059/hubs/tasks', {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    const forward = (event: string) =>
      this.hub!.on(event, (payload: unknown) => this.messages$.next({ event, payload }));

    ['TaskStatusChanged', 'TaskAssigned', 'TaskOverdue', 'Notification'].forEach(forward);

    await this.hub.start();
  }

  async joinProject(projectId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('JoinProject', projectId);
  }

  async leaveProject(projectId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('LeaveProject', projectId);
  }

  disconnect(): void {
    this.hub?.stop();
    this.hub = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

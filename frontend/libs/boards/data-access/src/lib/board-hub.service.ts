import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class BoardHubService implements OnDestroy {
  private hub: signalR.HubConnection | null = null;
  private readonly contentChange$ = new Subject<string>();

  readonly boardChange$ = this.contentChange$.asObservable();

  async connect(): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected) return;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/boards`, {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveBoardChange', (contentJson: string) =>
      this.contentChange$.next(contentJson)
    );

    await this.hub.start();
  }

  async joinBoard(boardId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('JoinBoard', boardId);
  }

  async leaveBoard(boardId: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('LeaveBoard', boardId);
  }

  async broadcastChange(boardId: string, contentJson: string): Promise<void> {
    if (this.hub?.state === signalR.HubConnectionState.Connected)
      await this.hub.invoke('BroadcastBoardChange', boardId, contentJson);
  }

  disconnect(): void {
    this.hub?.stop();
    this.hub = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

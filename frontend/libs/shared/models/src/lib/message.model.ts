export interface Message {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

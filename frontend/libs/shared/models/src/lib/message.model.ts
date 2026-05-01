export interface Message {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  taskId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCommentRequest {
  content: string;
}

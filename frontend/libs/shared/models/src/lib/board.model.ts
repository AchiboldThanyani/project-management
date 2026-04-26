export interface ProjectBoard {
  id: string;
  title: string;
  projectId: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectBoardDetail extends ProjectBoard {
  contentJson: string;
}

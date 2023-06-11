export interface AddTodoRequest {
  content: string;
  status: boolean;
}

export interface AddTodoResponse {
  id: string;
}
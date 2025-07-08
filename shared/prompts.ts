export interface ExecutePrompt {
  socket_id: string;
  prompt: string;
}

export interface PromptResponse {
  socket_id: string;
  response: string;
  pending: boolean;
}

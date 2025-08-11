import { InstanceManager, ProgramObject } from '@sallar-network/server';
import { Socket } from 'socket.io';
import { ExecutePrompt, PromptResponse } from '@shared/prompts';
import { take } from './utils';

export interface Session {
  worker_id: string;
  socket: Socket;
}

export class SessionManager {
  sessions: Session[] = [];
  availableWorkers = new Set<string>();

  constructor(private readonly instanceManager: InstanceManager) {
    instanceManager.on(
      'prompt-response',
      (payload: ProgramObject<PromptResponse>) => {
        const { socket_id, response, pending } = payload;

        const session = this.getSessionBySocketId(socket_id);
        if (!session)
          throw new Error(
            `Cannot return prompt response for ${socket_id}. Session not found`
          );

        session.socket.emit('prompt-response', { response, pending });
      }
    );
  }

  // Workers

  addWorker(worker_id: string): void {
    console.log(`worker_id: ${worker_id}`);

    this.availableWorkers.add(worker_id);
  }

  removeWorker(worker_id: string): void {
    console.log(`removeWorker: ${worker_id}`);

    this.availableWorkers.delete(worker_id);
    const session = this.getSessionByWorkerId(worker_id);
    if (session) {
      session.socket.emit('session-broken');
      this.removeSessionByWorkerId(worker_id);
    }
  }

  // Sessions

  async createSession(socket: Socket): Promise<string> {
    console.log(`createSession: ${socket.id}`);

    const freeWorker = take(this.availableWorkers);
    if (!freeWorker) throw new Error('There is no available workers');
    this.sessions.push({ worker_id: freeWorker, socket });

    return freeWorker;
  }

  closeSession(socket_id: string): void {
    console.log(`closeSession: ${socket_id}`);

    const session = this.getSessionBySocketId(socket_id);
    if (session) {
      this.removeSessionBySocketId(socket_id);
      this.availableWorkers.add(session.worker_id);
    }
  }

  // Prompts

  async executePrompt(socket_id: string, prompt: string): Promise<void> {
    console.log(`executePrompt: ${socket_id}`);

    const session = this.getSessionBySocketId(socket_id);
    if (!session) throw new Error('Cannot execute prompt');

    const payload: ExecutePrompt = { prompt, socket_id };
    this.instanceManager.emit('execute-prompt', payload, session.worker_id);
  }

  // Utils

  private getSessionBySocketId(socket_id: string): Session | undefined {
    console.log(`getSessionBySocketId: ${socket_id}`);

    return this.sessions.find((session) => session.socket.id === socket_id);
  }

  private getSessionByWorkerId(worker_id: string): Session | undefined {
    console.log(`getSessionByWorkerId: ${worker_id}`);

    return this.sessions.find((session) => session.worker_id === worker_id);
  }

  private removeSessionBySocketId(socket_id: string): void {
    console.log(`removeSessionBySocketId: ${socket_id}`);

    this.sessions = this.sessions.filter(
      (session) => session.socket.id !== socket_id
    );
  }

  private removeSessionByWorkerId(worker_id: string): void {
    console.log(`removeSessionByWorkerId: ${worker_id}`);

    this.sessions = this.sessions.filter(
      (session) => session.worker_id !== worker_id
    );
  }
}

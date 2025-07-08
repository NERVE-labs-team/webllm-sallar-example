import {
  InstanceManager,
  WorkerDisconnectedException,
} from '@sallar-network/server';
import * as dotenv from 'dotenv';
import path from 'path';
import to from 'await-to-js';
import { SessionManager } from './session-manager';

(async () => {
  dotenv.config();

  const manager = new InstanceManager({
    public_path: `./public`,
    http_port: Number(process.env.PORT),
    dev_mode: process.env.DEV_MODE === 'true',
    node_manager_server: process.env.NODE_MANAGER_SERVER,
    program_token: process.env.PROGRAM_TOKEN,
  });

  const sessionManager = new SessionManager(manager);

  // Add worker to list when it is ready

  manager.on('worker-ready', ({ worker_id }) => {
    console.log(`Worker ${worker_id} is ready`);

    sessionManager.addWorker(worker_id);
  });

  // Add client app integration

  const io = manager.io; // Expand websockets

  io.on('connection', async (socket) => {
    socket.on('create-session', async () => {
      console.log(`Host ${socket.id} connected`);

      const [err, worker_id] = await to(sessionManager.createSession(socket));
      if (err) {
        console.warn(`Cannot create session for host ${socket.id}`);

        return socket.emit('session-creating-error');
      }

      console.log(`Session created successfully for host ${socket.id}`);

      socket.emit('session-created-successfully', { worker_id });
    });

    socket.on('execute-prompt', (prompt) => {
      console.debug(`Host ${socket.id} send prompt to execute`);

      sessionManager.executePrompt(socket.id, prompt);
    });

    socket.on('disconnect', () => {
      console.log(`Host ${socket.id} disconnected`);

      sessionManager.closeSession(socket.id);
    });
  });

  // Lanuch app

  await manager.launch(
    // On worker connection
    ({ worker_id }) => {
      console.log(`Worker ${worker_id} connected`);
    },
    // On worker error
    ({ worker_id }, error) => {
      // On disconnection
      if (error instanceof WorkerDisconnectedException) {
        console.log(`Worker ${worker_id} disconnected`);
        sessionManager.removeWorker(worker_id);
      } else {
        console.error(`Error occurred: ${error}`);
      }
    }
  );
})();

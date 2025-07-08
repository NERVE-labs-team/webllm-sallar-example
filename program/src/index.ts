import { InstanceManager } from '@sallar-network/client';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import io from 'socket.io-client';
import { ExecutePrompt, PromptResponse } from '@shared/prompts';

(async () => {
  // Start program

  const program = new InstanceManager(io);

  // Download model

  const selectedModel = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

  const initProgressCallback = (initProgress: any) => {
    console.log(initProgress);
  };

  const engine = await CreateMLCEngine(selectedModel, {
    initProgressCallback: initProgressCallback,
  });

  console.log('Model ready!');

  document.getElementById('loading-indicator')!.hidden = true;
  document.getElementById('listening-indicator')!.hidden = false;

  // Send init event

  program.emit('worker-ready', null);

  // Wait for prompts

  program.on('execute-prompt', async (payload: ExecutePrompt, manager) => {
    document.getElementById('listening-indicator')!.hidden = true;
    document.getElementById('typing-indicator')!.style.display = 'flex';

    const { prompt, socket_id } = payload;

    const chunks = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      stream: true,
    });

    let reply = '';
    let pending = false; // Pending false mean sending text as a new message

    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || '';

      const responsePayload: PromptResponse = {
        socket_id,
        response: reply,
        pending,
      };

      manager.emit('prompt-response', responsePayload);
      pending = true; // Continue typing
    }

    document.getElementById('listening-indicator')!.hidden = false;
    document.getElementById('typing-indicator')!.style.display = 'none';
  });
})();

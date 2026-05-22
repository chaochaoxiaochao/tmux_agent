import type { FastifyInstance } from 'fastify';
import { upsert, snapshot, AgentState } from '../agent-state-registry.js';

interface AgentReportBody {
  paneId: string;
  session?: string;
  windowId?: string;
  claudeSessionId?: string;
  claudeSessionName?: string;
  cwd?: string;
  state: AgentState;
  lastMessage?: string;
}

export function registerAgentStateRoutes(app: FastifyInstance): void {
  app.post<{ Body: AgentReportBody }>('/api/agent-state', async (req, reply) => {
    const b = req.body ?? ({} as AgentReportBody);
    if (!b.paneId || !b.state) {
      reply.status(400).send({ error: 'bad_input', message: 'paneId and state required' });
      return;
    }
    if (b.state !== 'running' && b.state !== 'request' && b.state !== 'stop') {
      reply.status(400).send({ error: 'bad_input', message: 'state must be running|request|stop' });
      return;
    }
    upsert({
      paneId: b.paneId,
      session: b.session,
      windowId: b.windowId,
      claudeSessionId: b.claudeSessionId,
      claudeSessionName: b.claudeSessionName,
      cwd: b.cwd,
      state: b.state,
      lastMessage: b.lastMessage,
      lastEventAt: Date.now(),
    });
    reply.status(204).send();
  });

  app.get('/api/agent-state/snapshot', async () => ({ agents: snapshot() }));
}

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Public, versioned Codex app-server JSON-RPC over stdio. No desktop private APIs.
export function openAppServer(spec) {
  const child = spawn(spec.executable, spec.args, {
    cwd: spec.cwd,
    env: spec.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
  });
  const pending = new Map();
  const listeners = new Set();
  const exitListeners = new Set();
  let sequence = 0;
  let closed = false;
  const send = message => child.stdin.write(JSON.stringify(message) + '\n');
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const waiter = pending.get(message.id);
    if (waiter && !message.method) {
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) {
        const denied = message.error.message?.match(/\b(401|403)\b/)?.[1];
        waiter.reject(
          new Error(
            denied
              ? `Codex HTTP ${denied}; stop and request access`
              : `Codex ${waiter.method} rejected (code ${message.error.code}); no fallback`
          )
        );
      } else waiter.resolve(message.result);
      return;
    }
    if (message.id !== undefined && message.method) {
      // auto_review normally resolves approvals in the server. Escalations to
      // this unattended client must never become an unconditional grant.
      if (
        [
          'item/commandExecution/requestApproval',
          'item/fileChange/requestApproval',
        ].includes(message.method)
      ) {
        send({ id: message.id, result: { decision: 'decline' } });
      } else if (message.method === 'item/permissions/requestApproval') {
        send({ id: message.id, result: { permissions: {}, scope: 'turn' } });
      } else if (message.method === 'item/tool/requestUserInput') {
        send({ id: message.id, result: { answers: {} } });
      } else {
        send({
          id: message.id,
          error: {
            code: -32601,
            message: 'Unattended incident client requires user action',
          },
        });
      }
      for (const listener of listeners)
        listener({
          method: 'bendd/userActionRequired',
          params: { request: message.method },
        });
      return;
    }
    for (const listener of listeners) listener(message);
  });
  child.stderr.on('data', () => {}); // Never store raw auth or tool logs.
  child.stdin.on('error', () => {});
  function exited() {
    if (closed) return;
    closed = true;
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Codex app-server stopped; no automatic repeat'));
    }
    pending.clear();
    for (const listener of exitListeners) listener();
  }
  child.on('error', exited);
  child.on('close', exited);

  function request(method, params = {}) {
    if (closed) return Promise.reject(new Error('Codex app-server is closed'));
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Codex ${method} timed out; no automatic repeat`));
      }, 30_000);
      pending.set(id, { method, resolve, reject, timer });
      send({ id, method, params });
    });
  }

  async function close() {
    if (closed) return;
    const stopped = new Promise(resolve => exitListeners.add(resolve));
    child.stdin.end();
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* Already stopped. */
      }
    }, 5_000);
    await stopped;
    clearTimeout(timer);
    lines.close();
  }

  return {
    request,
    close,
    notify: (method, params = {}) => send({ method, params }),
    onEvent: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onExit: listener => {
      exitListeners.add(listener);
      return () => exitListeners.delete(listener);
    },
  };
}

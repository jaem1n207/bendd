import assert from 'node:assert/strict';
import test from 'node:test';
import { openAppServer } from './app-server.mjs';

// Exercise the real stdio transport with a local fake process, never Codex.
const script = `
import {createInterface} from 'node:readline';
let request;
const send=(message)=>process.stdout.write(JSON.stringify(message)+'\\n');
createInterface({input:process.stdin}).on('line',line=>{
 const message=JSON.parse(line);
 if(message.method==='probe') {
  request=message.id;
  send({id:'approval',method:message.params.method,params:{}});
 } else if(message.id==='approval') send({id:request,result:message.result});
 else if(message.id) send({id:message.id,result:{}});
});
`;

for (const [method, expected] of [
  ['item/commandExecution/requestApproval', { decision: 'decline' }],
  ['item/fileChange/requestApproval', { decision: 'decline' }],
  ['item/permissions/requestApproval', { permissions: {}, scope: 'turn' }],
]) {
  test(`${method} is denied over the real client transport`, async () => {
    const client = openAppServer({
      executable: process.execPath,
      args: ['--input-type=module', '-e', script],
      cwd: process.cwd(),
      env: process.env,
    });
    const events = [];
    client.onEvent(event => events.push(event));
    try {
      await client.request('initialize', {});
      assert.deepEqual(await client.request('probe', { method }), expected);
      assert.equal(events[0].method, 'bendd/userActionRequired');
    } finally {
      await client.close();
    }
  });
}

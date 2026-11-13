import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLimitedCloudFile} from './document-cloud';
test('cloud download preserves bytes and rejects declared oversize',async()=>{
 const file=await readLimitedCloudFile(new Response('Example',{headers:{'content-type':'text/plain'}}),'Example.txt');assert.equal(await file.text(),'Example');assert.equal(file.name,'Example.txt');
 await assert.rejects(()=>readLimitedCloudFile(new Response('x',{headers:{'content-length':String(6*1024*1024)}}),'Big.txt'),/5 MB/);
});
test('cloud download bounds streaming data even without content length',async()=>{
 const response=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5*1024*1024));controller.enqueue(new Uint8Array(10));controller.close();}}));
 await assert.rejects(()=>readLimitedCloudFile(response,'Big.txt'),/5 MB/);
});
test('cloud authentication, access and quota failures are actionable',async()=>{
 for(const [status,message] of [[401,/sesión/],[403,/permiso/],[429,/límite/]] as const)await assert.rejects(()=>readLimitedCloudFile(new Response(null,{status}),'Example.txt'),message);
});

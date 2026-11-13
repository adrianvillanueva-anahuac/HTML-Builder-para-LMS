import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {documentAIPlugin} from '../document-ai-server';
import {localPlans,type SourceBlock} from './document-plan';
const source:SourceBlock[]=[{id:'d0b0',source:'Example',kind:'text',text:'Fictional example',html:'<p>Fictional example</p>'}];
const body={consent:true,blocks:source.map(({id,kind,text})=>({id,kind,text}))};
function bridge(config={GEMINI_API_KEY:'test-only',GEMINI_MODEL:'gemini-test'}){
 let handler:any;(documentAIPlugin(config).configureServer as Function)({middlewares:{use(_path:string,fn:unknown){handler=fn;}}});
 return async(data:unknown=body,options:Record<string,any>={})=>{
  const request=Readable.from([JSON.stringify(data)]);Object.assign(request,{method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:3004',origin:'http://127.0.0.1:3004','content-type':'application/json'},...options});
  const response={statusCode:200,setHeader(){},body:'',end(text:string){this.body=text;}};
  await handler(request,response);return {status:response.statusCode,body:JSON.parse(response.body)};
 };
}
test('AI bridge validates, returns source-only plans, rate-limits; network mocked',async t=>{
 let requests=0;t.mock.method(globalThis,'fetch',async(_url:any,options:any)=>{requests++;assert.equal(options.headers['x-goog-api-key'],'test-only');assert.ok(!options.body.includes('<p>'));return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({proposals:localPlans(source)})}]}}]}),{status:200});});
 const call=bridge();assert.equal((await call()).status,200);assert.equal((await call()).status,429);assert.equal(requests,1);
});
test('AI bridge rejects remote caller and cross origin without network',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Must not send');});
 assert.equal((await bridge()(body,{socket:{remoteAddress:'192.168.1.2'}})).status,403);
 assert.equal((await bridge()(body,{headers:{host:'127.0.0.1:3004',origin:'https://evil.example','content-type':'application/json'}})).status,403);
 assert.equal((await bridge()({...body,consent:false})).status,400);
 assert.equal((await bridge({GEMINI_API_KEY:'',GEMINI_MODEL:''})()).status,503);
});
test('provider authentication, quota and malformed answers have safe errors',async t=>{
 for(const status of [401,403,404,429]){
  const mock=t.mock.method(globalThis,'fetch',async()=>new Response('secret provider details',{status}));const result=await bridge()();assert.equal(result.status,status);assert.ok(!JSON.stringify(result.body).includes('secret'));mock.mock.restore();
 }
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"proposals":[]}'}]}}]}),{status:200}));assert.equal((await bridge()()).status,502);
});

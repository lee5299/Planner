import express from 'express';
import {resolve} from 'node:path';

const app=express();
const port=Number(process.env.PORT)||3000;
app.disable('x-powered-by');

if(process.env.NODE_ENV==='production'||process.argv[1]?.endsWith('server.mjs')){
 app.use(express.static(resolve('dist/client')));
 app.get('/{*path}',(_request,response)=>response.sendFile(resolve('dist/client/index.html')));
}else{
 const {createServer}=await import('vite');
 const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
 app.use(vite.middlewares);
}

app.listen(port,'127.0.0.1',()=>console.log(`Plan Do See: http://localhost:${port}`));

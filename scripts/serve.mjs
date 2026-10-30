import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..',process.argv.includes('--production')?'dist':'src');
const publicRoot=resolve(import.meta.dirname,'../public');
const portIndex=process.argv.indexOf('--port'),port=portIndex>=0?Number(process.argv[portIndex+1]):5180;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost'),relative=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
    if(relative.includes('\0'))throw new Error('Invalid path');
    let path=resolve(root,relative);
    if(!path.startsWith(root+sep))throw new Error('Outside root');
    try{await stat(path);}catch{path=resolve(publicRoot,relative);if(!path.startsWith(publicRoot+sep))throw new Error('Outside root');}
    const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));

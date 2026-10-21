// 前端的静态服务器：把当前目录当成网站根目录
// 运行：npm run web   或   node serve.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = 5173;
const root = import.meta.dirname;   // 本文件所在目录

const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\\/])+/, '');
    const path = join(root, relative.endsWith('\\') || relative.endsWith('/') ? join(relative, 'index.html') : relative);

    try {
        const body = await readFile(path);
        res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 文件不存在：' + url.pathname);
    }
}).listen(PORT, () => {
    console.log(`前端已启动：http://localhost:${PORT}`);
    console.log(`页面地址：http://localhost:${PORT}/index.html`);
    console.log('（打开页面前，记得另开一个终端跑 npm start 启动后端）');
});

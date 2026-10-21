// 第 7 周：把内存数组换成 SQLite 数据库
// 用的是 Node 自带的 node:sqlite，零安装、零配置
// 运行：node --watch server.mjs
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

const app = express();
const PORT = process.env.PORT ?? 3000;   // 线上平台会通过环境变量指定端口

// 允许谁来访问：本地开发用 *，上线后改成你的前端域名
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? '*';

// 管理员密钥：只有带对密钥的请求，才能发布/删除
// 优先读环境变量，读不到用开发用的默认值（上线必须设环境变量）
const ADMIN_KEY = process.env.ADMIN_KEY ?? 'dev-key-123';
if (!process.env.ADMIN_KEY) {
    console.log('提示：正在使用开发密钥 dev-key-123，上线前请设置环境变量 ADMIN_KEY');
}

// 校验密钥的中间件：加在需要保护的路由前面
function requireKey(req, res, next) {
    const provided = req.get('x-api-key');
    if (provided !== ADMIN_KEY) {
        return res.status(401).json({ error: 'unauthorized', hint: '需要在请求头带上 x-api-key' });
    }
    next();
}

/* ---------------- 数据库 ---------------- */

mkdirSync('./data', { recursive: true });          // 数据文件放在 data/ 目录
const db = new DatabaseSync('./data/app.db');      // 打开（不存在就创建）

// 建表：IF NOT EXISTS 表示已存在就跳过，所以每次启动都能安全执行
db.exec(`
    CREATE TABLE IF NOT EXISTS feed (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        message    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

// 第一次运行时表是空的，塞几条初始数据
const feedCount = db.prepare('SELECT COUNT(*) AS n FROM feed').get().n;
if (feedCount === 0) {
    const insert = db.prepare('INSERT INTO feed (title) VALUES (?)');
    for (const title of [
        '完成了第 1 周：HTML 与上线',
        '完成了第 2 周：CSS 与响应式',
        '完成了第 3 周：JavaScript 交互',
        '完成了第 4 周：数据与网络',
    ]) {
        insert.run(title);
    }
    console.log('已写入 4 条初始动态');
}

// 技能表也一样：空了就塞初始数据
const skillCount = db.prepare('SELECT COUNT(*) AS n FROM skills').get().n;
if (skillCount === 0) {
    const insert = db.prepare('INSERT INTO skills (name) VALUES (?)');
    for (const name of ['HTML 结构', 'CSS 样式', 'JavaScript 入门']) {
        insert.run(name);
    }
    console.log('已写入 3 条初始技能');
}

/* ---------------- 中间件 ---------------- */

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

/* ---------------- 路由 ---------------- */

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'learn-api', db: 'sqlite', time: new Date().toISOString() });
});

app.get('/api/feed', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    // 按 id 倒序：最新的在最前面
    const items = db
        .prepare('SELECT id, title, created_at FROM feed ORDER BY id DESC LIMIT ?')
        .all(limit);
    const total = db.prepare('SELECT COUNT(*) AS n FROM feed').get().n;

    res.json({ items, total });
});

app.post('/api/feed', requireKey, (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'missing_title' });

    const result = db.prepare('INSERT INTO feed (title) VALUES (?)').run(title);
    const item = db
        .prepare('SELECT id, title, created_at FROM feed WHERE id = ?')
        .get(result.lastInsertRowid);

    res.status(201).json({ ok: true, item });
});

/* ---- 技能：GET 列表 / POST 添加 / DELETE 删除 ---- */

app.get('/api/skills', (req, res) => {
    const items = db.prepare('SELECT id, name, created_at FROM skills ORDER BY id').all();
    res.json({ items, total: items.length });
});

app.post('/api/skills', requireKey, (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'missing_name' });

    const result = db.prepare('INSERT INTO skills (name) VALUES (?)').run(name);
    const item = db
        .prepare('SELECT id, name, created_at FROM skills WHERE id = ?')
        .get(result.lastInsertRowid);

    res.status(201).json({ ok: true, item });
});

// :id 是路径参数，用 req.params.id 取
app.delete('/api/skills/:id', requireKey, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });

    const result = db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'not_found', id });

    res.json({ ok: true, deleted: id });
});

app.get('/api/messages', (req, res) => {
    const items = db
        .prepare('SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC')
        .all();
    res.json({ items, total: items.length });
});

app.post('/api/messages', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim();
    const message = String(req.body?.message ?? '').trim();

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'missing_fields', need: ['name', 'email', 'message'] });
    }

    const result = db
        .prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)')
        .run(name, email, message);
    const item = db
        .prepare('SELECT id, name, email, message, created_at FROM messages WHERE id = ?')
        .get(result.lastInsertRowid);

    res.status(201).json({ ok: true, id: item.id, received: item });
});

/* ---------------- 兜底 ---------------- */

app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.path });
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError) {
        return res.status(400).json({ error: 'invalid_json' });
    }
    console.error('未处理的错误：', error);
    res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
    console.log(`接口服务已启动：http://localhost:${PORT}`);
    console.log(`数据库文件：./data/app.db`);
});

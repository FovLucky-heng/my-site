// 查看数据库内容：npm run db
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';

const path = './data/app.db';

if (!existsSync(path)) {
    console.log('还没有数据库文件。先运行 npm start，它会自动创建。');
    process.exit(0);
}

const db = new DatabaseSync(path);
const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all();

console.log(`数据库文件：${path}\n`);

for (const { name } of tables) {
    const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get();
    console.log(`== ${name}（${n} 行）==`);
    const rows = db.prepare(`SELECT * FROM ${name} LIMIT 20`).all();
    if (rows.length) console.table(rows);
    console.log('');
}

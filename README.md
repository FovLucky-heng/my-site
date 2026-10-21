# learn · 我的第一个全栈项目

前半部分是一页个人主页（HTML / CSS / JS），后半部分是自己写的后端接口（Node）。

## 跑起来

需要两个终端：

**终端 1：后端**

```bash
cd D:\01\learn
node --watch server.mjs
# 接口服务已启动：http://localhost:3000
```

**终端 2：前端**

用编辑器预览 `index.html`（JetBrains / VS Code 都可以），或者用任意静态服务器。

> 不要双击用 `file://` 打开：`fetch` 在 `file://` 下会被浏览器拦住。

## 接口

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/feed?limit=2` | 动态列表 |
| POST | `/api/feed` | 新增动态 `{ "title": "..." }` |
| GET | `/api/messages` | 查看留言 |
| POST | `/api/messages` | 提交留言 `{ "name", "email", "message" }` |

用 curl 试：

```bash
curl.exe -i http://localhost:3000/api/health
curl.exe http://localhost:3000/api/feed
```

## 前端与后端怎么连

`app.js` 顶部有一行：

```js
const API = 'http://localhost:3000';
```

上线时只改这一行，指向真实的后端地址。

## 已知缺陷

数据存在**内存**里（`feed` 和 `messages` 两个数组），服务器一重启就回到初始状态。第 7 周会换成数据库。

## 部署说明

- 前端（静态文件）可以放 GitHub Pages
- 后端（`server.mjs`）需要能一直运行的托管：Render / Railway / Fly.io（免费额度）或云服务器
- 上线后要改两处：`API` 常量、以及后端 CORS 的 `Access-Control-Allow-Origin`（别再用 `*`）

// 1. 先证明 JS 在跑
console.log('JS 跑起来了');

// 后端地址：
// - 本地开发（localhost）用本机的 3000 端口
// - 线上（GitHub Pages）用 Render 的地址
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API = IS_LOCAL
    ? 'http://localhost:3000'
    : 'https://learn-api-9i99.onrender.com';

// 管理员密钥：存在本机浏览器里，请求时放进请求头 x-api-key
const keyInput = document.querySelector('#admin-key');
const adminState = document.querySelector('#admin-state');
const KEY_STORAGE = 'admin-key';

keyInput.value = localStorage.getItem(KEY_STORAGE) ?? '';
keyInput.addEventListener('input', () => {
    localStorage.setItem(KEY_STORAGE, keyInput.value);
});

// 所有"写操作"用这套请求头
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-api-key': keyInput.value.trim(),
    };
}

// 2. 变量：把值存起来，后面用
const name = '小明';
const year = new Date().getFullYear();

// 3. 找元素（选择器写法和 CSS 一模一样）
const title = document.querySelector('h1');
const footer = document.querySelector('footer p');

// 4. 改它的内容
console.log('原来的标题：', title.textContent);
title.textContent = '你好，我是' + name;
footer.textContent = '© ' + year + ' ' + name;

// 5. 技能：数据在服务器的数据库里（不再是 localStorage）
let skills = [];

async function loadSkills() {
    const list = document.querySelector('main ul');
    try {
        const res = await fetch(API + '/api/skills');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        skills = data.items;
        renderSkills();
    } catch (error) {
        list.textContent = '技能加载失败：' + error.message;
    }
}

// 6. 渲染函数：把数组画成列表
function renderSkills() {
    const list = document.querySelector('main ul');
    list.textContent = '';

    for (const skill of skills) {
        const item = document.createElement('li');
        item.textContent = skill.name;

        const remove = document.createElement('button');
        remove.type = 'button';                 // 不加会当成提交按钮
        remove.textContent = '×';
        remove.dataset.id = String(skill.id);   // 数据库里的 id，删除时用它

        item.append(remove);
        list.append(item);
    }
}

// 7. 先加载一次
loadSkills();

// 8. 添加：POST 给服务器，再重新拉列表
const form = document.querySelector('#skill-form');
const input = document.querySelector('#skill-input');

form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const value = input.value.trim();
    if (!value) return;

    try {
        const res = await fetch(API + '/api/skills', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name: value }),
        });
        if (res.status === 401) {
            adminState.textContent = '密钥不对或没填，无法添加';
            return;
        }
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? 'HTTP ' + res.status);
        }

        input.value = '';
        await loadSkills();
    } catch (error) {
        document.querySelector('main ul').textContent = '添加失败：' + error.message;
    }
});

// 9. 事件委托：删除。用 DELETE 方法，id 来自按钮上的 data-id
const skillList = document.querySelector('main ul');

skillList.addEventListener('click', async function (event) {
    const button = event.target.closest('button');
    if (!button) return;                       // 点的不是按钮，不管

    try {
        const res = await fetch(API + '/api/skills/' + button.dataset.id, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (res.status === 401) {
            adminState.textContent = '密钥不对或没填，无法删除';
            return;
        }
        await loadSkills();
    } catch (error) {
        console.error('删除失败：', error);
    }
});

// 10. 从自己的后端取数据：加载中 / 失败可重试 / 成功，三种状态
async function loadFeed() {
    const status = document.querySelector('#feed-status');
    const list = document.querySelector('#feed');
    const retry = document.querySelector('#feed-retry');

    // 每次开始前先回到「加载中」，并清掉上一次的结果
    status.hidden = false;
    status.textContent = '加载中…';
    retry.hidden = true;
    list.textContent = '';

    try {
        // 第 5 周：数据来自你自己的服务器，不再是本地文件
        const res = await fetch(API + '/api/feed');
        if (!res.ok) throw new Error('HTTP ' + res.status);   // 404/500 不会自动报错，要自己判断
        const data = await res.json();

        // 服务器返回的是 { items: [...], total: n }，不是数组本身
        for (const item of data.items) {
            const li = document.createElement('li');
            li.textContent = item.title;
            list.append(li);
        }

        status.hidden = true;            // 成功：把提示藏起来
    } catch (error) {
        status.textContent = '加载失败：' + error.message;
        retry.hidden = false;            // 失败：给用户一条出路
    }
}

// 点「重试」就重新走一遍加载流程
document.querySelector('#feed-retry').addEventListener('click', loadFeed);

loadFeed();

// 11. 联系我：把表单内容 POST 给后端
const contactForm = document.querySelector('main form[action="#"]');
const contactStatus = document.querySelector('#contact-status');

contactForm.addEventListener('submit', async function (event) {
    event.preventDefault();                 // 别让浏览器自己提交并刷新
    contactStatus.textContent = '发送中…';

    const payload = {
        name: document.querySelector('#name').value.trim(),
        email: document.querySelector('#email').value.trim(),
        message: document.querySelector('#message').value.trim(),
    };

    try {
        const res = await fetch(API + '/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },   // 告诉服务器：我发的是 JSON
            body: JSON.stringify(payload),                     // 数据放在请求体里
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'HTTP ' + res.status);

        contactStatus.textContent = `已收到，编号 ${data.id}`;
        contactForm.reset();                // 清空表单
    } catch (error) {
        contactStatus.textContent = '发送失败：' + error.message;
    }
});

// 12. 新增动态：页面写一条 → 服务器存下来 → 列表刷新
const feedForm = document.querySelector('#feed-form');
const feedInput = document.querySelector('#feed-input');
const feedStatus = document.querySelector('#feed-status');

feedForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = feedInput.value.trim();
    if (!title) return;

    try {
        const res = await fetch(API + '/api/feed', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ title }),
        });

        if (res.status === 401) {
            adminState.textContent = '密钥不对或没填，无法发布';
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'HTTP ' + res.status);

        adminState.textContent = '密钥有效';
        feedInput.value = '';
        await loadFeed();               // 重新从服务器拉一遍，保证界面和服务器一致
    } catch (error) {
        feedStatus.hidden = false;
        feedStatus.textContent = '发布失败：' + error.message;
    }
});

// 1. 先证明 JS 在跑
console.log('JS 跑起来了');

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

// 5. 数据：优先从 localStorage 读，读不到用默认值
const KEY = 'skills';
const DEFAULT_SKILLS = ['HTML 结构', 'CSS 样式', 'JavaScript 入门'];

function loadSkills() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : DEFAULT_SKILLS;
    } catch {
        return DEFAULT_SKILLS;      // 数据坏了也不让页面白屏
    }
}

function saveSkills() {
    localStorage.setItem(KEY, JSON.stringify(skills));
}

const skills = loadSkills();

// 6. 渲染函数：把数组画成列表
function renderSkills() {
    const list = document.querySelector('main ul');
    list.textContent = '';

    skills.forEach(function (skill, index) {
        const item = document.createElement('li');
        item.textContent = skill;

        const remove = document.createElement('button');
        remove.type = 'button';            // 不加会当成提交按钮
        remove.textContent = '×';
        remove.dataset.index = String(index); // 把这个按钮对应第几项记在元素上

        item.append(remove);
        list.append(item);
    });
}

// 7. 调用一次
renderSkills();

// 8. 交互：提交表单就添加一项
const form = document.querySelector('#skill-form');
const input = document.querySelector('#skill-input');

form.addEventListener('submit', function (event) {
    event.preventDefault();          // 阻止表单默认提交（会刷新页面）

    const value = input.value.trim(); // 取值，去掉首尾空格
    if (!value) return;               // 空输入直接结束

    skills.push(value);
    saveSkills();                     // 存起来
    input.value = '';
    renderSkills();
});

// 9. 事件委托：删除
const skillList = document.querySelector('main ul');

skillList.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) return;                 // 点的不是按钮，不管

    const index = Number(button.dataset.index);

    skills.splice(index, 1);
    saveSkills();                     // 存起来
    renderSkills();
});

// 10. 从网络取数据：加载中 / 失败可重试 / 成功，三种状态
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
        const res = await fetch('./data.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);   // 404/500 不会自动报错，要自己判断
        const data = await res.json();

        for (const item of data) {
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

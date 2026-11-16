/* global hexo */

'use strict';

/**
 * 自动摘要：渲染前在第一个二级标题（##）之前插入 <!-- more -->，
 * 让首页只显示标题之前的部分，后面接主题的「阅读更多」按钮。
 *
 * 规则：
 *   1. 文章里已经有 <!-- more --> 的，不动（保留手动控制权）
 *   2. 没有 ## 的，退而在第一段之后插入
 *   3. 只有一段、连空行都没有的，不插入（首页会显示全文，属正常）
 *
 * 跳过代码块，避免把注释里的 ## 当成标题。
 * 独立页面（about 之类）不参与列表展示，直接跳过。
 */

const MORE = '<!-- more -->';
const MORE_RE = /<!--\s*more\s*-->/i;
const HEADING2_RE = /^##[ \t]+\S/;

const { eachLine } = require('./lib/markdown-scan');

function findInsertIndex(lines) {
    let headingAt = -1;

    eachLine(lines, (line, i) => {
        if (headingAt === -1 && HEADING2_RE.test(line)) {
            headingAt = i;
        }
    });

    if (headingAt !== -1) {
        return headingAt;
    }

    // 没有二级标题：退而求其次，在第一段之后的空行处切分
    let seenText = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            if (seenText) {
                return i;
            }
        } else {
            seenText = true;
        }
    }

    return -1;
}

hexo.extend.filter.register('before_post_render', function (data) {
    if (data.layout === 'page') {
        return data;
    }

    const content = data.content;
    if (!content || MORE_RE.test(content)) {
        return data;
    }

    const lines = content.split('\n');
    const index = findInsertIndex(lines);
    if (index < 1) {
        return data;
    }

    // 往前跳过空行，避免摘要末尾留下多余空白
    let at = index;
    while (at > 0 && lines[at - 1].trim() === '') {
        at -= 1;
    }

    lines.splice(at, 0, MORE, '');
    data.content = lines.join('\n');
    return data;
});

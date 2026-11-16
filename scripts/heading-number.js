/* global hexo */

'use strict';

/**
 * 自动给正文标题编号：## → 1.、### → 1.1、#### → 1.1.1、##### → 1.1.1.1
 *
 * 一级标题不编号（它是文章总标题，由 front-matter 的 title 决定）。
 * h2 带点（"1. 技术栈"），更深层级不带点（"3.1 创建文章"、"3.1.1 xxx"）。
 * 选择在 markdown 渲染之前改写原文，而不是渲染后改 HTML，是因为：
 * 主题的目录（TOC）读的就是渲染后的标题文本，改在源头，
 * 正文和目录拿到的就是同一串文字，序号天然一致。
 *
 * 配套设置：Icarus 的 toc widget 有一个独立的序号列（index: true），
 * 会和这里重复，已在 _config.icarus.yml 里改成 index: false。
 *
 * 标题里手写的 "1. "、"3.1.1 " 会先被去掉，避免出现 "1. 1. 标题"。
 */

const HEADING_RE = /^(#{2,6})[ \t]+(.+?)[ \t]*$/;
const EXISTING_NUMBER_RE = /^\d+(?:\.\d+)*[.．、]?[ \t]+/;

const { eachLine } = require('./lib/markdown-scan');

hexo.extend.filter.register('before_post_render', function (data) {
    const content = data.content;
    if (!content || content.indexOf('#') === -1) {
        return data;
    }

    const lines = content.split('\n');
    const counters = [0, 0, 0, 0, 0]; // h2 ~ h6 各自的出现次数
    let changed = false;

    eachLine(lines, (line, i) => {
        const match = HEADING_RE.exec(line);
        if (!match) {
            return;
        }

        const level = match[1].length;
        const index = level - 2;

        // 跳过上级直接出现下级时补 1，避免生成 "0.1"
        for (let k = 0; k < index; k++) {
            if (counters[k] === 0) {
                counters[k] = 1;
            }
        }

        counters[index] += 1;
        for (let j = index + 1; j < counters.length; j++) {
            counters[j] = 0;
        }

        const number = counters.slice(0, index + 1).join('.') + (index === 0 ? '.' : '');
        const text = match[2].replace(EXISTING_NUMBER_RE, '');
        lines[i] = match[1] + ' ' + number + ' ' + text;
        changed = true;
    });

    if (changed) {
        data.content = lines.join('\n');
    }
    return data;
});

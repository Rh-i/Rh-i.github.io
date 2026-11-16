/* global hexo */

'use strict';

/**
 * 生成 search.json：只导出「标题 + 关键字」。
 *
 * 关键字只认正文开头的那几行（第一个标题之前），格式：
 *     > 关键字： STM32 FreeRTOS 内存管理
 * 也接受半角冒号、逗号/顿号/空格分隔，多行会合并去重。
 *
 * 早先的写法是全文全局匹配「关键字：」，结果是正文里只要提到这三个字，
 * 后面整行都会被当成关键字。写说明文档时踩过两次：一篇的示例行
 * 「> 关键字： STM32 FreeRTOS 内存管理」被收进索引，另一篇讲关键字机制的那段话
 * 直接变成一串乱码标签。现在限定了位置和行首，并且跳过代码块。
 */
const KEYWORD_LINE_RE = /^\s*(?:>\s*)?关键字\s*[：:]\s*(.+?)\s*$/;
const HEADING_RE = /^#{1,6}\s/;
const SPLIT_RE = /[\s,，、;；|/]+/;

const { eachLine } = require('./lib/markdown-scan');

function extractKeywords(markdown) {
    const result = [];
    const lines = String(markdown || '').split('\n');
    let inPreamble = true;

    eachLine(lines, line => {
        if (!inPreamble) {
            return;
        }
        // 第一个标题之后的内容是正文，里面的「关键字：」属于说明或示例
        if (HEADING_RE.test(line)) {
            inPreamble = false;
            return;
        }

        const match = KEYWORD_LINE_RE.exec(line);
        if (!match) {
            return;
        }

        match[1].split(SPLIT_RE).forEach(word => {
            // 关键字两边可能包着反引号或强调符号
            const cleaned = word.replace(/^[`*_~]+|[`*_~]+$/g, '').trim();
            if (cleaned) {
                result.push(cleaned);
            }
        });
    });

    return Array.from(new Set(result));
}

hexo.extend.generator.register('local_search_index', function (locals) {
    const root = this.config.root || '/';
    const missing = [];

    const data = locals.posts
        .sort('-date')
        .toArray()
        .map(post => {
            const keywords = extractKeywords(post._content);
            if (!keywords.length) {
                missing.push(post.title);
            }
            return {
                title: post.title,
                url: encodeURI(root + post.path),
                date: post.date ? post.date.format('YYYY-MM-DD') : '',
                keywords
            };
        });

    if (missing.length) {
        hexo.log.warn(`[local-search] ${missing.length} 篇文章缺少「关键字：」行，只能按标题搜到：${missing.join(' / ')}`);
    }

    return {
        path: 'search.json',
        data: JSON.stringify(data)
    };
});

/* global hexo */

'use strict';

/**
 * 生成 search.json：只导出「标题 + 关键字」。
 *
 * 关键字写在文章 markdown 正文里任意一行，格式：
 *     > 关键字： STM32 FreeRTOS 内存管理
 * 也接受半角冒号、逗号/顿号/空格分隔，多行会合并去重。
 */
const KEYWORD_RE = /关键字\s*[：:]\s*([^\n]+)/g;
const SPLIT_RE = /[\s,，、;；|/]+/;

function extractKeywords(markdown) {
    const result = [];
    const text = String(markdown || '');
    let match;
    KEYWORD_RE.lastIndex = 0;
    while ((match = KEYWORD_RE.exec(text)) !== null) {
        match[1].split(SPLIT_RE).forEach(word => {
            const word_ = word.trim();
            if (word_) {
                result.push(word_);
            }
        });
    }
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

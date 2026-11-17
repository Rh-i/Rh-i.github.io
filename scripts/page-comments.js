/* global hexo */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 归档 / 分类 / 标签 三个栏目页也带评论区。
 *
 * 主题只在「文章页」和「普通页面」（关于、搜索这种由 md 生成的 page）里
 * 渲染 <Comment>：
 *   layout/common/article.jsx → {!index ? <Comment .../> : null}
 * 而归档 / 分类 / 标签是 hexo generator 生成的列表页，走的是
 * archive.jsx / categories.jsx / tags.jsx，压根没有评论组件。
 *
 * 所以这里在 .column-main 末尾补一个同样的 giscus 容器：
 * 参数直接读主题配置里的 comment 段，和文章页完全一致；
 * giscus 会自己把 <script> 换成 iframe，明暗主题由 giscus-theme-sync.js 继续管。
 */

/* 脚本加载时主题配置还没就绪（hexo.theme.config 是空的），直接读文件 */
function readThemeConfig() {
    try {
        return yaml.load(fs.readFileSync(path.join(hexo.base_dir, '_config.icarus.yml'), 'utf8')) || {};
    } catch (e) {
        return {};
    }
}

const comment = readThemeConfig().comment || {};

const style = `<style id="site-page-comment-style">
/* 栏目页的评论卡片：和正文列其它卡片用同一个间距 */
body .column-main > .card.page-comment {
    margin-top: var(--site-card-gap, 3rem);
}
</style>`;

const giscus = comment.type === 'giscus' && comment.repoId
    ? {
        repo: comment.repo,
        repoId: comment.repoId,
        category: comment.category || 'Announcements',
        categoryId: comment.categoryId,
        mapping: comment.mapping || 'pathname',
        strict: comment.strict ? '1' : '0',
        reactions: comment.reactionsEnabled ? '1' : '0',
        emitMetadata: comment.emitMetadata ? '1' : '0',
        inputPosition: comment.inputPosition || 'top',
        theme: comment.theme || 'light',
        darkTheme: comment.darkTheme || 'dark',
        lang: comment.lang || 'zh-CN'
    }
    : null;

const script = giscus ? `<script id="site-page-comment">
(function () {
    'use strict';

    /* 只给这三个栏目的首页加：/archives/、/categories/、/tags/。
       判断用「前缀 + 前缀后面没有别的路径段」，而不是把完整路径写死：
       子页面（/tags/Hexo/、/archives/2026/11/）自动排除，
       避免每个标签 / 每个月都生成一个空讨论。
       去掉结尾多余的斜杠用 while 手写，不用正则 ——
       模板字符串会吃掉一层反斜杠，写成 /\\/+$/ 会被解析成 //+$/ 直接语法错误 */
    var PREFIXES = ['/archives/', '/categories/', '/tags/'];
    var CFG = ${JSON.stringify(giscus)};

    function normalize(path) {
        while (path.length > 1 && path.charAt(path.length - 1) === '/') {
            path = path.slice(0, -1);
        }
        return path + '/';
    }

    function isTarget() {
        var path = normalize(window.location.pathname);
        for (var i = 0; i < PREFIXES.length; i++) {
            if (path === PREFIXES[i]) {
                return true;
            }
        }
        return false;
    }

    /* 跟着站点当前明暗选 giscus 主题（切换主题后由 giscus-theme-sync 接手） */
    function themeName() {
        var appearance = document.documentElement.getAttribute('data-appearance');
        var dark = appearance === 'dark' || (appearance === 'auto' && !!window.matchMedia
            && window.matchMedia('(prefers-color-scheme: dark)').matches);
        return dark ? CFG.darkTheme : CFG.theme;
    }

    function mount() {
        /* pjax 换页后要重新判断一次；已经有评论区就不再插第二份 */
        if (!isTarget() || document.getElementById('giscus-thread')) {
            return;
        }

        var main = document.querySelector('.column-main');
        if (!main || !CFG.categoryId) {
            return;
        }

        var card = document.createElement('div');
        card.className = 'card page-comment';

        var content = document.createElement('div');
        content.className = 'card-content';

        var box = document.createElement('div');
        box.className = 'giscus';
        box.id = 'giscus-thread';

        content.appendChild(box);
        card.appendChild(content);
        main.appendChild(card);

        var s = document.createElement('script');
        s.src = 'https://giscus.app/client.js';
        s.async = true;
        s.setAttribute('crossorigin', 'anonymous');
        s.setAttribute('data-repo', CFG.repo);
        s.setAttribute('data-repo-id', CFG.repoId);
        s.setAttribute('data-category', CFG.category);
        s.setAttribute('data-category-id', CFG.categoryId);
        s.setAttribute('data-mapping', CFG.mapping);
        s.setAttribute('data-strict', CFG.strict);
        s.setAttribute('data-reactions-enabled', CFG.reactions);
        s.setAttribute('data-emit-metadata', CFG.emitMetadata);
        s.setAttribute('data-input-position', CFG.inputPosition);
        s.setAttribute('data-theme', themeName());
        s.setAttribute('data-lang', CFG.lang);
        box.appendChild(s);
    }

    document.addEventListener('DOMContentLoaded', mount);
    document.addEventListener('pjax:complete', mount);
}());
</script>` : '';

hexo.extend.injector.register('head_end', style, 'default');
if (script) {
    hexo.extend.injector.register('body_end', script, 'default');
} else {
    /* 静默跳过最难排查：换了评论系统或漏填 categoryId 时，这里能立刻看到原因 */
    hexo.log.info('[page-comments] 评论不是 giscus（或缺少 repoId / categoryId），跳过栏目页评论注入');
}

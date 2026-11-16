/* global hexo */

'use strict';

/**
 * 把「本文分类 / 本文标签」放进左栏，位置在目录（toc）卡片之前。
 *
 * Icarus 7 只提供全站级的 categories / tags widget，没有"当前文章"的版本。
 * 直接改 node_modules 里的主题文件会被 npm 升级覆盖，所以这里用 injector 注入
 * 一小段前端脚本：从文章页已有的 DOM 里取数据（.article-meta 里的分类链接、
 * .article-tags 里的标签链接），再拼成和主题一致的 .card.widget 卡片插进左栏。
 *
 * 只在文章页生效；非文章页找不到这些 DOM 就什么都不做。
 */
const style = `<style id="site-post-sidebar-style">
/* 不用 Bulma 的 is-light：它的底色是写死的 #f5f5f5，暗色主题不会覆盖，
   在深色侧栏里会变成刺眼的亮块。改用半透明灰，跟随前后景变化。 */
.post-meta-widget .post-meta-tag {
    background: rgba(128, 128, 128, .16);
    color: inherit;
    border: none;
    font-weight: normal;
    letter-spacing: 0;
    text-transform: none;
    transition: background-color .15s ease;
}
.post-meta-widget .post-meta-tag:hover {
    background: rgba(128, 128, 128, .32);
}
</style>`;

const script = `<script id="site-post-sidebar">
(function () {
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function collect(scope, selector) {
        var out = [];
        if (!scope) {
            return out;
        }
        var nodes = scope.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            var name = (nodes[i].textContent || '').trim();
            if (!name) {
                continue;
            }
            out.push({ name: name, url: nodes[i].getAttribute('href') || '#' });
        }
        return out;
    }

    function makeCard(title, items) {
        var card = document.createElement('div');
        card.className = 'card widget post-meta-widget';
        var tags = items.map(function (item) {
            return '<a class="tag post-meta-tag mr-1 mb-1" href="' + esc(item.url) + '">'
                + esc(item.name) + '</a>';
        }).join('');
        card.innerHTML = '<div class="card-content"><div class="menu">'
            + '<h3 class="menu-label">' + esc(title) + '</h3>'
            + '<div class="field is-grouped is-grouped-multiline">' + tags + '</div>'
            + '</div></div>';
        return card;
    }

    function inject() {
        var left = document.querySelector('.column-left');
        var main = document.querySelector('.column-main');
        if (!left || !main) {
            return;
        }

        // Pjax 切换后左栏可能被整体替换；若只是局部更新，先清掉上次注入的卡片
        Array.prototype.forEach.call(
            left.querySelectorAll('.post-meta-widget'),
            function (el) { el.parentNode.removeChild(el); }
        );

        // 只有单篇内容（文章页 / 独立页面）才谈得上"本文"。
        // 列表页（首页、归档、分类、标签）里的 .article 没有 h1，标题是 h2 或链接
        var articles = main.querySelectorAll('.article');
        if (articles.length !== 1 || !articles[0].querySelector('h1')) {
            return;
        }

        var cats = collect(main, '.article-meta a[href^="/categories/"]');
        var tags = collect(main, '.article-tags a[rel="tag"]');
        if (!cats.length && !tags.length) {
            return;
        }

        // 目录卡片是左栏最后一个 widget，本文分类/标签插在它前面
        var anchor = left.querySelector('[data-type="toc"]');
        var nodes = [];
        if (cats.length) {
            nodes.push(makeCard('本文分类', cats));
        }
        if (tags.length) {
            nodes.push(makeCard('本文标签', tags));
        }

        nodes.forEach(function (node) {
            if (anchor) {
                left.insertBefore(node, anchor);
            } else {
                left.appendChild(node);
            }
        });
    }

    function boot() {
        inject();
        // 主题用 Pjax 无刷新切换，切回文章页时左栏是新 DOM，需要重新注入。
        // 稍有延迟，等 Pjax 把左栏和正文都换完再判断
        document.addEventListener('pjax:complete', function () {
            setTimeout(inject, 50);
        });
    }

    ready(boot);
})();
</script>`;

// 样式和脚本都注入到所有页面：
//   只在文章页注册 'post' 的话，如果访客第一次打开的是首页/关于页，
//   脚本根本不会加载，之后 Pjax 切到文章页就什么都不出现。
//   改成全站注入，由下面的 inject() 在运行时判断当前页面该不该有内容：
//     文章页 → 本文分类 + 本文标签
//     关于页 → 只有主题渲染的目录
//     其他页 → 什么都不注入
hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

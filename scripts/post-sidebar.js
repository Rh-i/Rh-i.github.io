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

    ready(function () {
        var left = document.querySelector('.column-left');
        var main = document.querySelector('.column-main');
        if (!left || !main) {
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
    });
})();
</script>`;

// 只注入到文章页：首页/归档等的列表卡片里也有 .article-meta，
// 若用 'default' 会在这些页面抓错数据
hexo.extend.injector.register('head_end', style, 'post');
hexo.extend.injector.register('body_end', script, 'post');

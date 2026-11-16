/* global hexo */

'use strict';

/**
 * 上一篇 / 下一篇 的方向。
 *
 * Hexo 的 post generator 是 `locals.posts.sort('-date')` 之后取相邻项：
 *   page.prev = 列表里的前一条 = **更新**发布的那篇
 *   page.next = 列表里的后一条 = **更早**发布的那篇
 * 主题的 article.jsx 把 page.prev 放在左边（左箭头）、page.next 放右边（右箭头），
 * 于是「上一篇」指向了更晚发布的文章，跟读者习惯相反。
 *
 * 这里在浏览器端把两条链接的目标和标题对调，箭头位置不动：
 * 左边 = 更早发布，右边 = 更晚发布。
 * 只动 DOM，不改主题源码，也不改 Hexo 的 permalink / 归档顺序。
 */

const script = `<script id="site-prev-next-order">
(function () {
    function swap() {
        var nav = document.querySelector('.post-navigation');
        if (!nav || nav.dataset.orderFixed === '1') {
            return;
        }

        var prev = nav.querySelector('.article-nav-prev');
        var next = nav.querySelector('.article-nav-next');
        if (!prev || !next) {
            return;
        }

        var prevHref = prev.getAttribute('href');
        var nextHref = next.getAttribute('href');
        var prevTitle = prev.querySelector('span.level-item');
        var nextTitle = next.querySelector('span.level-item');
        if (!prevHref || !nextHref || !prevTitle || !nextTitle) {
            return;
        }

        prev.setAttribute('href', nextHref);
        next.setAttribute('href', prevHref);

        var text = prevTitle.textContent;
        prevTitle.textContent = nextTitle.textContent;
        nextTitle.textContent = text;

        prev.setAttribute('title', prevTitle.textContent);
        next.setAttribute('title', nextTitle.textContent);

        /* 标记过就别再翻回来了 */
        nav.dataset.orderFixed = '1';
    }

    document.addEventListener('DOMContentLoaded', swap);
    document.addEventListener('pjax:complete', function () {
        setTimeout(swap, 0);
    });
}());
</script>`;

hexo.extend.injector.register('body_end', script, 'default');

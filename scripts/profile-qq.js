/* global hexo */

'use strict';

/**
 * 个人栏里的 QQ 图标：只显示号码，不跳转。
 *
 * Icarus 的 profile widget 会把 social_links 都渲染成 <a href="...">，
 * 所以这里在页面加载后把 QQ 那个 <a> 的 href 去掉，挂上 data-qq，
 * 再用 CSS 的 ::after 在悬停时显示号码（比浏览器原生 title 提示更即时）。
 */
const style = `<style id="site-profile-qq-style">
a.qq-no-link {
    position: relative;
    cursor: default;
}
a.qq-no-link::after {
    content: attr(data-qq);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, .78);
    color: #fff;
    font-size: 12px;
    line-height: 1.5;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity .15s ease;
    z-index: 30;
}
a.qq-no-link:hover::after {
    opacity: 1;
}
</style>`;

const script = `<script id="site-profile-qq">
(function () {
    function mark() {
        var icon = document.querySelector('.column-left .fa-qq');
        if (!icon) {
            return;
        }
        var link = icon.closest('a');
        if (!link || link.dataset.qq) {
            return;
        }
        var qq = '750920400';
        link.dataset.qq = qq;
        link.classList.add('qq-no-link');
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.setAttribute('title', 'QQ ' + qq);
        link.setAttribute('aria-label', 'QQ ' + qq);
    }

    if (document.readyState !== 'loading') {
        mark();
    } else {
        document.addEventListener('DOMContentLoaded', mark);
    }
})();
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

/* global hexo */

'use strict';

/**
 * 让导航栏的「目录」图标常驻。
 *
 * 主题只在当前页面有 toc widget 时才渲染这个按钮，于是从文章页切到搜索页 / 列表页时，
 * 右侧那一组图标会整体左右挪一格，看着像在跳。
 *
 * 这里在没有目录的页面补一个同位置的占位按钮：尺寸和真实按钮一致（保持图标组对齐），
 * 但减淡并且不可点，title 提示「本页没有目录」，避免点了没反应的困惑。
 * 只在平板以下出现（真实按钮本身带 is-hidden-tablet）。
 */

const style = `<style id="site-toc-placeholder-style">
.navbar-main .catalogue.is-placeholder {
    opacity: .3;
    cursor: default;
    pointer-events: none;
}
</style>`;

const script = `<script id="site-toc-placeholder">
(function () {
    function ensure() {
        var nav = document.querySelector('.navbar-main');
        if (!nav) {
            return;
        }
        var end = nav.querySelector('.navbar-end');
        if (!end) {
            return;
        }
        // 本页有真实按钮（页面带目录），不用补
        if (end.querySelector('.catalogue')) {
            return;
        }

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'navbar-item is-hidden-tablet catalogue is-placeholder';
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
        button.title = '本页没有目录';

        var icon = document.createElement('i');
        icon.className = 'fas fa-list-ul';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);

        // 位置跟主题保持一致：GitHub 等链接之后、外观切换按钮之前
        var anchor = end.querySelector('.appearance-toggle') || end.querySelector('.search');
        if (anchor) {
            end.insertBefore(button, anchor);
        } else {
            end.appendChild(button);
        }
    }

    if (document.readyState !== 'loading') {
        ensure();
    } else {
        document.addEventListener('DOMContentLoaded', ensure);
    }

    // Pjax 切页会换掉整条导航栏，重新补
    document.addEventListener('pjax:complete', ensure);
})();
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

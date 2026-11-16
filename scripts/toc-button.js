/* global hexo */

'use strict';

/**
 * 导航栏「目录」按钮：全宽度常驻。
 *
 * 1. 主题只在页面有 toc widget 时才渲染它，而且带 `is-hidden-tablet`（≥769 隐藏）。
 *    这里把那个 class 去掉，让它在所有宽度都出现在右侧图标组里，
 *    这样切页时图标组不会因为按钮有无而左右挪一格。
 * 2. 没有目录的页面（搜索页、列表页）补一个同位置的占位按钮：
 *    尺寸一致（保持对齐），但减淡且不可点，title 说明本页没有目录。
 * 3. 主题的浮层样式只写在 mobile 段，桌面上点按钮等于没反应；
 *    这里把同一套浮层 + 遮罩补到 ≥768，让「目录」在各宽度下行为一致。
 */

const style = `<style id="site-toc-button-style">
/* 占位按钮：保留主题图标按钮的尺寸，只减淡 + 不可点 */
.navbar-main .catalogue.is-placeholder {
    opacity: .3;
    cursor: default;
    pointer-events: none;
}

/* 主题只在手机段定义了 #toc-mask 和浮层，桌面上补一份，
   否则桌面点「目录」什么都看不到 */
@media screen and (min-width: 768px) {
    #toc-mask {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
        background: rgba(0, 0, 0, .55);
    }

    #toc-mask.is-active {
        display: block;
    }

    /* 平时目录卡片就摆在左栏里；点了按钮之后变成右下角浮层。
       这样左栏被收起时也能看目录，而且和手机上「点一下弹出来」的认知一致 */
    .column-left > .widget[data-type="toc"].is-active {
        display: block;
        position: fixed;
        top: auto;
        left: auto;
        right: 1rem;
        bottom: 1rem;
        width: min(26rem, calc(100vw - 2rem));
        max-height: calc(100vh - 5rem);
        margin: 0;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 12px 32px rgba(0, 0, 0, .28);
    }
}
</style>`;

const script = `<script id="site-toc-button">
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

        // 本页有真实按钮：去掉「平板以上隐藏」的 class，让它常驻
        var real = end.querySelector('.catalogue');
        if (real) {
            real.classList.remove('is-hidden-tablet');
            return;
        }

        // 本页没有目录：补一个同位置、同尺寸的占位按钮
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'navbar-item catalogue is-placeholder';
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
        button.title = '本页没有目录';

        var icon = document.createElement('i');
        icon.className = 'fas fa-list-ul';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);

        // 位置与主题保持一致：GitHub 等链接之后、外观切换按钮之前
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

    // Pjax 切页会换掉整条导航栏，重新处理
    document.addEventListener('pjax:complete', ensure);
})();
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

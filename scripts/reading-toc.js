/* global hexo */

'use strict';

/**
 * 阅读态：开始读正文以后，把左栏的介绍卡片收起来，让目录顶上并跟着滚动。
 *
 * 起因：左栏从上到下是「简介 + 本文分类 + 本文标签 + 本文目录」，
 * 光简介卡片就占了大半屏，整个左栏比视口还高；左栏是 is-sticky 吸附的，
 * 比视口高的吸附元素底部永远露不出来 —— 于是正文读到哪里，目录都还在屏幕外，
 * 看着就像「目录不跟着正文走」。
 *
 * 做法：
 *   1. 正文进入视口（滚过标题区）时给 body 加 .is-reading
 *   2. CSS 里 .is-reading 时把 profile 卡片折叠掉，并把目录排到左栏最前面
 *   3. 目录卡片自己有 max-height + overflow，长目录在卡片内部滚动；
 *      主题的 main.js 会把高亮项滚到卡片中间（它找的就是这个可滚动容器）
 *
 * 只处理有目录的页面（文章页），首页、归档页没有 #toc，不加这个类。
 */

const style = `<style id="site-reading-toc">
@media screen and (min-width: 769px) {
    /* 目录卡片内容统一限高，长目录在卡片里自己滚 */
    body .column-left > .widget[data-type="toc"] .card-content {
        max-height: min(52vh, 26rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, .35) transparent;
    }

    body .column-left > .widget[data-type="toc"] .card-content::-webkit-scrollbar {
        width: 6px;
    }

    body .column-left > .widget[data-type="toc"] .card-content::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, .35);
        border-radius: 3px;
    }

    /* 目录内部不要任何过渡：切换高亮时主题会给 <ul> 加类名，
       若带 transition: all 就会连着布局一起动画，点条目时看着卡 */
    body .column-left > .widget[data-type="toc"],
    body .column-left > .widget[data-type="toc"] * {
        transition: none !important;
    }

    /* ── 只有「右栏还在、卡片没被搬进左栏」时才把左栏压进一屏 ────
       分类 / 标签保持自身高度完整显示，剩下的高度全给目录（约 3/4）；
       搬动过的左栏（.sb-migrated，右栏被隐藏时的「更多」那组卡片）
       不能压高度，否则下面那几大块卡片会被截掉、根本看不到 */
    body .column-left:not(.sb-migrated) {
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 7.5rem);
    }

    body .column-left:not(.sb-migrated) > .widget:not([data-type="toc"]) {
        flex: 0 0 auto;
    }

    body .column-left:not(.sb-migrated) > .widget[data-type="toc"] {
        flex: 1 1 auto;
        min-height: 9rem;
        display: flex;
        flex-direction: column;
    }

    body .column-left:not(.sb-migrated) > .widget[data-type="toc"] .card-content {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
    }

    /* 搬过卡片的左栏：不限高，但阅读时目录依然排到最前面 */
    body.is-reading .column-left.sb-migrated {
        display: flex;
        flex-direction: column;
    }

    /* 阅读态：简介卡片直接收起，目录顶到最上面（不做过渡） */
    body.is-reading .column-left > .widget[data-type="profile"] {
        display: none;
    }

    body.is-reading .column-left > .widget[data-type="toc"] {
        order: -1;
    }
}
</style>`;

const script = `<script id="site-reading-toc-script">
(function () {
    var body = document.body;
    var line = 240;   /* 正文标题区滚过的位置，load / resize / pjax 时重算 */

    function measure() {
        var card = document.querySelector('.column-main .article');
        if (!card) {
            line = 240;
            return;
        }
        var top = card.getBoundingClientRect().top + window.pageYOffset;
        line = Math.max(160, top - 96);
    }

    function apply() {
        /* 没有目录的页面（首页 / 归档 / 标签…）不进入阅读态 */
        if (!document.getElementById('toc')) {
            if (body.classList.contains('is-reading')) {
                body.classList.remove('is-reading');
            }
            return;
        }

        var reading = window.pageYOffset > line;
        if (reading !== body.classList.contains('is-reading')) {
            body.classList.toggle('is-reading', reading);
        }
    }

    function refresh() {
        measure();
        apply();
    }

    /* ── 点目录跳转：直接跳过去，不要平滑滚动 ──────────────────
       主题的 toc.js 用 scrollIntoView({ behavior: 'smooth' }) 跳转，
       动画期间每个标题依次进入视口，高亮就跟着一路扫过去，
       目录卡片自己也会被滚来滚去 —— 看着很鬼畜。
       这里在捕获阶段拦下点击（stopPropagation 让 toc.js 的监听器不执行），
       自己瞬时跳转 + 手动写 URL，跳完只高亮目标这一条 */
    var lock = { link: null, until: 0, timers: [] };

    /* 把高亮一次性拉到目标项（连带父级）。这个函数是幂等的，重复调用只会发现
       已经对了然后直接返回，所以可以当“跳转后补丁”打几次 ——
       比常驻 MutationObserver 盯每一次类名变化便宜得多（那样会跟主题自己的
       观察器互相触发，点目录时明显卡一下） */
    function paint(link) {
        var toc = document.getElementById('toc');
        if (!toc || !link || !toc.contains(link)) {
            return;
        }

        var current = toc.querySelectorAll('.menu-list a.is-active');
        for (var i = 0; i < current.length; i++) {
            if (current[i] !== link) {
                current[i].classList.remove('is-active');
            }
        }

        if (!link.classList.contains('is-active')) {
            link.classList.add('is-active');
        }

        /* 子项被点亮时，把它的父级也点亮，跟主题的目录树一致 */
        var menuList = link.parentElement && link.parentElement.parentElement;
        while (menuList && menuList.classList && menuList.classList.contains('menu-list') &&
            menuList.parentElement && menuList.parentElement.tagName.toLowerCase() === 'li') {
            var parentLink = menuList.parentElement.children[0];
            if (parentLink && !parentLink.classList.contains('is-active')) {
                parentLink.classList.add('is-active');
            }
            menuList = menuList.parentElement.parentElement;
        }
    }

    function enforce() {
        if (!lock.link || performance.now() > lock.until) {
            return;
        }
        paint(lock.link);
    }

    function lockTo(link) {
        lock.link = link;
        lock.until = performance.now() + 1200;
        enforce();

        /* 主题的 IntersectionObserver 跳转后会再改一次高亮，这里只补几次，间隔很短 */
        lock.timers.forEach(clearTimeout);
        lock.timers = [60, 180, 400, 800].map(function (ms) {
            return setTimeout(enforce, ms);
        });
    }

    function unlock() {
        lock.link = null;
        lock.timers.forEach(clearTimeout);
        lock.timers = [];
    }

    function jumpTo(link) {
        var href = link.getAttribute('data-href') || link.getAttribute('href') || '';
        if (href.charAt(0) !== '#') {
            return false;
        }

        var id = href.slice(1);
        var target = document.getElementById(id);
        if (!target) {
            try {
                target = document.getElementById(decodeURIComponent(id));
            } catch (e) {
                target = null;
            }
        }
        if (!target) {
            return false;
        }

        /* 先把阅读态定下来再滚动：否则滚动过程中简介卡片刚好被隐藏，
           左栏会重排一次，视觉上就是跳转时“抽一下” */
        if (!body.classList.contains('is-reading')) {
            body.classList.add('is-reading');
        }

        /* 标题自己的 scroll-margin-top 会让开常驻的导航栏 */
        target.scrollIntoView();

        /* 同步点亮目标，再排几次补丁把主题改回去的高亮拉回来 */
        lockTo(link);

        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, href);
        } else {
            window.location.hash = href;
        }

        return true;
    }

    document.addEventListener('click', function (event) {
        var link = event.target && event.target.closest ? event.target.closest('#toc .menu-list a') : null;
        if (!link) {
            return;
        }
        if (!jumpTo(link)) {
            return;
        }
        /* 拦在捕获阶段：toc.js 挂在 <a> 上的平滑滚动和高亮跟随都不会再触发 */
        event.preventDefault();
        event.stopPropagation();
    }, true);

    /* 用户一旦自己滚轮 / 触摸 / 键盘滚动，就说明他要跟着正文看了，解锁 */
    ['wheel', 'touchstart', 'keydown'].forEach(function (type) {
        window.addEventListener(type, unlock, { passive: true });
    });

    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', refresh);

    document.addEventListener('DOMContentLoaded', refresh);
    document.addEventListener('pjax:complete', function () {
        refresh();
    });
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

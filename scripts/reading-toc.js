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
 *   2. 文章顶部：左栏只留 简介 / 本文分类 / 本文标签，目录不显示；
 *      进入阅读态：左栏换成 目录 / 按钮 / 本文分类 / 本文标签（顺序固定）
 *   3. 目录卡片自己有 max-height + overflow，长目录在卡片内部滚动；
 *      主题的 main.js 会把高亮项滚到卡片中间（它找的就是这个可滚动容器）
 *
 * 只处理有目录的页面（文章页），首页、归档页没有 #toc，不加这个类。
 */

const style = `<style id="site-reading-toc">
/* 「收起 / 展开分类标签」按钮只在桌面档的阅读态出现：
   手机上目录是浮层，这个按钮用不上 */
body .column-left > .toc-meta-toggle {
    display: none;
}

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

    /* 左栏顶部的小按钮：收起 / 展开「本文分类」「本文标签」。
       它排在简介之后、分类标签之前（见 ensureMetaToggle），
       阅读态简介被藏起来，它就落在左栏最上面 —— 展开和收缩都在上面点 */
    body .column-left > .toc-meta-toggle {
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: .35em;
        width: 100%;
        padding: .45rem .6rem;
        border: 1px solid rgba(128, 128, 128, .28);
        border-radius: 999px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: .8rem;
        line-height: 1.2;
        opacity: .72;
        cursor: pointer;
    }

    body.is-reading .column-left > .toc-meta-toggle {
        display: flex;
    }

    body .column-left > .toc-meta-toggle:hover,
    body .column-left > .toc-meta-toggle:focus-visible {
        opacity: 1;
        outline: none;
    }

    /* 按钮紧贴在目录卡片下方，分类标签展开时排在按钮下面 */
    body.is-reading .column-left > .toc-meta-toggle {
        order: 2;
        margin-top: .75rem;
    }

    /* 阅读态左栏顺序固定为：目录 → 按钮 → 本文分类 → 本文标签。
       用 order 而不是挪 DOM：pjax / 折叠侧栏搬卡片之后位置也不会乱 */
    body.is-reading .column-left > .widget[data-type="toc"] {
        order: 1;
        margin-top: 0;
    }

    body.is-reading .column-left > .post-meta-widget {
        order: 3;
    }

    /* 「本文分类」「本文标签」永远排在目录上面，不参与排序。
       默认展开，只有阅读态里点了按钮才收起 —— 收起不能跨到页面顶部生效：
       按钮只在阅读态出现，顶部如果把卡片藏了，就再也点不回来了 */
    body.is-reading.meta-hidden .column-left > .post-meta-widget {
        display: none;
    }

    /* ── 阅读态：左栏压进一屏，只给目录和那个按钮 ────────────
       目录 flex 撑满剩余高度：分类/标签收起时它顶满整栏；
       展开分类/标签后目录自动缩回去，两者加起来也正好占满。
       「更多」那组搬过来的卡片在阅读时不需要，先藏起来 */
    body.is-reading .column-left {
        display: flex;
        flex-direction: column;
        /* 必须给确定高度：只写 max-height 时容器高度跟着内容走，
           flex: 1 没有剩余空间可分，目录就撑不满整栏。
           100vh - 6.5rem(吸附点) - 2.25rem(底部留白) —— 上下两边留白一样，
           不会出现“侧栏顶着屏幕底、另一侧留一大块” */
        height: calc(100vh - 8.75rem);
        max-height: calc(100vh - 8.75rem);
    }

    body.is-reading .column-left > .widget:not([data-type="toc"]) {
        flex: 0 0 auto;
    }

    body.is-reading .column-left > .widget[data-type="toc"] {
        flex: 1 1 auto;
        min-height: 9rem;
        display: flex;
        flex-direction: column;
    }

    body.is-reading .column-left > .widget[data-type="toc"] .card-content {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
        overflow-y: auto;
    }

    body.is-reading .column-left > .sb-split,
    body.is-reading .column-left > [data-sb-moved],
    body.is-reading .column-left > .column-right-shadow {
        display: none !important;
    }

    /* 右侧栏卡片多的时候比视口还高，粘住后底部永远看不见。
       用确定高度（不是 max-height）：内容少时也把框拉到同样的高度，
       这样左右两栏底边齐平，不会一个顶到底、一个差一大块 */
    body.is-reading .column-right.is-sticky {
        height: calc(100vh - 8.75rem);
        max-height: calc(100vh - 8.75rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
    }

    /* 中间只留正文卡片一张：正文跟着页面滚。
       之前把 .column-main > .card 全部设成「固定高度 + 卡片内滚动」，
       评论那张卡片也吃了同一套规则，两张 sticky 卡片互相让位、
       内部滚动又链不到页面，评论就永远够不着 —— 这里不再碰它 */
    body.is-reading .column-main > .card {
        position: static;
        height: auto;
        max-height: none;
        overflow: visible;
    }

    /* 目录内部不要任何过渡：切换高亮时主题会给 <ul> 加类名，
       若带 transition: all 就会连着布局一起动画，点条目时看着卡 */
    body .column-left > .widget[data-type="toc"],
    body .column-left > .widget[data-type="toc"] * {
        transition: none !important;
    }

    /* ── 非阅读态（文章顶部的标题区）：保持自然高度 ──
       简介 / 分类 / 标签 / 目录 全都在，目录内容限高自己滚；
       这里不压高度，否则「更多」那组卡片会被截掉 */
    body .column-left > .widget:not([data-type="toc"]) {
        flex: 0 0 auto;
    }

    /* 阅读态：简介卡片直接收起，让最上面空出来放按钮和目录 */
    body.is-reading .column-left > .widget[data-type="profile"] {
        display: none;
    }

    /* 文章顶部（还没开始阅读）：左栏只留简介 + 本文分类 + 本文标签，
       目录卡片整张不显示。开始往下滚、进入阅读态才把目录亮出来 */
    body:not(.is-reading) .column-left > .widget[data-type="toc"] {
        display: none;
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

    /* 进 / 出各用一个阈值：在临界点上下小幅滚动时不会来回切布局 */
    function apply() {
        /* 没有目录的页面（首页 / 归档 / 标签…）不进入阅读态 */
        if (!document.getElementById('toc')) {
            if (body.classList.contains('is-reading')) {
                body.classList.remove('is-reading');
            }
            return;
        }

        var reading = body.classList.contains('is-reading');
        var want = reading
            ? window.pageYOffset > line - 48
            : window.pageYOffset > line;

        if (want === reading) {
            return;
        }

        body.classList.toggle('is-reading', want);
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

        /* 窄屏下目录是浮层（#toc.is-active + #toc-mask）：
           我们把点击拦下来了，主题的 toggleToc 不会执行，
           所以得自己把浮层关掉，否则会停在那层目录上不动 */
        var tocEl = document.getElementById('toc');
        if (tocEl && tocEl.classList.contains('is-active')) {
            tocEl.classList.remove('is-active');
            var maskEl = document.getElementById('toc-mask');
            if (maskEl) {
                maskEl.classList.remove('is-active');
            }
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

    /* 页面底部放一个收起 / 展开「分类与标签」的按钮：
       阅读时左栏只留目录，需要看分类/标签就点一下下面那颗 */
    var META_STATE = 'blog.left.meta.state.v2';

    function readMeta() {
        try {
            return window.localStorage.getItem(META_STATE);
        } catch (e) {
            return null;
        }
    }

    function saveMeta(state) {
        try {
            window.localStorage.setItem(META_STATE, state);
        } catch (e) {
            /* 隐私模式忽略 */
        }
    }

    function metaHidden() {
        return body.classList.contains('meta-hidden');
    }

    function setMeta(hidden) {
        body.classList.toggle('meta-hidden', hidden);
        body.classList.toggle('meta-shown', !hidden);
        var button = document.querySelector('.toc-meta-toggle');
        if (button) {
            syncMetaButton(button);
        }
    }

    function syncMetaButton(button) {
        var hidden = metaHidden();
        button.textContent = hidden ? '展开分类标签 ▼' : '收起分类标签 ▲';
        button.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    }

    function ensureMetaToggle() {
        var left = document.querySelector('.column-left');
        if (!left) {
            return;
        }

        var existing = null;
        for (var i = 0; i < left.children.length; i++) {
            if (left.children[i].classList.contains('toc-meta-toggle')) {
                existing = left.children[i];
                break;
            }
        }
        if (existing) {
            syncMetaButton(existing);
            return;
        }

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'toc-meta-toggle';
        button.addEventListener('click', function (event) {
            event.preventDefault();

            var hidden = !metaHidden();
            setMeta(hidden);
            saveMeta(hidden ? 'hidden' : 'shown');
        });

        /* 插在「简介」之后、分类/标签之前：
           阅读态简介被藏起来，按钮就落在左栏最上面，
           展开 / 收缩都在上面点，目录始终排在分类标签的下面 */
        var profile = left.querySelector('[data-type="profile"]');
        if (profile && profile.parentElement === left) {
            left.insertBefore(button, profile.nextSibling);
        } else {
            left.insertBefore(button, left.firstChild);
        }
        syncMetaButton(button);
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

    /* scroll 不冒泡，但捕获阶段能收到 */
    document.addEventListener('scroll', apply, { capture: true, passive: true });
    window.addEventListener('resize', refresh);

    function init() {
        /* 默认展开：只有用户亲手点过「收起」才收 */
        setMeta(readMeta() === 'hidden');
        ensureMetaToggle();
        refresh();
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

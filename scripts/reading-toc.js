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
/* 滚动条槽位始终预留：文章页会从“页面滚”变成“正文列滚”，
   不预留的话进出阅读态时内容会横向抽一下（少了一条滚动条的宽度） */
html {
    scrollbar-gutter: stable;
}

/* 目录下方那排小按钮（目录全部展开/收起、分类标签收起/展开）
   只在桌面档的阅读态出现：手机上目录是浮层，用不上 */
body .column-left > .toc-tools {
    display: none;
}

@media screen and (min-width: 769px) {
    /* 目录卡片内容统一限高，长目录在卡片里自己滚（不显示拖动条） */
    body .column-left > .widget[data-type="toc"] .card-content {
        max-height: min(52vh, 26rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
    }

    body .column-left > .widget[data-type="toc"] .card-content::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    /* 目录卡片下面那排小按钮（见 ensureTools）：
       左：目录全部展开 / 全部收起；右：分类标签收起 / 展开 */
    body .column-left > .toc-tools > button {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .3em;
        padding: .45rem .5rem;
        border: 1px solid rgba(128, 128, 128, .28);
        border-radius: 999px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: .8rem;
        line-height: 1.2;
        white-space: nowrap;
        opacity: .72;
        cursor: pointer;
    }

    body .column-left > .toc-tools > button:hover,
    body .column-left > .toc-tools > button:focus-visible {
        opacity: 1;
        outline: none;
    }

    /* 按钮排紧贴在目录卡片下方 */
    body.is-reading .column-left > .toc-tools {
        order: 2;
        margin-top: .75rem;
        display: flex;
        gap: .5rem;
    }

    /* 目录只留一级：把嵌套的 .menu-list 全收起来 */
    #toc.toc-flat .menu-list .menu-list {
        display: none;
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
        scrollbar-width: none;
    }

    /* 左右两栏各滚各的，但不显示拖动条（拖动条只留给正文那一列） */
    body.is-reading .column-left {
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
    }

    body.is-reading .column-left::-webkit-scrollbar,
    body.is-reading .column-right.is-sticky::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    /* ── 正文那一列自己滚，卡片跟左右两栏一样上下留白 ──────────
       滚动容器放在 .column-main 上（不是单张卡片）：
       这样 scrollbar 只占 91 ~ 1480 这一段，上下都离屏幕边缘有距离，
       而且评论卡片也在这条滚动区域里，滚到底就能看见，不会出现
       「两张卡片互相让位、评论永远够不着」那种毛病 */
    body.has-toc .column-main {
        position: sticky;
        top: 6.5rem;
        height: calc(100vh - 8.75rem);
        max-height: calc(100vh - 8.75rem);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, .35) transparent;
    }

    body.has-toc .column-main::-webkit-scrollbar {
        width: 8px;
    }

    body.has-toc .column-main::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, .35);
        border-radius: 4px;
    }

    body.has-toc .column-main::-webkit-scrollbar-track {
        background: transparent;
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

    /* 文章顶部（还没开读）右栏要整列都看得见：「最新文章」的条目由脚本
       按可用高度从下往上收（见 fitRightColumn），不在这里写死 */

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
    var line = 240;   /* 手机上正文标题区滚过的位置，load / resize / pjax 时重算 */

    /* 有目录的页面（文章页）立刻打上标记：正文那一列的「固定高度 + 自己滚」
       样式靠它生效，越早加上越不会闪一下 */
    function markTocPage() {
        if (document.getElementById('toc')) {
            body.classList.add('has-toc');
        } else {
            body.classList.remove('has-toc');
        }
    }

    markTocPage();

    function measure() {
        var card = document.querySelector('.column-main .article');
        if (!card) {
            line = 240;
            return;
        }
        var top = card.getBoundingClientRect().top + window.pageYOffset;
        line = Math.max(160, top - 96);
    }

    /* 桌面档下正文列自己滚（.column-main 是 sticky 的滚动容器），
       所以用它的 scrollTop 判断是不是已经开读；
       手机档没有那套样式，仍然看页面滚动 */
    function wide() {
        return window.matchMedia('(min-width: 769px)').matches;
    }

    function mainScroller() {
        return document.querySelector('.column-main');
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

        var box = mainScroller();
        var inner = box ? box.scrollTop : 0;
        var isWide = wide();
        var pos = isWide ? inner : window.pageYOffset;
        var reading = body.classList.contains('is-reading');
        var want = reading
            ? pos > 8
            : pos > (isWide ? 48 : line);

        if (want === reading) {
            return;
        }

        body.classList.toggle('is-reading', want);
        fitRightColumn();
    }

    /* ── 右栏要塞进一屏 ───────────────────────────────────────
       两个状态用同一套裁剪：进出阅读态时右栏的卡片、条数、高度都不变，
       只有正文那一列在换滚动方式。
       「最新文章」只留一条（完整列表太长，一条就把标签 / 日历挤到屏外）；
       一条都放不下就整张卡片收起，再不行把贡献日历也收掉 */
    /* 「最新文章」是最长的一张，放到右栏最下面：
       万一真的放不下，被挤出去的也是它自己，不会连累标签 / 日历 */
    function moveRecentToEnd() {
        var right = document.querySelector('.column-right');
        if (!right) {
            return;
        }
        var recent = right.querySelector('.widget[data-type="recent-posts"]');
        if (recent && right.lastElementChild !== recent) {
            right.appendChild(recent);
        }
    }

    function fitRightColumn() {
        var right = document.querySelector('.column-right');
        if (!right) {
            return;
        }

        var recent = right.querySelector('.widget[data-type="recent-posts"]');
        var calendar = right.querySelector('.widget[data-type="github_calendar"]');
        var items = recent
            ? [].slice.call(recent.querySelectorAll('.card-content > article.media'))
            : [];

        /* 每次先从“全部显示”重算，pjax / 尺寸变化才不会越藏越多 */
        items.forEach(function (item) {
            item.style.display = '';
        });
        if (recent) {
            recent.style.display = '';
        }
        if (calendar) {
            calendar.style.display = '';
        }

        /* 阅读态右栏是固定高度（内容多时卡片内部滚），
           所以“放不放得下”要看最后一张卡片自己的底边，不能看列元素的底边 */
        var limit = window.innerHeight - 24;
        var fits = function () {
            var kids = right.children;
            var last = null;
            for (var k = 0; k < kids.length; k++) {
                if (kids[k].offsetHeight > 0) {
                    last = kids[k];
                }
            }
            return !last || last.getBoundingClientRect().bottom <= limit;
        };

        if (fits()) {
            return;
        }

        /* 「最新文章」只留最新一条；连这一条都放不下就把整张卡片收起来 */
        for (var i = 1; i < items.length; i++) {
            items[i].style.display = 'none';
        }

        if (fits()) {
            return;
        }

        if (recent) {
            recent.style.display = 'none';
        }
        if (fits()) {
            return;
        }

        if (calendar) {
            calendar.style.display = 'none';
        }
    }

    function refresh() {
        measure();
        apply();
        moveRecentToEnd();
        fitRightColumn();
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

    /* 目录卡片下面那排按钮：
       左：目录全部展开 / 全部收起；右：本文分类 / 本文标签收起 / 展开 */
    var META_STATE = 'blog.left.meta.state.v2';
    var TOC_STATE = 'blog.toc.state';

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

    /* ── 目录层级：全部展开 / 全部收起 ─────────────────────
       收起时只留一级标题（CSS 里 #toc.toc-flat 把嵌套的 .menu-list 藏掉），
       默认展开，选过的记在 localStorage */
    function tocFlat() {
        var toc = document.getElementById('toc');
        return !!toc && toc.classList.contains('toc-flat');
    }

    function syncLevelButton(button) {
        var flat = tocFlat();
        if (button) {
            button.textContent = flat ? '目录全部展开 ▼' : '目录全部收起 ▲';
            button.setAttribute('aria-expanded', flat ? 'false' : 'true');
        }
    }

    function setTocFlat(flat) {
        var toc = document.getElementById('toc');
        if (!toc) {
            return;
        }
        toc.classList.toggle('toc-flat', flat);
        syncLevelButton(document.querySelector('.toc-level-toggle'));
    }

    function readTocState() {
        try {
            return window.localStorage.getItem(TOC_STATE);
        } catch (e) {
            return null;
        }
    }

    function saveTocState(flat) {
        try {
            window.localStorage.setItem(TOC_STATE, flat ? 'flat' : 'full');
        } catch (e) {
            /* 隐私模式忽略 */
        }
    }

    function ensureTools() {
        var left = document.querySelector('.column-left');
        if (!left) {
            return;
        }

        var tools = null;
        for (var i = 0; i < left.children.length; i++) {
            if (left.children[i].classList.contains('toc-tools')) {
                tools = left.children[i];
                break;
            }
        }

        if (!tools) {
            tools = document.createElement('div');
            tools.className = 'toc-tools';

            var level = document.createElement('button');
            level.type = 'button';
            level.className = 'toc-level-toggle';
            level.addEventListener('click', function (event) {
                event.preventDefault();
                var flat = !tocFlat();
                setTocFlat(flat);
                saveTocState(flat);
            });

            var meta = document.createElement('button');
            meta.type = 'button';
            meta.className = 'toc-meta-toggle';
            meta.addEventListener('click', function (event) {
                event.preventDefault();

                var hidden = !metaHidden();
                setMeta(hidden);
                saveMeta(hidden ? 'hidden' : 'shown');
            });

            tools.appendChild(level);
            tools.appendChild(meta);

            /* 插在「简介」之后：阅读态简介被藏起来，这排按钮就落在左栏最上面，
               目录始终排在它们下面 */
            var profile = left.querySelector('[data-type="profile"]');
            if (profile && profile.parentElement === left) {
                left.insertBefore(tools, profile.nextSibling);
            } else {
                left.insertBefore(tools, left.firstChild);
            }
        }

        syncLevelButton(tools.querySelector('.toc-level-toggle'));
        syncMetaButton(tools.querySelector('.toc-meta-toggle'));
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
        markTocPage();
        /* 默认展开：只有用户亲手点过「收起」才收 */
        setMeta(readMeta() === 'hidden');
        setTocFlat(readTocState() === 'flat');
        ensureTools();
        refresh();
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

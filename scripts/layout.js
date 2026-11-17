/* global hexo */

'use strict';

/**
 * 三栏布局 + 顶部阅读进度条
 *
 * 文章页（/posts/…）：
 *   · 整页滚动，三栏一起上去
 *   · 左栏 简介 → 分类 → 标签 → 目录，上面几张顶出去后只剩目录吸顶
 *   · 右栏 分类 → 归档 → 标签 → 日历 → 最新文章，顶出去后只剩最新文章吸顶
 *   · 目录比一屏高时卡片内自己滚，保证整份能看完
 *
 * 栏目页（主页 / 搜索 / 归档 / 分类 / 标签 / 关于）：
 *   · 没有会展开收起的内容，左右两栏整栏吸顶不动，中间列表照常滚
 *   · 一屏装不下（矮屏）时整栏内滚，卡片一张不丢
 *   · 「最新文章」只属于文章页，栏目页不显示
 *
 * 吸顶对象由脚本打标记决定，样式只认标记：
 *   [data-sticky]      卡片级吸顶（文章页的目录 / 最新文章）
 *   [data-sticky-col]  整栏吸顶（栏目页的左右栏）
 * 想换吸顶的卡片，只改下面的 STICKY_WIDGETS 一处即可。
 */

/* ── 构建期常量 ────────────────────────────────────────────
   permalink 前缀从站点配置推导，不写死 /posts/：
   以后改 permalink（或挂到子目录）时，文章页判断不会失效 */
const POST_PREFIX = '/' + String(hexo.config.permalink || 'posts/:title/').split('/')[0] + '/';
const BUILD = String(Date.now());

const style = `<style id="site-layout">
/* 滚动条槽位始终预留：进文章页时内容宽度不会横向抽一下 */
html {
    scrollbar-gutter: stable;
}

/* 顶部阅读进度条：宽度由脚本直接写百分比，
   不用 transform: scaleX()（缩放走合成层，个别驱动/缩放比下会被忽略） */
.site-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 3px;
    z-index: 2000;
    background: #3273dc;
    pointer-events: none;
}

/* 主题自带的另一条进度条：default.styl 用 CSS 滚动时间轴画的
   body:has(.card-content.article h1.title)::after，跟的是 scroll(root)。
   本站正文列不滚、整页滚，它的时间轴未必激活，一旦不激活就会退化成
   一条 100% 宽的满格蓝线，所以只掐这一条（别写成 body::after 一刀切，
   主题以后若用 body 伪元素做别的事会被误伤） */
@supports (animation-timeline: scroll()) {
    body:has(.card-content.article h1.title)::after {
        display: none !important;
    }
}

/* 折叠右栏后搬过来的卡片中间那条「更多」隔断：新版布局里用不上 */
body.col-scroll .column-left > .sb-split {
    display: none !important;
}

/* 「最新文章」只在文章页显示。按 data-type 藏、不写父级：
   宽屏右栏那份、.column-right-shadow 里给窄屏准备的那份、
   以及被搬进左栏的那份，一次盖住 */
body:not(.is-post-page) .widget[data-type="recent-posts"] {
    display: none !important;
}

/* giscus 是异步加载的：到页面最底时它才撑高，页面高度一跳，
   左右吸住的卡片就跟着“动一下”。先给它把位置占住。
   文章页的主题评论区、栏目页自己插的评论区都命中这两个 id/类 */
body .giscus,
body #giscus-thread {
    min-height: 440px;
}

/* 贡献日历也要等图片加载，同样先占位 */
body .widget[data-type="github_calendar"] {
    min-height: 190px;
}

/* ── 公共：三栏回到正常文档流（≥769px 才有侧栏）──────────────
   高度交给 flex 拉伸（和正文一样长），不要固定成 100vh：
   只有这样，柱子里最后那张卡片才能在文章任意位置继续吸住。
   注意不要在这里写 display：主题靠 is-hidden-touch / is-hidden-desktop-only
   在窄窗口隐藏右栏，一旦被强制 display 打开，就会出现
   「右栏 + 左栏里的影子副本」两份同样的卡片 */
@media screen and (min-width: 769px) {
    body.col-scroll .column-left,
    body.col-scroll .column-right {
        position: static;
        align-self: stretch;
        height: auto;
        max-height: none;
        overflow: visible;
        padding-bottom: 0;
    }

    body.col-scroll .column-main {
        position: static;
        height: auto;
        max-height: none;
        overflow: visible;
    }

    /* 卡片级吸顶：top = 顶栏下沿 + 栏内留白（首卡与正文卡片同一条线）。
       标记值带上了所属栏（left / right）：侧栏折叠时 sidebar-toggle.js 会把右栏
       卡片搬到左栏，如果只写 [data-sticky]，搬过去的卡片还会吸顶，
       和左栏的目录叠在一起。限定「还在原本那栏里」才生效 */
    body.col-scroll .column-left > [data-sticky="left"],
    body.col-scroll .column-right > [data-sticky="right"] {
        position: sticky;
        top: calc(var(--site-top, 6.5rem) + var(--site-inset, 0.75rem));
        /* 自身高度 + top 恒小于视口高 → 滚到页面最底时
           不会被容器底边往上顶（那一下就是「到底时卡片动一下」），
           下沿也留出和页面上边一样的 --site-edge */
        max-height: calc(100vh - var(--site-top, 6.5rem) - var(--site-inset, 0.75rem) - var(--site-edge, 3rem));
        /* 卡片本身不滚（圆角、阴影保持完整），只让里面的内容区滚 */
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    body.col-scroll .column-left > [data-sticky="left"] > .card-content,
    body.col-scroll .column-right > [data-sticky="right"] > .card-content {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
    }
}

/* ── 栏目页：整栏吸顶不动 ────────────────────────────────
   栏自己带 10.5px 内边距，所以 top 直接取 --site-top；
   加 --site-card-pad 的话首卡会比正文低 10.5px（踩过一次） */
@media screen and (min-width: 769px) {
    body.col-scroll .column-left[data-sticky-col],
    body.col-scroll .column-right[data-sticky-col] {
        position: sticky;
        top: var(--site-top, 6.5rem);
        align-self: start;
        /* 下沿和页面上边一样留 --site-edge：滚到底时上下距离一致 */
        max-height: calc(100vh - var(--site-top, 6.5rem) - var(--site-edge, 3rem));
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
        /* 万一样内还是被接管滚动了，让卡片整张对齐，不会“抖” */
        scroll-snap-type: y proximity;
    }

    body.col-scroll [data-sticky-col] > .widget {
        scroll-snap-align: start;
    }

    /* 滚动条默认隐形，鼠标移上去才露出来（不挡视线，又能看出还能滚） */
    body.col-scroll .column-left[data-sticky-col]:hover,
    body.col-scroll .column-right[data-sticky-col]:hover {
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, .45) transparent;
    }

    body.col-scroll .column-left[data-sticky-col]::-webkit-scrollbar,
    body.col-scroll .column-right[data-sticky-col]::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    body.col-scroll .column-left[data-sticky-col]:hover::-webkit-scrollbar,
    body.col-scroll .column-right[data-sticky-col]:hover::-webkit-scrollbar {
        width: 6px;
    }

    body.col-scroll .column-left[data-sticky-col]:hover::-webkit-scrollbar-thumb,
    body.col-scroll .column-right[data-sticky-col]:hover::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, .45);
        border-radius: 3px;
    }
}

/* ── 宽屏（三栏，Bulma widescreen ≥1214px）──────────────
   左栏尾部那份「右栏影子副本」和搬移残留必须是隐藏的：
   主题只在窄屏把右栏合并进左栏时才显示它们，
   一旦露出来同一张卡片就会在左右两栏各出现一次。
   display:none 的 !important 是为压过 Bulma 的 is-hidden-* 工具类，别删 */
@media screen and (min-width: 1214px) {
    body.col-scroll .column-left > .column-right-shadow,
    body.col-scroll:not(.sb-right-hidden) .column-left > [data-sb-moved] {
        display: none !important;
    }
}
</style>`;

const script = `<script id="site-layout-script">
(function () {
    'use strict';

    /* 构建期注入 */
    var POST_PREFIX = ${JSON.stringify(POST_PREFIX)};
    var BUILD = ${JSON.stringify(BUILD)};

    /* 文章页里各自吸顶的卡片。换吸顶卡只改这一处 */
    var STICKY_WIDGETS = [
        '.column-left > .widget[data-type="toc"]',
        '.column-right > .widget[data-type="recent-posts"]'
    ];

    var DEBUG = /(^|[?&])debug=1(&|$)/.test(window.location.search);

    var body = document.body;
    var bar = null;
    var scrollEvents = 0;
    var frame = 0;

    function isPostPage() {
        return window.location.pathname.indexOf(POST_PREFIX) === 0;
    }

    /* 进度条元素：pjax 只换 #container，但换了 pjax 实现就可能被换掉，
       所以每次 init 校验它是否还在文档里 */
    function ensureBar() {
        if (bar && document.contains(bar)) {
            return;
        }
        bar = document.getElementById('site-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'site-progress';
            bar.className = 'site-progress';
            bar.setAttribute('aria-hidden', 'true');
            body.appendChild(bar);
        }
    }

    /* 标记谁吸顶：
       · 文章页 → 目录 / 最新文章（卡片级，data-sticky）
       · 栏目页 → 左右整栏（data-sticky-col）
       每次 init 先清空再重打，pjax 换页也不会残留 */
    function markSticky() {
        var nodes = document.querySelectorAll('[data-sticky], [data-sticky-col]');
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].removeAttribute('data-sticky');
            nodes[i].removeAttribute('data-sticky-col');
        }

        var targets = isPostPage()
            ? STICKY_WIDGETS
            : ['.column-left', '.column-right'];

        for (var j = 0; j < targets.length; j++) {
            var list = document.querySelectorAll(targets[j]);
            for (var k = 0; k < list.length; k++) {
                /* 值 = 它现在所在的栏：搬走后就不该再吸顶了 */
                var inLeft = list[k].parentElement
                    && list[k].parentElement.classList.contains('column-left');
                list[k].setAttribute(isPostPage() ? 'data-sticky' : 'data-sticky-col', isPostPage() ? (inLeft ? 'left' : 'right') : '');
            }
        }
    }

    /* 「最新文章」排到所在栏的最后：右栏顺序是
       分类 → 归档 → 标签 → 日历 → 最新文章，它才好在最下面吸住 */
    function moveRecentToEnd() {
        var list = document.querySelectorAll('.widget[data-type="recent-posts"]');
        for (var i = 0; i < list.length; i++) {
            var w = list[i];
            /* 窄屏用的那份副本（.column-right-shadow）不要动 */
            if (w.closest && w.closest('.column-right-shadow')) {
                continue;
            }
            var col = w.parentElement;
            if (col && col.lastElementChild !== w) {
                col.appendChild(w);
            }
        }
    }

    /* ── 顶部阅读进度条：整页滚了多少就是多少 ──────────────
       主题自带的 Pace 只认页面加载，读文章时量不到，所以自己画 */
    function paint() {
        if (!bar) {
            return;
        }

        var room = document.documentElement.scrollHeight - window.innerHeight;
        var done = room > 1 ? (window.pageYOffset || 0) / room : 0;
        if (!(done > 0)) {
            done = 0;
        }
        done = Math.min(1, done);

        bar.style.width = (done * 100).toFixed(2) + '%';
        bar.setAttribute('data-progress', done.toFixed(4));
        bar.setAttribute('data-build', BUILD);

        if (DEBUG) {
            debugBadge(done, room);
        }
    }

    /* 滚动时每帧只画一次：读 scrollHeight 会触发同步布局，滚动里反复读会掉帧 */
    function schedule() {
        if (frame) {
            return;
        }
        frame = requestAnimationFrame(function () {
            frame = 0;
            paint();
        });
    }

    /* ── 排错用的小角标：只有 URL 带 ?debug=1 才出现 ────── */
    function debugBadge(done, room) {
        var box = document.getElementById('site-debug');
        if (!box) {
            box = document.createElement('div');
            box.id = 'site-debug';
            box.setAttribute('aria-hidden', 'true');
            box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:3000;'
                + 'font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre;'
                + 'background:rgba(0,0,0,.82);color:#9be89b;padding:6px 8px;border-radius:4px;'
                + 'pointer-events:none;';
            document.body.appendChild(box);
        }

        /* 用 fromCharCode 换行：模板字符串里写 \\n 会被吃掉一层转义，踩过坑 */
        box.textContent = [
            'build   ' + BUILD,
            'post    ' + isPostPage(),
            'pageY   ' + Math.round(window.pageYOffset || 0),
            'room    ' + Math.round(room),
            'progress ' + done.toFixed(4),
            'events  ' + scrollEvents,
            'vw/vh   ' + window.innerWidth + 'x' + window.innerHeight
        ].join(String.fromCharCode(10));
    }

    function onScroll() {
        scrollEvents++;
        schedule();
    }

    /* 整页滚动：窗口的 scroll 就够，document 捕获兜底（某些环境下前者会漏） */
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });

    /* 页面总高度会晚一步变（字体、图片、贡献日历、评论 iframe），
       用 ResizeObserver 盯 body，比几个 setTimeout 猜时序可靠 */
    function watchHeight() {
        if (!window.ResizeObserver) {
            return;
        }
        if (watchHeight.observer) {
            watchHeight.observer.disconnect();
        }
        watchHeight.observer = new ResizeObserver(schedule);
        watchHeight.observer.observe(document.body);
    }

    function init() {
        ensureBar();

        body.classList.toggle('col-scroll', !!document.querySelector('.column-main'));
        body.classList.toggle('is-post-page', isPostPage());

        moveRecentToEnd();
        markSticky();
        watchHeight();

        /* 首帧同步画一次：标签页不可见时 rAF 不会跑，先给个正确初值 */
        paint();
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);

    /* 脚本挂在 body 末尾，结构已解析完，先跑一次 */
    ensureBar();
    body.classList.toggle('col-scroll', !!document.querySelector('.column-main'));
    body.classList.toggle('is-post-page', isPostPage());
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

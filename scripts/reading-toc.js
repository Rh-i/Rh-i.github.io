/* global hexo */

'use strict';

/**
 * 三栏布局 + 顶部阅读进度条
 *
 * 和上一版的区别：不再区分「标题态 / 阅读态」，也不再有展开/收起按钮。
 *   · 整页滚动：滚轮一动，左、中、右三栏一起往上去
 *   · 左栏：简介 → 分类 → 标签 → 目录；上面几张被顶出去后，只剩目录挂在顶上
 *   · 右栏：分类 → 归档 → 标签 → 日历 → 最新文章；上面几张顶出去后，只剩最新文章
 *   · 目录不单独滚，跟着页面走，能看见多少算多少
 *   · 手机上不动，沿用主题自己的做法（左栏变浮层、右栏收起）
 *
 * 实现要点只有一条：左右栏的最后一张卡片 position: sticky。
 * 三栏在 flex 里本来是等高的（和正文一样长），所以这两张卡片
 * 能一路吸在顶上，直到文章结束。
 */

const style = `<style id="site-reading-toc">
/* 滚动条槽位始终预留：进文章页时内容宽度不会横向抽一下 */
html {
    scrollbar-gutter: stable;
}

/* 顶部阅读进度条 */
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

/* 主题自带的另一条进度条：default.styl 里用 CSS 滚动时间轴画的
   body:has(.card-content.article h1.title)::after，跟的是 scroll(root)。
   它和本站的滚动方式不一定对得上，动画一旦不激活就会退化成
   一条 100% 宽的满格蓝线，因此统一关掉，只留上面那条 */
body::after,
body:has(.card-content.article h1.title)::after {
    display: none !important;
}

/* 折叠右栏后搬过来的卡片中间那条「更多」隔断：新版布局里用不上 */
body.col-scroll .column-left > .sb-split {
    display: none !important;
}

/* 「最新文章」只在文章页显示。
   首页 / 搜索 / 归档 / 分类 / 标签 / 关于 这些栏目页不要它。
   直接按 data-type 藏，不写父级：宽屏右栏那份、.column-right-shadow 里
   给窄屏准备的那份、以及被搬进左栏的那份，一次性盖住 */
body:not(.is-post-page) .widget[data-type="recent-posts"] {
    display: none !important;
}

@media screen and (min-width: 769px) {
    /* ── 三栏都回到正常文档流，跟着整页一起滚 ──────────────
       高度交给 flex 拉伸（和正文一样长），不要固定成 100vh：
       只有这样，左右栏最后那张卡片才能在文章任意位置继续吸住 */
    body.col-scroll .column-left,
    body.col-scroll .column-right {
        display: block !important;
        position: static;
        align-self: stretch;
        height: auto;
        max-height: none;
        overflow: visible;
        padding-bottom: 0;
    }

    /* ── 滚过上面那几张后，左边只剩目录、右边只剩最新文章 ──
       top 与正文卡片顶边同高（顶栏 6.5rem + 栏内留白 .75rem） */
    body.col-scroll .column-left > .widget[data-type="toc"],
    body.col-scroll .column-right > .widget[data-type="recent-posts"] {
        position: sticky;
        top: calc(6.5rem + .75rem);
    }

    /* 目录内容限高：目录短时这条不起作用（没滚动条）；
       目录比一屏高时才生效，卡片内自己滚，保证整份都能看完 */
    body.col-scroll .column-left > .widget[data-type="toc"] > .card-content {
        max-height: calc(100vh - 12rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
    }

    /* ── 正文列不再是滚动容器，和左右两栏一起由整页带着走 ── */
    body.col-scroll .column-main {
        position: static;
        height: auto;
        max-height: none;
        overflow: visible;
    }
}
</style>`;

const script = `<script id="site-reading-toc-script">
(function () {
    'use strict';

    var body = document.body;
    var BUILD = 'layout-1';
    var DEBUG = /(^|[?&])debug=1(&|$)/.test(window.location.search);

    /* pjax 会换掉整块 DOM，init 时重新取一次 */
    var el = { main: null, left: null, right: null, bar: null };
    var events = 0;

    function cache() {
        el.main = document.querySelector('.column-main');
        el.left = document.querySelector('.column-left');
        el.right = document.querySelector('.column-right');

        /* 布局样式挂在这个类上；没有正文列的页面（404 之类）不启用 */
        body.classList.toggle('col-scroll', !!el.main);

        /* 文章页标记（permalink 就是 /posts/:title/）：「最新文章」卡只在它上面显示。
           pjax 换页后 cache() 会重新算一次。
           这里不用正则：模板字符串里的反斜杠会被吃掉一层，写成 indexOf 更稳 */
        var path = window.location.pathname;
        body.classList.toggle('is-post-page', path.indexOf('/posts/') === 0);

        if (!el.bar) {
            el.bar = document.createElement('div');
            el.bar.className = 'site-progress';
            body.appendChild(el.bar);
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

    /* 目录卡片比一屏还高时，卡片内容自己滚（max-height 写在样式里），
       否则吸顶之后下半截永远露不出来 */

    /* ── 顶部阅读进度条：整页滚了多少就是多少 ──────────────
       主题自带的 Pace 只认页面加载，读文章时它量不到；
       这里按「页面滚了多少 / 还能滚多少」自己画一条 */
    function scrollPos() {
        return window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function paint() {
        if (!el.bar) {
            return;
        }

        var room = document.documentElement.scrollHeight - window.innerHeight;
        var done = room > 1 ? scrollPos() / room : 0;
        if (!(done > 0)) {
            done = 0;
        }
        done = Math.min(1, done);

        el.bar.style.width = (done * 100).toFixed(2) + '%';
        el.bar.setAttribute('data-progress', done.toFixed(4));
        el.bar.setAttribute('data-build', BUILD);

        if (DEBUG) {
            debugBadge(done, room);
        }
    }

    /* ── 排错用的小角标：只有 URL 带 ?debug=1 才出现 ──────
       把「滚了多少 / 还能滚多少 / 算出的比例」摊在屏幕右下角 */
    function debugBadge(done, room) {
        var box = document.getElementById('site-debug');
        if (!box) {
            box = document.createElement('div');
            box.id = 'site-debug';
            box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:3000;'
                + 'font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre;'
                + 'background:rgba(0,0,0,.82);color:#9be89b;padding:6px 8px;border-radius:4px;'
                + 'pointer-events:none;';
            document.body.appendChild(box);
        }

        box.textContent = [
            'build   ' + BUILD,
            'pageY   ' + Math.round(scrollPos()),
            'room    ' + Math.round(room),
            'progress ' + done.toFixed(4),
            'events  ' + events,
            'vw/vh   ' + window.innerWidth + 'x' + window.innerHeight
        ].join('\\n');
    }

    function onScroll() {
        events++;
        paint();
    }

    /* 整页滚动：窗口的 scroll 就够，再挂一个 document 捕获兜底 */
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });

    /* 图片、字体、贡献日历晚一步撑高页面时，分母会变 */
    window.addEventListener('resize', paint);
    window.addEventListener('load', paint);

    function init() {
        cache();
        moveRecentToEnd();
        paint();

        /* 卡片高度晚一步变化（字体、图片、日历脚本）可能改变页面总高度 */
        [200, 600, 1200, 2000].forEach(function (ms) {
            setTimeout(paint, ms);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);

    /* 脚本挂在 body 末尾，此时结构已经解析完，先跑一次 */
    cache();
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

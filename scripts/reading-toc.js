/* global hexo */

'use strict';

/**
 * 文章页的两个状态：
 *   · 标题态（正文还没开始滚）：左栏 = 简介 + 本文分类 + 本文标签（不显示目录）
 *   · 阅读态（正文开始滚）：左栏 = 目录 + 按钮排 + 本文分类 + 本文标签
 *
 * 起因：左栏原本「简介 + 分类 + 标签 + 目录」堆在一起，比视口还高；
 * 左栏是 is-sticky 吸附的，比视口高的吸附元素底部永远露不出来，
 * 于是正文读到哪里，目录都还在屏幕外。
 *
 * 结构：
 *   1. 样式：左/右/中三栏的尺寸与排序全部写在这里，不碰主题源码
 *   2. 滚动：正文那一列（.column-main）自己滚，滚动条只在卡片区内；
 *      顶部进度条按它滚了多少画（updateProgress）
 *   3. 阅读态：body.is-reading 由正文滚动量决定（apply）
 *   4. 目录：点条目瞬时跳转 + 高亮锁定，不用主题的平滑滚动
 *   5. 按钮排：目录全部展开/收起、分类标签收起/展开，状态存 localStorage
 *   6. 右栏：最新文章排到最后；标题态按可用高度裁剪，阅读态整张展开
 *
 * 布局（三栏等高、正文列自己滚）对任何有 .column-main 的页面生效；
 * 阅读态那套左栏切换只对文章页（有 #toc）生效。
 */

const style = `<style id="site-reading-toc">
/* 滚动条槽位始终预留：文章页会从“页面滚”变成“正文列滚”，
   不预留的话进出阅读态时内容会横向抽一下（少了一条滚动条的宽度） */
html {
    scrollbar-gutter: stable;
}

/* 目录卡片底部的按钮排（目录全部展开/收起、分类标签收起/展开）：
   默认不显示，只有阅读态的桌面档才露出来（手机上目录是浮层，用不上） */
body .column-left > .widget[data-type="toc"] > .toc-tools {
    display: none;
}

/* 顶部阅读进度条（替掉主题那条只会卡住的载入进度条，见脚本 updateProgress） */
.site-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 2000;
    background: #3273dc;
    transform: scaleX(0);
    transform-origin: 0 50%;
    pointer-events: none;
}

/* 折叠右栏后搬过来的卡片中间那条「更多」隔断：新的三栏布局里卡片高度由脚本
   撑满 / 裁剪，这条隔断既拉不高也收不起，在窄窗口里只会被拉成一根长条，所以不显示 */
body.col-scroll .column-left > .sb-split {
    display: none !important;
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

    /* 目录卡片底部的按钮排（见 ensureTools）：
       左：目录全部展开 / 全部收起；右：分类标签收起 / 展开。
       放在卡片里面而不是卡片下面 —— 卡片自己就是整栏高度，
       卡片底边才能和正文、右栏对齐 */
    body .column-left > .widget[data-type="toc"] > .toc-tools {
        flex: 0 0 auto;
        gap: .5rem;
        padding: .6rem 1.5rem .9rem;
        border-top: 1px solid rgba(128, 128, 128, .16);
    }

    body.is-reading .column-left > .widget[data-type="toc"] > .toc-tools {
        display: flex;
    }

    body .column-left > .widget[data-type="toc"] > .toc-tools > button {
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

    body .column-left > .widget[data-type="toc"] > .toc-tools > button:hover,
    body .column-left > .widget[data-type="toc"] > .toc-tools > button:focus-visible {
        opacity: 1;
        outline: none;
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

    /* 「本文分类」「本文标签」默认展开，只有阅读态里点了按钮才收起。
       收起只在阅读态生效：按钮只在那里出现，标题态把卡片藏了就再也点不回来 */
    body.is-reading.meta-hidden .column-left > .post-meta-widget {
        display: none;
    }

    /* ── 三栏等高，整页正好一屏（不外滚）────────────────────
       10.25rem = 上留白 42 + 顶栏 59 + 下留白 42。三栏用同一个高度，
       底边自然对齐；页面本身也正好一屏，窗口再矮也不会出现“两侧跟着滚”。
       内容放不下时：右栏由脚本裁剪，左栏自己内部滚（拖动条隐藏） */
    body.col-scroll .column-left,
    body.col-scroll .column-right {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 10.25rem);
        max-height: calc(100vh - 10.25rem);
        overflow: hidden;
        padding-bottom: 0;
    }

    /* 卡片不许被压缩：内容多时宁可溢出（由脚本裁剪）也不要挤扁 */
    body.col-scroll .column-left > *,
    body.col-scroll .column-right > * {
        flex: 0 0 auto;
    }

    /* ── 阅读态：左栏压进一屏，只给目录和那排按钮 ──────────
       目录 flex 撑满剩余高度：分类/标签收起时它顶满整栏；
       展开分类/标签后目录自动缩回去，两者加起来也正好占满 */
    body.is-reading .column-left {
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
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

    /* 阅读态右栏内容超出时整栏自己滚（拖动条隐藏） */
    body.is-reading .column-right.is-sticky {
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
    body.col-scroll .column-main {
        /* 吸附点比左右两栏的顶边（6.5rem）再下移 .75rem，也就是直接贴在
           「左栏内边距之外」那一行上：左右两栏首卡的 top 是
           6.5rem + .75rem，这里不靠 padding / border 顶出来，所以不会被
           浏览器按设备像素取整（border 10.5 会被取成 10，差 0.5px），
           三栏首卡顶边严格相等 */
        position: sticky;
        top: calc(6.5rem + .75rem);
        /* 高度跟着下移量一起减掉 .75rem，底边仍和左右两栏一致 */
        height: calc(100vh - 11rem);
        max-height: calc(100vh - 11rem);
        overflow-y: auto;
        /* 顶部留白不能用 padding：scroll 容器的内边距是“内容的一部分”，
           一滚就跟着走了，正文卡片会顶到顶栏下面 */
        padding-top: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, .35) transparent;
    }

    body.col-scroll .column-main::-webkit-scrollbar {
        width: 8px;
    }

    body.col-scroll .column-main::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, .35);
        border-radius: 4px;
    }

    body.col-scroll .column-main::-webkit-scrollbar-track {
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

    /* 桌面档才有「正文列自己滚」那套样式（见上面的 media query）；
       手机档没有，仍然看页面滚动 */
    var WIDE = window.matchMedia('(min-width: 769px)');

    var META_STATE = 'blog.left.meta.state.v2';   /* 本文分类 / 本文标签 收起状态 */
    var TOC_STATE = 'blog.toc.state';             /* 目录是否只留一级 */

    /* localStorage 读写统一走这两个：隐私模式下会抛异常，直接吞掉 */
    function stored(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function store(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            /* 隐私模式忽略 */
        }
    }

    /* ── 元素缓存 ──────────────────────────────────
       pjax 会整块换掉 DOM，init 时重新取一次；滚动回调里不再查 DOM */
    var el = { main: null, left: null, right: null, toc: null, bar: null };
    var line = 240;    /* 手机档：正文标题区滚过多少像素算开读 */
    var frame = 0;     /* 进度条的 rAF 句柄，0 表示本帧还没排 */

    function cache() {
        el.main = document.querySelector('.column-main');
        el.left = document.querySelector('.column-left');
        el.right = document.querySelector('.column-right');
        el.toc = document.getElementById('toc');

        /* 正文那列的「固定高度 + 自己滚」样式靠这个类生效，
           脚本一解析就加上，避免首屏闪一下 */
        body.classList.toggle('col-scroll', !!el.main);

        if (!el.bar) {
            el.bar = document.createElement('div');
            el.bar.className = 'site-progress';
            body.appendChild(el.bar);
        }
    }

    function isReading() {
        return body.classList.contains('is-reading');
    }

    function measure() {
        var card = el.main && el.main.querySelector('.article');
        if (!card) {
            line = 240;
            return;
        }
        line = Math.max(160, card.getBoundingClientRect().top + window.pageYOffset - 96);
    }

    /* 正文列是否已经作为滚动容器（桌面档的所有页面都是） */
    function mainScrolls() {
        return WIDE.matches && body.classList.contains('col-scroll') && !!el.main;
    }

    /* ── 顶部阅读进度条 ────────────────────────────
       主题自带的 Pace 只认页面加载：文章页的滚动其实发生在 .column-main
       里，它量不到，还会被评论组件拖住卡在某个百分比。
       所以 _config.icarus.yml 里 progressbar 关掉，这里按「正文列滚了多少」
       自己画一条（手机上退化成整页进度） */
    function paintProgress() {
        if (!el.bar) {
            return;
        }
        frame = 0;

        var pageRoom = document.documentElement.scrollHeight - window.innerHeight;
        var done = 0;
        var room = 0;

        if (mainScrolls()) {
            room = el.main.scrollHeight - el.main.clientHeight;
            /* 正文列刚好一屏（没得滚）时别把进度条钉在 0：那时真正在滚的是
               整页，跟着页面走 */
            done = room > 1 ? el.main.scrollTop / room
                : (pageRoom > 1 ? window.pageYOffset / pageRoom : 0);
        } else {
            done = pageRoom > 1 ? window.pageYOffset / pageRoom : 0;
        }

        el.bar.style.transform = 'scaleX('
            + Math.max(0, Math.min(1, done)).toFixed(4) + ')';
    }

    /* 滚动事件一秒能来上百次，每帧只算一次就够，省得反复读 scrollHeight
       触发同步布局（滚动时读布局最容易掉帧） */
    function updateProgress() {
        if (!el.bar || frame) {
            return;
        }
        frame = requestAnimationFrame(paintProgress);
    }

    /* 当前位置：桌面档看正文列的 scrollTop，手机档看页面 */
    function scrollPos() {
        return mainScrolls() ? el.main.scrollTop : window.pageYOffset;
    }

    /* ── 阅读态：进 / 出各用一个阈值，临界点上下小幅滚动不会来回抖 ── */
    function apply() {
        /* 没有目录的页面（首页 / 归档 / 标签…）永远不进阅读态 */
        if (!el.toc) {
            body.classList.remove('is-reading');
            return;
        }

        var pos = scrollPos();
        var reading = isReading();
        var want = reading
            ? pos > 8                       /* 快滚回最上面才退出 */
            : pos > (WIDE.matches ? 48 : line);

        if (want === reading) {
            return;
        }

        body.classList.toggle('is-reading', want);

        if (want && el.right) {
            /* 阅读态右栏固定高度、自己滚（拖动条隐藏），进来要回到最上面 */
            el.right.scrollTop = 0;
        }

        layoutColumns();
    }

    /* ── 右栏要塞进一屏（只在标题态）────────────────────────────
       标题态下页面不会滚，右栏超出的部分就是永远看不见，所以要裁：
       「最新文章」只留一条，一条都放不下就整张收起，再不行收贡献日历。
       阅读态不裁——最新文章已经排在右栏最下面，整张展开只会往下长，
       上面的分类 / 归档 / 标签 / 日历位置完全不变，跟标题态一模一样；
       多出来的部分交给右栏自己滚（拖动条已隐藏） */
    /* 「最新文章」是最长的一张，排到最下面：
       万一放不下，被挤出去的也只是它自己，不会连累标签 / 日历 */
    function moveRecentToEnd() {
        if (!el.right) {
            return;
        }
        var recent = el.right.querySelector('.widget[data-type="recent-posts"]');
        if (recent && el.right.lastElementChild !== recent) {
            el.right.appendChild(recent);
        }
    }

    /* ── 侧栏布局工具 ─────────────────────────────────
       两栏共用：复位、量高度、往上收卡片 */
    function resetColumn(col) {
        if (!col) {
            return;
        }
        var kids = col.children;
        for (var i = 0; i < kids.length; i++) {
            kids[i].style.flexGrow = '';
            kids[i].style.display = '';
        }
    }

    /* 整列放不放得下：看最后一张可见卡片的底边。
       栏底 = 视口 - 42（下留白），再留 8px 余量 */
    function columnFits(col) {
        var limit = window.innerHeight - 50;
        var kids = col.children;
        for (var i = kids.length - 1; i >= 0; i--) {
            if (kids[i].offsetHeight > 0) {
                return kids[i].getBoundingClientRect().bottom <= limit;
            }
        }
        return true;
    }

    /* 窗口太矮、整列塞不下时，从后往前收卡片（至少留第一张），
       宁可少显示几张也不让整页 / 整栏滚起来 */
    function trimColumn(col) {
        if (!col) {
            return;
        }
        var kids = col.children;
        for (var i = kids.length - 1; i >= 1; i--) {
            if (kids[i].offsetHeight <= 0) {
                continue;
            }
            if (columnFits(col)) {
                return;
            }
            kids[i].style.display = 'none';
        }
    }

    function fitRightColumn() {
        if (!el.right) {
            return;
        }

        var recent = el.right.querySelector('.widget[data-type="recent-posts"]');
        var calendar = el.right.querySelector('.widget[data-type="github_calendar"]');
        var items = recent
            ? [].slice.call(recent.querySelectorAll('.card-content > article.media'))
            : [];
        var kids = el.right.children;

        /* 每次从“全部显示、不拉伸”重算，pjax / 改窗口大小才不会越藏越多 */
        for (var k = 0; k < kids.length; k++) {
            kids[k].style.flexGrow = '';
        }
        items.forEach(function (item) {
            item.style.display = '';
        });
        if (recent) {
            recent.style.display = '';
        }
        if (calendar) {
            calendar.style.display = '';
        }

        /* 阅读态：恢复成完整列表就收工（多出来的交给右栏自己滚） */
        if (isReading()) {
            return;
        }

        /* 放不放得下看最后一张可见卡片的底边（见 columnFits） */
        var fits = function () {
            return columnFits(el.right);
        };

        if (fits()) {
            return;
        }

        /* 放不下就一条条往下收：能显示几条显示几条（至少留一条），
           再不行整张收起，最后收贡献日历 */
        for (var j = items.length - 1; j >= 1; j--) {
            items[j].style.display = 'none';
            if (fits()) {
                return;
            }
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

    /* ── 三栏等高 ──────────────────────────────────────
       正文列的高度卡着视口，左右两栏的内容往往短一截；
       把最后一张可见卡片拉长，底边就和正文卡片对上了 */
    function fillColumns() {
        [el.left, el.right].forEach(function (col) {
            if (!col) {
                return;
            }

            var kids = col.children;
            var last = null;
            for (var i = 0; i < kids.length; i++) {
                kids[i].style.flexGrow = '';
                if (kids[i].offsetHeight > 0) {
                    last = kids[i];
                }
            }

            /* 阅读态左栏已经由目录 flex 撑满，不用再拉最后一张 */
            if (col === el.left && isReading()) {
                return;
            }

            if (last) {
                last.style.flexGrow = '1';
            }
        });
    }

    /* ── 侧栏布局总入口 ────────────────────────────────
       顺序不能乱：先复位（清掉上一次的隐藏和拉伸），再让右栏裁剪「最新文章」，
       还不够就把两栏的卡片从后往前收，最后才让最后一张卡片吃掉剩余高度。
       反过来做的话，被拉长的卡片永远“放得下”，裁剪就失效了 */
    function layoutColumns() {
        moveRecentToEnd();
        resetColumn(el.left);
        resetColumn(el.right);

        /* 「更多」隔断已被隐藏，就别让搬过来的卡片停在收起状态，
           否则它们再没有入口可以展开（高度不够时由 trimColumn 负责收） */
        var split = el.left && el.left.querySelector('.sb-split');
        if (split && split.classList.contains('is-collapsed')) {
            split.classList.remove('is-collapsed');
            split.setAttribute('aria-expanded', 'true');
        }

        fitRightColumn();

        /* 阅读态左栏本来就该自己滚，不当它是“放不下”；
           手机档栏高不固定、页面还能滚，也不裁卡片 */
        if (!isReading() && WIDE.matches) {
            trimColumn(el.right);
            trimColumn(el.left);
        }

        fillColumns();
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
        var toc = el.toc;
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
        if (el.toc && el.toc.classList.contains('is-active')) {
            el.toc.classList.remove('is-active');
            var maskEl = document.getElementById('toc-mask');
            if (maskEl) {
                maskEl.classList.remove('is-active');
            }
        }

        /* 先把阅读态定下来再滚动：否则滚动过程中简介卡片刚好被隐藏，
           左栏会重排一次，视觉上就是跳转时“抽一下” */
        if (!isReading()) {
            body.classList.add('is-reading');
            if (el.right) {
                el.right.scrollTop = 0;
            }
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

    /* ── 目录卡片下面那排按钮 ──────────────────────────
       左：目录全部展开 / 全部收起（只留一级标题）；
       右：本文分类 + 本文标签 收起 / 展开。
       只在桌面档的阅读态出现（见上面的 CSS） */
    function metaHidden() {
        return body.classList.contains('meta-hidden');
    }

    function tocFlat() {
        return !!el.toc && el.toc.classList.contains('toc-flat');
    }

    /* 两个按钮共用一套文案同步：kind = 'level' | 'meta' */
    function syncButton(kind) {
        var button = el.left && el.left.querySelector('.toc-' + kind + '-toggle');
        if (!button) {
            return;
        }

        if (kind === 'level') {
            var flat = tocFlat();
            button.textContent = flat ? '目录全部展开 ▼' : '目录全部收起 ▲';
            button.setAttribute('aria-expanded', flat ? 'false' : 'true');
            return;
        }

        var hidden = metaHidden();
        button.textContent = hidden ? '展开分类标签 ▼' : '收起分类标签 ▲';
        button.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    }

    function setMeta(hidden) {
        body.classList.toggle('meta-hidden', hidden);
        syncButton('meta');
    }

    function setTocFlat(flat) {
        if (!el.toc) {
            return;
        }
        el.toc.classList.toggle('toc-flat', flat);
        syncButton('level');
    }

    function makeButton(kind, onClick) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'toc-' + kind + '-toggle';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            /* 按钮住在目录卡片里，卡片上挂了主题的 toggleToc（手机浮层开关），
               不拦一下点完会把目录变成浮层 */
            event.stopPropagation();
            onClick();
        });
        return button;
    }

    function ensureTools() {
        if (!el.toc) {
            return;
        }

        var tools = el.toc.querySelector(':scope > .toc-tools');
        if (!tools) {
            tools = document.createElement('div');
            tools.className = 'toc-tools';
            tools.appendChild(makeButton('level', function () {
                var flat = !tocFlat();
                setTocFlat(flat);
                store(TOC_STATE, flat ? 'flat' : 'full');
            }));
            tools.appendChild(makeButton('meta', function () {
                var hidden = !metaHidden();
                setMeta(hidden);
                store(META_STATE, hidden ? 'hidden' : 'shown');
            }));

            /* 放到目录卡片的底部：卡片本身就是整栏高度，底边才能和中/右对齐 */
            el.toc.appendChild(tools);
        }

        syncButton('level');
        syncButton('meta');
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
        window.addEventListener(type, function () {
            unlock();
            /* 兜底：万一某个浏览器的 scroll 事件被合掉，滚轮也跟着刷新进度条 */
            updateProgress();
        }, { passive: true });
    });

    /* scroll 不冒泡，但捕获阶段能同时收到窗口和正文列的滚动 */
    document.addEventListener('scroll', function () {
        updateProgress();
        apply();
    }, { capture: true, passive: true });

    /* 整页不再滚了，键盘就失灵了：PgDn / 空格 / 上下键原来由浏览器滚窗口，
       现在窗口没得滚，得把它们转给正文列。输入框、按钮、链接上不抢 */
    document.addEventListener('keydown', function (event) {
        if (!mainScrolls() || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        var t = event.target;
        var tag = t && t.tagName ? t.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            || tag === 'BUTTON' || tag === 'A' || (t && t.isContentEditable)) {
            return;
        }

        var page = Math.round(el.main.clientHeight * 0.9);
        var delta;
        if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
            delta = page;
        } else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
            delta = -page;
        } else if (event.key === 'ArrowDown') {
            delta = 60;
        } else if (event.key === 'ArrowUp') {
            delta = -60;
        } else if (event.key === 'End' || event.key === 'Home') {
            el.main.scrollTop = event.key === 'End' ? el.main.scrollHeight : 0;
            event.preventDefault();
            return;
        } else {
            return;
        }

        el.main.scrollTop += delta;
        event.preventDefault();
    });

    window.addEventListener('resize', function () {
        measure();
        layoutColumns();
        updateProgress();
    });

    /* 图片（例如贡献日历）加载完高度会变，那时得再算一次能不能放下 */
    window.addEventListener('load', function () {
        measure();
        layoutColumns();
        updateProgress();
    });

    function init() {
        cache();
        measure();
        /* 默认全部展开：只有用户亲手点过「收起」才收 */
        setMeta(stored(META_STATE) === 'hidden');
        setTocFlat(stored(TOC_STATE) === 'flat');
        ensureTools();
        layoutColumns();
        updateProgress();
        apply();

        /* 字体、图片、贡献日历脚本都可能把卡片晚一步撑高，高度一变就可能
           从“放得下”变成“放不下”，进度条的分母也会变。这里在几个时间点
           再对一遍（每次几毫秒） */
        [200, 600, 1200, 2000].forEach(function (ms) {
            setTimeout(function () {
                layoutColumns();
                updateProgress();
            }, ms);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('pjax:complete', init);

    /* 脚本挂在 body 末尾，内容此时已经解析完；
       先缓存一次，让 col-scroll 在首屏绘制前就生效 */
    cache();
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

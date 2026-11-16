/* global hexo */

'use strict';

/**
 * 站点级自定义样式。
 *
 * 主题是从 npm 装的（node_modules/hexo-theme-icarus），不要直接改里面的文件，
 * 升级会被覆盖。这里用 injector 把一段 <style> 追加到每个页面的 </head> 前，
 * 因为排在主题样式表之后，同优先级下会覆盖主题默认值。
 *
 * 结构上分两部分：
 *   1. 排版（字体 / 字号 / 行高 / 标题 / 间距 / 代码块 / 引用块）—— 全端生效，
 *      手机和电脑用同一套值，避免手机上回落到主题默认的 15.4px
 *   2. 布局（留白 / 侧栏宽度 / 卡片内边距）—— 也全端生效；
 *      左右留白用 clamp 做线性插值（1920 时正好 10%），桌面档再按宽高比微调，
 *      手机端自动隐藏右栏并把留白压到 7px
 */

const css = `<style id="site-custom-style">
/* ══ 正文排版（全端） ══════════════════════════════════════ */

/* 字号 16px 是移动端正文的舒适区间；行高 1.85 偏松，长文更好读。
   字体优先各系统的中文字体：
     macOS/iOS → 苹方，Windows → 微软雅黑，Android → 思源黑体
   西文用系统 UI 字体，不额外下载任何字体文件 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC",
        "Source Han Sans SC", "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.85;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content h2 {
    font-size: 1.55rem;
    font-weight: 600;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content h3 {
    font-size: 1.3rem;
    font-weight: 600;
}

/* 四级标题：主题给的是 18px / 字重 400，和 16px 正文几乎没区别，
   这里只补字号和字重，间距交给下面的统一节奏规则。
   主题根字号是 14px，所以 1.2rem ≈ 16.8px，介于正文 16px 和 h3 18.2px 之间 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content h4 {
    font-size: 1.2rem;
    font-weight: 600;
}

/* ── 正文垂直节奏统一 ──────────────────────────────────
   主题默认：段落/引用/表格下间距 16px，代码块 0px（和下文粘在一起），
   各级标题下间距又各不相同（12.4 / 12.1 / 10.08px），松紧不一。
   统一成：块与块 14px，标题上 26px、下 10px，标题行高 1.35。
   （段落间距比原来 20px 收紧，行高 1.85 已经够松，再大就散了）

   选择器里的 > 很重要：只作用于正文的直接子元素，否则会连带匹配
   figure.highlight 内部的 .code pre 和 .gutter pre，代码块里多出 20px 空白 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > :is(p, ul, ol, blockquote, pre, table) {
    margin-top: 0;
    margin-bottom: 14px;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > :is(h2, h3, h4, h5, h6) {
    margin-top: 26px;
    margin-bottom: 10px;
    line-height: 1.35;
}

/* 正文第一个元素不留上边距：独立页面（关于）隐藏了大标题之后，
   下面第一个 h2 的 32px 上间距会变成一块莫名空白 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > :first-child {
    margin-top: 0;
}

/* 代码块：主题用的是 1.85 倍行高，显得又高又空。
   这里收紧字号、行高和内外边距，内部两个 pre 强制清零；
   圆角放大到 10px 并裁掉溢出，视觉上更柔和。
   外边距必须 !important：主题给 figure.highlight 写了 margin: 1em 0 !important，
   不加就被它按 13px 字号算出的 1em（=13px）盖掉 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content figure.highlight {
    margin: 14px 0 !important;
    font-size: 13px;
    line-height: 1.65;
    border-radius: 10px;
    overflow: hidden;
}

/* 代码块顶部的工具条（折叠图标 + 复制按钮）压薄一点 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content figure.highlight figcaption {
    padding-top: 3px;
    padding-bottom: 3px;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content figure.highlight pre,
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content figure.highlight code {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    font-family: "JetBrains Mono", "Cascadia Code", "Fira Code", "SF Mono",
        Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* 引用块：上下间距对称，内边距收一点，末尾段落去掉多余空白 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > blockquote {
    margin: 16px 0;
    padding: 14px 18px;
    font-size: 15px;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > blockquote > p:last-child {
    margin-bottom: 0;
}

/* 独立页面的大标题：
   - 搜索页：标题「搜索」和下面的输入框重复
   - 关于页：正文自己已经有「1. 关于我」这种小节标题
   文章页带 .article-meta，不受影响 */
.card-content.article:has(#local-search) > h1.title,
.card-content.article:not(:has(.article-meta)):has(> .content h2) > h1.title {
    display: none;
}

/* 搜索结果里的关键字标签：主题用的是 Bulma 的 is-light（写死 #f5f5f5），
   暗色主题下是刺眼的白块，换成和侧栏标签一致的半透明灰 */
#local-search .tag.is-light {
    background: rgba(128, 128, 128, .16);
    color: inherit;
    border: none;
    font-weight: normal;
    letter-spacing: 0;
    text-transform: none;
}

/* 右侧「标签」卡片的标签底色：主题默认用 Bulma 的链接色（一块亮蓝），
   和左侧「本文分类 / 本文标签」不统一。这里换成半透明灰，随主题明暗自动适配 */
.widget[data-type="tags"] .tags.has-addons {
    /* 先让这个链接继承正文色，否则下面 .tag 的 inherit 会拿到链接蓝 */
    color: inherit;
    font-weight: normal;
}

.widget[data-type="tags"] .tags.has-addons .tag {
    background: rgba(128, 128, 128, .16);
    color: inherit;
    border: none;
}

.widget[data-type="tags"] .tags.has-addons .tag:last-child {
    background: rgba(128, 128, 128, .3);
}

.widget[data-type="tags"] .tags.has-addons:hover .tag {
    background: rgba(128, 128, 128, .34);
}

/* 文章顶部的元信息（时间 / 分类 / 阅读时长 / 访问量）
   主题用的是 Bulma 的 level（flex + nowrap + overflow-x:auto），窄屏会挤出滚动条。
   这里改成普通文本流：字段之间用「·」分隔，任何宽度都能自然换行，
   行距只由 line-height 决定，不会像 flex 换行那样出现忽大忽小的间隙 */
.article-meta.level,
.article-meta.level .level-left {
    display: block;
}

.article-meta.level .level-item {
    display: inline;
    margin: 0 !important;
    /* 字段之间靠右侧空白隔开：行末的 padding 不会显示出来，
       换行时也不会把分隔符号丢到下一行行首 */
    padding: 0 .55em 0 0;
    /* 单个字段（如「3 分钟读完 (大约523个字)」）内部不再拆行，
       否则会在数字和汉字之间断开；整块超宽时靠相邻字段之间换行 */
    white-space: nowrap;
}

/* 标题提到最前。主题把元信息放在标题前面，小字压在 28px 标题上方很别扭；
   卡片内容改成纵向 flex 后，只给标题一个负 order，其余子元素顺序不变。
   文章页标题是 h1，首页列表页是 p.title，两种都要匹配 */
.article.card-content:has(> :is(h1, .title)) {
    display: flex;
    flex-direction: column;
}

.article.card-content > :is(h1, .title) {
    order: -1;
}

/* 元信息落到标题和正文之间，和下面的「关键字」块拼成一个整体：
   同一底色、同一字号、同一左侧竖条，中间不留缝，
   圆角由两半各自负责（上圆下平 / 上平下圆）。
   主题原规则是 article.article .article-meta（特异性 0,2,1），要带 body 才压得过 */
body .article-meta.level {
    margin: 0;
    /* 主题在 .article-meta 上开了 overflow-x: auto，内容一超宽就长出滚动条；
       改成文本流后能自然换行，不需要它 */
    overflow: visible;
    /* 下内边距交给下方的关键字块，两块之间的空隙 = 两个半行距 + 上行的 padding-bottom，
       这样上 / 中 / 下三处都是 8~9px，不会一块宽一块窄 */
    padding: .4rem .875rem .25rem;
    border-left: 4px solid rgba(128, 128, 128, .3);
    border-radius: 4px 4px 0 0;
    background: rgba(128, 128, 128, .1);
    /* 文字色和下面的关键字块统一（都用卡片正文色），
       否则一块灰一块深，看着像两个不相干的部分 */
    color: inherit;
    /* 元素上带着 Bulma 的 is-size-7（0.85rem），优先级比这里高，
       不加 !important 就和下面的关键字块差 0.35px，字距对不齐 */
    font-size: .875rem !important;
    line-height: 1.5;
}

/* 正文第一个引用块（关键字）—— 和元信息条共用同一套数值 */
.article.card-content:has(> :is(h1, .title)) > .content > blockquote:first-child {
    margin: 0 0 14px;
    padding: 0 .875rem .4rem;
    border-left: 4px solid rgba(128, 128, 128, .3);
    border-radius: 0 0 4px 4px;
    background: rgba(128, 128, 128, .1);
    color: inherit;
    font-size: .875rem;
    line-height: 1.5;
}

.article.card-content:has(> :is(h1, .title)) > .content > blockquote:first-child > p {
    margin: 0;
    font-size: inherit;
    line-height: inherit;
}

/* ══ 顶部导航栏常驻 ══════════════════════════════════════════
   主题默认是 position: relative，往下滚就滚出视口了。
   改 sticky 后一直停在顶部；侧栏的 is-sticky 是 z-index: 99，
   导航栏必须再高一层，否则左栏会盖住 logo 和前面的菜单 */
body > .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
}

/* 侧栏吸附点往下让出导航栏高度，不然展开时顶部内容会被导航栏遮住。
   导航栏在任意宽度下都只有一行（约 59px），所以一个值就够 */
body .column-left.is-sticky,
body .column-right.is-sticky {
    top: 4.75rem;
}

/* 导航栏盖住锚点位置，跳转后标题会被遮住一半，给标题留出导航栏的高度。
   主题的样式表从 CDN 加载（跨域读不到规则），它的 scroll-margin 会盖过这里，所以要 !important */
.column-main .content :is(h1, h2, h3, h4, h5, h6) {
    scroll-margin-top: 4.6rem !important;
}

/* 导航栏全宽度统一成一种布局，永远只有一行：
     左边 = logo + 菜单文字（主页/归档/分类/标签/关于）
     右边 = GitHub / 日夜切换 等图标
   主题自己在 1025~1099 会临时摊成两行、1024 以下又变回一行，
   拖动窗口时就会「左右横跳」，所以这里不设断点，所有尺寸共用一套规则。
   宽度真的放不下时（约 530px）主题自己会把菜单文字收进汉堡按钮，
   那是唯一一处变化，也正好发生在文字和图标要撞上的时候 */
body > .navbar .navbar-container {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: .5rem;
}

body > .navbar .navbar-brand {
    flex: 0 0 auto;
    width: auto;
    justify-content: flex-start;
}

/* 菜单区吃掉剩余宽度：start 靠左紧贴 logo，end 顶到最右边。
   注意这里**不能**给 start / menu 写 min-width: 0：
   主题靠「scrollWidth > clientWidth」判断要不要收进汉堡按钮，
   一旦允许 flex 收缩到内容以下，文字会先互相压住、却检测不到溢出，
   于是要等到 400px 才折叠。保持默认的 min-width:auto，
   放不下时容器立刻被判为溢出，刚好在文字要撞上图标的那一刻收起 */
body > .navbar .navbar-menu {
    flex: 1 1 auto;
    width: auto;
    margin-left: 0;
}

body > .navbar .navbar-start {
    flex: 1 1 auto;
    justify-content: flex-start;
    flex-wrap: nowrap;
}

body > .navbar .navbar-end {
    flex: 0 0 auto;
    justify-content: flex-end;
    flex-wrap: nowrap;
}

/* 菜单项自己不许被压窄：中文的 min-content 只有一个字宽，
   允许收缩的话文字会先互相压住而不触发「溢出」检测，
   要等到很窄才折叠。锁死宽度后，一放不下容器就被判溢出 */
body > .navbar .navbar-start > .navbar-item,
body > .navbar .navbar-end > .navbar-item {
    flex: 0 0 auto;
    white-space: nowrap;
}

/* 收进汉堡按钮后，菜单区里只剩「汉堡 + 右侧图标」，
   用 margin-left:auto 把它们整组推到最右边，和展开时右对齐的位置一致。
   顺带把主题那个整格子的深色底改成圆角浅底（加 margin-block 会把导航栏撑高 8px，
   所以这里只圆角、不加外边距） */
body > .navbar .navbar-toggle {
    margin-left: auto;
    background: transparent;
    border-radius: 8px;
    transition: background-color .15s, color .15s;
}

body > .navbar .navbar-toggle:hover,
body > .navbar .navbar-toggle:focus-visible {
    background: rgba(128, 128, 128, .18);
}

body > .navbar .navbar-toggle[aria-expanded="true"] {
    background: rgba(128, 128, 128, .18);
    color: #3273dc;
}

/* 汉堡菜单展开后的样子。
   主题把菜单项塞在导航栏右边一个 227px 宽的小列里、还水平居中，显得又窄又挤。
   这里改成：贴着导航栏下沿铺满整行的一整块面板，条目左对齐、带悬停底色。
   绝对定位（相对 .navbar-container）所以不会把导航栏本身撑高 */
body > .navbar.is-collapsed .navbar-start {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    width: auto;
    height: auto;
    align-items: stretch;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    padding: .5rem .5rem .625rem;
    /* 跟随主题的亮/暗配色：父元素 .navbar-menu 和导航栏同色 */
    background: inherit;
    border-top: 1px solid rgba(128, 128, 128, .16);
    border-radius: 0 0 12px 12px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, .18);
    z-index: 10;
}

body > .navbar.is-collapsed .navbar-start > .navbar-item {
    width: 100%;
    /* 窄屏下拉里文字居中，整行区域照样可点 */
    justify-content: center;
    padding: .6rem .875rem;
    border-radius: 8px;
    font-size: .95rem;
    line-height: 1.4;
    text-align: center;
    transition: background-color .15s, color .15s;
}

body > .navbar.is-collapsed .navbar-start > .navbar-item:hover,
body > .navbar.is-collapsed .navbar-start > .navbar-item:focus-visible {
    background: rgba(128, 128, 128, .16);
}

/* 汉堡面板淡入：主题只切换 display，transition 不会触发，用 animation */
@keyframes sb-nav-panel-in {
    from {
        opacity: 0;
        transform: translateY(-6px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

body > .navbar.is-open .navbar-start {
    animation: sb-nav-panel-in .18s ease-out;
}

/* 系统开了「减少动态效果」就不做位移/淡入 */
@media screen and (prefers-reduced-motion: reduce) {
    body > .navbar.is-open .navbar-start {
        animation: none;
    }

    *,
    *::before,
    *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
        scroll-behavior: auto !important;
    }
}

/* 页脚用和导航栏同一套逻辑：左边信息、右边图标，先保持一行，
   放不下时整块换行，而不是像主题那样一到 769px 就直接变成上下两堆 */
body .footer .container > .level {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: .75rem 1rem;
}

body .footer .level-start {
    flex: 1 1 auto;
    min-width: 0;
    /* 主题在窄屏把页脚文字居中，和导航栏的左对齐不一致，这里统一成左对齐 */
    text-align: left;
}

/* 图标列：同一行时靠右顶到容器边缘（level-start 的 flex-grow 吃干净剩余空间，
   auto 左外边距分不到空间）；换行时由下面的窄屏媒体查询接管居中 */
body .footer .level-end {
    flex: 0 0 auto;
    margin-left: auto;
}

/* 窄屏（放不下一行时）整体改成一列居中：logo / 版权文字 / 图标都居中 */
@media screen and (max-width: 519px) {
    body .footer .container > .level {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    body .footer .level-start {
        flex: 0 0 auto;
        width: 100%;
        text-align: center;
    }

    body .footer .level-end {
        margin: 0;
    }
}


/* TOC 卡片标题：主题语言包里写的是「目录」，和左栏的
   「本文分类 / 本文标签」不成体系，这里改成「本文目录」。
   用 visibility 覆盖而不是 font-size:0，能保留主题原有的字号和颜色 */
.widget[data-type="toc"] .menu-label {
    position: relative;
    visibility: hidden;
}

.widget[data-type="toc"] .menu-label::after {
    content: "本文目录";
    position: absolute;
    left: 0;
    top: 0;
    visibility: visible;
}

/* ══ 布局（动态比例） ════════════════════════════════════════
   留白：--site-gutter 用 clamp 做线性 —— 小屏极小，宽屏放大，
         1920 时正好左右各 10%（用户基准）
   形态：视口宽决定几栏
   松紧：宽高比决定侧栏宽度与卡片内边距
   排除：min-height 排除手机横屏（844×390 也是 21:9）
   ════════════════════════════════════════════════════════════ */

:root {
    /* 左右留白随视口线性增长，封顶正好是 10vw：
         320 →   7px（下限）   640 →  20px
         768 →  37px          1024 →  73px
        1440 → 132px          1920 → 192px（10%）
        2560 → 256px（10%）   超宽屏也是 10% */
    --site-gutter: clamp(0.5rem, 14vw - 5rem, 10vw);
    /* 侧栏宽度同样线性：
        1280 → 240px   1600 → 256px   1920 → 307px */
    --site-side: clamp(240px, 16vw, 320px);
    --site-pad-y: 2.5rem;
    --site-pad-x: 2.75rem;
    /* 容器宽度的绝对上限。默认不设限（100%），
       留白本身已经被 10vw 卡住；只有超宽屏在下面的媒体查询里才盖小 */
    --site-max: 100%;
}

/* 标准：4:3 ~ 16:9 这一段和默认值一致，无需单独声明 */

/* 宽屏：16:9 ~ 21:9（1080p / 1440p），min-height 排除手机横屏。
   注意：这里**不能**再压 --site-max。
   2560×1440（16:9）算下来留白就是 10vw = 256px，正文 80%；
   之前写了 1536px 的上限，等于把边距又拓到 20%，2560 屏上就显得空了。
   这里改用「16:9 等价宽度」封顶：80vh × 16/9。
   16:9 屏幕上它恰好等于 80vw（不产生效果），超宽屏才会收住正文宽度 */
@media screen and (min-width: 1216px) and (min-aspect-ratio: 16/9) and (max-aspect-ratio: 21/9) and (min-height: 700px) {
    :root {
        --site-pad-y: 2.625rem;
        --site-pad-x: 3rem;
        --site-max: calc(80vh * 16 / 9);
    }
}

/* 超宽：≥ 21:9（带鱼屏 3440×1440）。
   留白继续按 10vw 变大，但正文别再无限变宽 ——
   用同高度的 16:9 屏幕的 80% 宽度封顶，保证阅读宽度和 2560 屏一致 */
@media screen and (min-width: 1216px) and (min-aspect-ratio: 21/9) and (min-height: 700px) {
    :root {
        --site-side: 340px;
        --site-pad-y: 2.625rem;
        --site-pad-x: 3rem;
        --site-max: calc(80vh * 16 / 9);
    }
}

/* 竖向：3:4 ~ 4:3（iPad 竖屏、方形窗口）横向紧张，内边距压缩 */
@media screen and (min-width: 768px) and (min-aspect-ratio: 3/4) and (max-aspect-ratio: 4/3) {
    :root {
        --site-pad-y: 1.75rem;
        --site-pad-x: 1.875rem;
    }
}

/* 消费变量：横向留白只由 --site-gutter 一处决定
   Bulma 的 .container 是 width:auto + flex-grow:1，写 width 无效，只能靠 max-width */
body .section {
    padding-left: 0;
    padding-right: 0;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .container {
    max-width: min(calc(100% - 2 * var(--site-gutter)), var(--site-max));
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .card-content {
    padding: var(--site-pad-y) var(--site-pad-x);
}

/* 侧栏固定宽度，剩余空间全给正文，卡片不会被拉宽 */
@media screen and (min-width: 1216px) {
    body.is-3-column .column-left,
    body.is-3-column .column-right {
        flex: 0 0 var(--site-side);
        width: var(--site-side);
        max-width: var(--site-side);
    }

    body.is-3-column .column-main {
        flex: 1 1 auto;
        width: auto;
        max-width: none;
    }
}

/* 手机：≤767px 或 ≤3:4（含 9:19.5 / 9:20 / 9:21 全面屏）
   同时写 max-width 是为了兜底：Safari 14 及更早不支持 aspect-ratio 媒体查询，
   只写宽高比的话这些设备会拿到桌面档的 300px 侧栏。
   右侧 widget（分类 / 最新 / 归档 / 标签 / 日历）整体隐藏，只留正文 */
@media screen and (max-width: 767px), screen and (max-aspect-ratio: 3/4) {
    body.is-3-column .column-right {
        display: none;
    }

    body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .card-content {
        padding: 1.25rem 1rem;
    }
}

/* 小屏手机（≤640px）：Bulma 栅格的负 margin 与列内边距成对归零，
   再压卡片内边距，把宽度尽量还给正文（375 屏可到 92%）；
   同时把表格改成可横向滚动的块，否则中文列名会被挤成两行 */
@media screen and (max-width: 640px) {
    body .columns {
        margin-left: 0;
        margin-right: 0;
    }

    body .columns > .column {
        padding-left: 0;
        padding-right: 0;
    }

    body .column-main .card-content {
        padding: .875rem .625rem;
    }

    .content > table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .content > table th,
    .content > table td {
        white-space: nowrap;
    }
}
</style>`;

hexo.extend.injector.register('head_end', css, 'default');

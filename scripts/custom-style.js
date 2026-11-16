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
   统一成：块与块 20px，标题上 32px、下 12px，标题行高 1.35。

   选择器里的 > 很重要：只作用于正文的直接子元素，否则会连带匹配
   figure.highlight 内部的 .code pre 和 .gutter pre，代码块里多出 20px 空白 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > :is(p, ul, ol, blockquote, pre, table) {
    margin-top: 0;
    margin-bottom: 20px;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > :is(h2, h3, h4, h5, h6) {
    margin-top: 32px;
    margin-bottom: 12px;
    line-height: 1.35;
}

/* 代码块：主题用的是 1.85 倍行高，显得又高又空。
   这里收紧字号、行高和内外边距，内部两个 pre 强制清零；
   圆角放大到 10px 并裁掉溢出，视觉上更柔和 */
body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content figure.highlight {
    margin: 20px 0;
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
    margin: 20px 0;
    padding: 16px 20px;
    font-size: 15px;
}

body:is(.is-1-column, .is-2-column, .is-3-column) .column-main .content > blockquote > p:last-child {
    margin-bottom: 0;
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
   主题是 flex + nowrap + overflow-x:auto，窄屏会挤出横向滚动条；
   .level-left 是内层 flex 容器，要让它能收缩（min-width:0）才真的换行 */
.article-meta.level,
.article-meta.level .level-left {
    flex-wrap: wrap;
    row-gap: .375rem;
}

.article-meta.level > .level-left {
    flex: 1 1 0;
    min-width: 0;
}

/* 元信息单独划成一个浅色小条：浅底 + 圆角 + 内边距，
   和下方标题之间留出明显间距，不再是一行小字直接贴在标题上方。
   主题原规则是 article.article .article-meta（特异性 0,2,1），
   这里必须带 body 才能压过去 */
body .article-meta.level {
    margin: 0 0 1.25rem;
    padding: .5rem .875rem;
    border-radius: .5rem;
    background: rgba(128, 128, 128, .1);
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
    /* 左右留白随视口线性增长：
         320 →   7px（下限）   640 →  20px
         768 →  37px          1024 →  73px
        1440 → 132px          1920 → 192px（10%）
        2560 → 256px（10%） */
    --site-gutter: clamp(0.5rem, 14vw - 5rem, 10vw);
    /* 侧栏宽度同样线性：
        1280 → 240px   1600 → 256px   1920 → 307px */
    --site-side: clamp(240px, 16vw, 320px);
    --site-pad-y: 2.5rem;
    --site-pad-x: 2.75rem;
    /* 容器绝对上限，防止超宽屏一行上百字；100% 表示不设限 */
    --site-max: 100%;
}

/* 标准：4:3 ~ 16:9（16:10 笔记本、iPad 横屏） */
@media screen and (min-width: 1216px) and (min-aspect-ratio: 4/3) and (max-aspect-ratio: 16/9) {
    :root {
        --site-pad-y: 2.5rem;
        --site-pad-x: 2.75rem;
    }
}

/* 宽屏：16:9 ~ 21:9（1080p / 1440p），min-height 排除手机横屏 */
@media screen and (min-width: 1216px) and (min-aspect-ratio: 16/9) and (max-aspect-ratio: 21/9) and (min-height: 700px) {
    :root {
        --site-pad-y: 2.625rem;
        --site-pad-x: 3rem;
        --site-max: 1536px;
    }
}

/* 超宽：≥ 21:9（带鱼屏 3440×1440） */
@media screen and (min-width: 1216px) and (min-aspect-ratio: 21/9) and (min-height: 700px) {
    :root {
        --site-side: 340px;
        --site-pad-y: 2.625rem;
        --site-pad-x: 3rem;
        --site-max: 1536px;
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
   再压卡片内边距，把宽度尽量还给正文（375 屏可到 92%） */
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
}

/* 窄屏表格：主题没给 table 包滚动容器，中文列名会被挤成两行。
   改成块级 + 横向滚动，保持单元格内容不折行 */
@media screen and (max-width: 640px) {
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

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
    /* ── 目录卡片：限高 + 自己滚 ──────────────────────────
       长文章的目录有十几二十条，全展开会把左栏撑到视口外面；
       这里把可见高度收在屏幕的一半左右，只露出当前位置附近的条目，
       其余的在卡片内部滚（滚轮在目录上滚动不会连带滚正文） */
    .column-left .widget[data-type="toc"] .card-content {
        max-height: min(52vh, 26rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, .35) transparent;
    }

    .column-left .widget[data-type="toc"] .card-content::-webkit-scrollbar {
        width: 6px;
    }

    .column-left .widget[data-type="toc"] .card-content::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, .35);
        border-radius: 3px;
    }

    /* ── 阅读态：收起简介卡片，把目录提到左栏最上面 ────────── */
    body .column-left > .widget[data-type="profile"] {
        max-height: 2000px;
        transition: max-height .35s ease, opacity .25s ease, margin .35s ease;
    }

    body.is-reading .column-left > .widget[data-type="profile"] {
        max-height: 0;
        opacity: 0;
        margin-bottom: 0;
        overflow: hidden;
        pointer-events: none;
    }

    body.is-reading .column-left {
        display: flex;
        flex-direction: column;
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

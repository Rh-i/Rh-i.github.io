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
    /* ── 左栏：目录吃掉剩余高度 ──────────────────────────
       左栏高度压在「视口 - 导航栏 - 上下留白」以内，
       分类 / 标签这类小卡片按自身高度完整显示（不允许被压缩），
       剩下的空间全部给目录，目录自己滚 —— 大约占 3/4 */
    body .column-left {
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 7.5rem);
    }

    body .column-left > .widget:not([data-type="toc"]) {
        flex: 0 0 auto;
    }

    body .column-left > .widget[data-type="toc"] {
        flex: 1 1 auto;
        min-height: 9rem;
        display: flex;
        flex-direction: column;
    }

    body .column-left > .widget[data-type="toc"] .card-content {
        flex: 1 1 auto;
        min-height: 0;
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

    /* ── 卡片出现 / 消失都用同一套缓动，避免硬切 ───────── */
    body .column-left > .widget,
    body .column-right > .widget {
        transition: opacity .25s ease, transform .25s ease, max-height .35s cubic-bezier(.4, 0, .2, 1),
            margin .35s cubic-bezier(.4, 0, .2, 1);
    }

    /* 阅读态：简介卡片向上收起 + 淡出，目录顶到最上面 */
    body .column-left > .widget[data-type="profile"] {
        max-height: 2000px;
        transform-origin: top center;
    }

    body.is-reading .column-left > .widget[data-type="profile"] {
        max-height: 0;
        opacity: 0;
        transform: translateY(-10px) scale(.985);
        margin-bottom: 0;
        overflow: hidden;
        pointer-events: none;
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
    var lock = { link: null, until: 0 };

    /* 锁定期间反复把高亮拉回目标项（toc.js 的 IntersectionObserver 还会改类名） */
    function enforce() {
        if (!lock.link || performance.now() > lock.until) {
            return;
        }

        var toc = document.getElementById('toc');
        if (!toc || !toc.contains(lock.link)) {
            lock.link = null;
            return;
        }

        toc.querySelectorAll('.menu-list a.is-active').forEach(function (a) {
            if (a !== lock.link) {
                a.classList.remove('is-active');
            }
        });

        if (!lock.link.classList.contains('is-active')) {
            lock.link.classList.add('is-active');
        }

        /* 子项被点亮时，把它的父级也点亮，跟主题的目录树一致 */
        var menuList = lock.link.parentElement && lock.link.parentElement.parentElement;
        while (menuList && menuList.classList && menuList.classList.contains('menu-list') &&
            menuList.parentElement && menuList.parentElement.tagName.toLowerCase() === 'li') {
            var parentLink = menuList.parentElement.children[0];
            if (parentLink && !parentLink.classList.contains('is-active')) {
                parentLink.classList.add('is-active');
            }
            menuList = menuList.parentElement.parentElement;
        }
    }

    function startWatcher() {
        if (!window.MutationObserver) {
            return;
        }
        var toc = document.getElementById('toc');
        if (!toc || toc.dataset.lockWatched === '1') {
            return;
        }
        toc.dataset.lockWatched = '1';
        new MutationObserver(function () {
            enforce();
        }).observe(toc, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    function lockTo(link) {
        lock.link = link;
        lock.until = performance.now() + 1500;
        enforce();
    }

    function unlock() {
        lock.link = null;
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

        /* 标题自己的 scroll-margin-top 会让开常驻的导航栏 */
        target.scrollIntoView();

        /* 跳转后自己点亮这一条，并在随后的 1.5s 里拦住主题的高亮跟随 */
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

    document.addEventListener('DOMContentLoaded', function () {
        refresh();
        startWatcher();
    });
    document.addEventListener('pjax:complete', function () {
        refresh();
        startWatcher();
    });
}());
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

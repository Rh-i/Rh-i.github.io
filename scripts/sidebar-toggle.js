/* global hexo */

'use strict';

/**
 * 左右侧边栏开关：两个贴边的小按钮，点击收起/展开对应侧栏，默认全部展开。
 *
 * 状态存在 localStorage（'1' = 展开，'0' = 收起），刷新后保持。
 * 按钮只在 1024px 以上显示，并且只在对应侧栏确实存在时出现。
 * 收起后正文列用 flex 撑满剩余宽度（配合 custom-style.js 里 300px 定宽侧栏的设定）。
 */
const style = `<style id="site-sidebar-toggle-style">
.sb-toggle {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 60;
    width: 24px;
    height: 46px;
    padding: 0;
    border: 1px solid rgba(128, 128, 128, .18);
    background: rgba(128, 128, 128, .10);
    color: inherit;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    display: none;
    align-items: center;
    justify-content: center;
    opacity: .7;
    transition: opacity .15s, background-color .15s, color .15s;
}
.sb-toggle:hover {
    opacity: 1;
    background: rgba(128, 128, 128, .22);
}

/* 对应侧栏被折叠时高亮，避免“侧栏怎么不见了” */
body.sb-left-hidden #sb-toggle-left,
body.sb-right-hidden #sb-toggle-right {
    opacity: 1;
    color: #3273dc;
    border-color: rgba(50, 115, 220, .55);
    background: rgba(50, 115, 220, .16);
}
.sb-toggle-left {
    left: 0;
    border-radius: 0 6px 6px 0;
}
.sb-toggle-right {
    right: 0;
    border-radius: 6px 0 0 6px;
}

body.sb-left-hidden .column-left,
body.sb-left-hidden .column-right-shadow {
    display: none !important;
}
body.sb-right-hidden .column-right {
    display: none !important;
}

@media screen and (min-width: 1024px) {
    .sb-toggle.is-visible {
        display: flex;
    }
    /* 收起一侧后，正文占满空出来的宽度 */
    body.sb-left-hidden .column-main,
    body.sb-right-hidden .column-main {
        flex: 1 1 auto;
        width: auto;
        max-width: none;
    }
}
</style>`;

const script = `<script id="site-sidebar-toggle">
(function () {
    var LEFT = 'blog.sidebar.left';
    var RIGHT = 'blog.sidebar.right';

    function read(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function save(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            /* localStorage 不可用时忽略，只是不记忆状态 */
        }
    }

    function isHidden(key) {
        return read(key) === '0';
    }

    function visible(el) {
        return !!el && el.offsetWidth > 0;
    }

    function apply() {
        var hiddenLeft = isHidden(LEFT);
        var hiddenRight = isHidden(RIGHT);
        document.body.classList.toggle('sb-left-hidden', hiddenLeft);
        document.body.classList.toggle('sb-right-hidden', hiddenRight);

        var leftBtn = document.getElementById('sb-toggle-left');
        var rightBtn = document.getElementById('sb-toggle-right');
        if (leftBtn) {
            leftBtn.title = hiddenLeft ? '显示左侧栏' : '隐藏左侧栏';
            leftBtn.innerHTML = hiddenLeft ? '&#10095;' : '&#10094;';
        }
        if (rightBtn) {
            rightBtn.title = hiddenRight ? '显示右侧栏' : '隐藏右侧栏';
            rightBtn.innerHTML = hiddenRight ? '&#10094;' : '&#10095;';
        }
    }

    function syncVisibility() {
        var left = document.querySelector('.column-left');
        var right = document.querySelector('.column-right');
        var leftBtn = document.getElementById('sb-toggle-left');
        var rightBtn = document.getElementById('sb-toggle-right');
        // 侧栏被隐藏时要靠按钮找回来，因此判断的是"页面上有没有这一栏"，
        // 而不是它现在是否可见
        if (leftBtn) {
            leftBtn.classList.toggle('is-visible', !!left);
        }
        if (rightBtn) {
            rightBtn.classList.toggle('is-visible', visible(right) || isHidden(RIGHT));
        }
    }

    function makeButton(side) {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'sb-toggle-' + side;
        button.className = 'sb-toggle sb-toggle-' + side;
        button.addEventListener('click', function () {
            var key = side === 'left' ? LEFT : RIGHT;
            save(key, isHidden(key) ? '1' : '0');
            apply();
            syncVisibility();
        });
        return button;
    }

    // 按钮只在第一次遇到"有侧栏的页面"时创建。
    // 不能放进 init 里一次性判断：若访客第一次打开的是没有侧栏的页面，
    // 之后 Pjax 切到文章页，按钮就永远不会出现了
    function ensureButtons() {
        if (!document.querySelector('.column-left') && !document.querySelector('.column-right')) {
            return;
        }
        if (!document.getElementById('sb-toggle-left')) {
            document.body.appendChild(makeButton('left'));
        }
        if (!document.getElementById('sb-toggle-right')) {
            document.body.appendChild(makeButton('right'));
        }
    }

    function init() {
        // Pjax 切换后侧栏内容变了，按钮可能还没建，显隐和标题也要重新同步
        document.addEventListener('pjax:complete', function () {
            ensureButtons();
            apply();
            syncVisibility();
        });

        ensureButtons();
        apply();
        syncVisibility();

        var timer = null;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(syncVisibility, 120);
        });
    }

    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

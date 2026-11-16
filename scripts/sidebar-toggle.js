/* global hexo */

'use strict';

/**
 * 左右侧边栏开关。
 *
 * 状态存在 localStorage（'1' = 展开，'0' = 收起），刷新后保持。
 * 768px 以上用左右贴边的小按钮；手机宽度下贴边按钮会盖住正文，
 * 而它管的卡片又排在正文下方，所以改成底部一颗「展开/收起介绍卡片」胶囊。
 * 收起后正文列用 flex 撑满剩余宽度（配合 custom-style.js 里定宽侧栏的设定）。
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

body.sb-right-hidden .column-right {
    display: none !important;
}

/* 收起左栏 —— 不能简单地给 .column-left 加 display:none：
   目录卡片（#toc）就住在左栏里，手机宽度下主题把「目录」按钮点开的浮层
   也是它（#toc.is-active + #toc-mask）。祖先一旦 display:none，
   浮层永远出不来，表现为「点了没反应、页面只剩遮罩」。
   所以：≥768 整列藏掉（那里没有目录按钮）；<768 只藏卡片，列留着。 */
@media screen and (min-width: 768px) {
    body.sb-left-hidden .column-left {
        display: none !important;
    }
}

@media screen and (max-width: 767px) {
    body.sb-left-hidden .column-left > :not([data-type="toc"]) {
        display: none !important;
    }
}

/* 主题为了左右栏等高，会在左栏尾部放一份右栏的"影子副本"（.column-right-shadow）。
   卡片搬进左栏后这份副本还在，内容会重复一遍（贡献日历变两份），而且会和卡片重叠。
   搬移期间把它藏掉，还原时自动恢复 */
.column-left.sb-migrated > .column-right-shadow {
    display: none !important;
}

/* 收起一侧后正文占满空出来的宽度。
   这条不能放进 1024px 的媒体查询里：窗口缩到 1024 以下时折叠状态还保留着，
   而 Bulma 的 .column-main 仍是 is-8-desktop 的百分比宽度，正文会缩在左边一半 */
body.sb-left-hidden .column-main,
body.sb-right-hidden .column-main {
    flex: 1 1 auto;
    width: auto;
    max-width: none;
}

/* 只有 768px 以上才给贴边按钮。
   手机宽度下左栏就是页面顶部的卡片区，贴边按钮盖在正文上、效果还在页面最上面，
   看起来和实际作用对不上，所以改成底部那颗胶囊（见 .sb-toggle-bottom） */
@media screen and (min-width: 768px) {
    .sb-toggle.is-visible {
        display: flex;
    }
}

/* 手机底部那颗「介绍卡片」胶囊：收起/展开整块卡片区。
   固定在视口底部中间，半透明 + 模糊，和站点配色一致 */
.sb-toggle-bottom {
    position: fixed;
    left: 50%;
    bottom: calc(.875rem + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 60;
    display: none;
    align-items: center;
    gap: .375rem;
    padding: .45rem 1rem;
    border: 1px solid rgba(128, 128, 128, .22);
    border-radius: 999px;
    background: rgba(128, 128, 128, .16);
    color: inherit;
    font-family: inherit;
    font-size: .78rem;
    font-weight: 600;
    letter-spacing: .05em;
    line-height: 1;
    cursor: pointer;
    opacity: .85;
    box-shadow: 0 2px 10px rgba(0, 0, 0, .12);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
}

.sb-toggle-bottom:hover,
.sb-toggle-bottom:active {
    opacity: 1;
    background: rgba(128, 128, 128, .3);
}

/* 卡片区被收起时高亮，提示点它可以展开 */
body.sb-left-hidden .sb-toggle-bottom {
    color: #3273dc;
    border-color: rgba(50, 115, 220, .5);
    background: rgba(50, 115, 220, .16);
}

.sb-toggle-bottom-arrow {
    display: inline-block;
    font-size: .75rem;
}
}

body.sb-left-hidden .sb-toggle-bottom-arrow {
    transform: rotate(180deg);
}

@media screen and (max-width: 767px) {
    .sb-toggle-bottom.is-visible {
        display: flex;
    }
}

/* 右侧卡片搬进左栏时，用它和"本来就在左边"的卡片隔开。
   中间是胶囊标签（可点击收起/展开），两侧是渐隐细线，明暗主题都靠半透明灰自动适配 */
.sb-split {
    display: flex;
    align-items: center;
    gap: .625rem;
    width: 100%;
    margin: 2rem 0 .5rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(128, 128, 128, .95);
    font-family: inherit;
    font-size: .8rem;
    font-weight: 600;
    letter-spacing: .06em;
    user-select: none;
    cursor: pointer;
}

.sb-split::before,
.sb-split::after {
    content: "";
    flex: 1 1 auto;
    height: 2px;
    border-radius: 2px;
}

.sb-split::before {
    background: linear-gradient(to right, rgba(128, 128, 128, .08), rgba(128, 128, 128, .55));
}

.sb-split::after {
    background: linear-gradient(to left, rgba(128, 128, 128, .08), rgba(128, 128, 128, .55));
}

.sb-split > span {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: 3px 11px;
    border-radius: 999px;
    background: rgba(128, 128, 128, .2);
    white-space: nowrap;
}

.sb-split:hover > span,
.sb-split:focus-visible > span {
    background: rgba(128, 128, 128, .32);
}

.sb-split:focus-visible {
    outline: none;
}

.sb-split-arrow {
    display: inline-block;
}
}

.sb-split.is-collapsed .sb-split-arrow {
    transform: rotate(-90deg);
}

/* 收起后把搬过来的卡片藏起来：marker 是它们的直接前面兄弟 */
.sb-split.is-collapsed ~ [data-sb-moved] {
    display: none !important;
}
</style>`;

const script = `<script id="site-sidebar-toggle">
(function () {
    var LEFT = 'blog.sidebar.left';
    var RIGHT = 'blog.sidebar.right';
    // 搬进左栏的那组卡片是否收起（'0' = 收起，其余 = 展开）
    var FOLDED = 'blog.sidebar.rightFolded';

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

    function forget(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            /* 同上，忽略 */
        }
    }

    function visible(el) {
        return !!el && el.offsetWidth > 0;
    }

    // 手机宽度：侧栏是堆在正文上方的卡片，没有“收起”这个概念。
    // 断点必须和 CSS 里的「贴边按钮 ≥768」成对，也和主题「目录」按钮出现的宽度一致
    function isNarrow() {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    // 右栏是不是"当前看不到"：要么手动收起了，要么被主题的响应式规则 display:none 了
    // （手机宽度下就是这种），两种情况都应该把卡片搬进左栏，否则手机上分类/归档/
    // 标签/贡献日历 永远看不到，「更多」也就成了摆设
    function rightCollapsed() {
        if (isHidden(RIGHT)) {
            return true;
        }
        var right = document.querySelector('.column-right');
        return !!right && right.offsetWidth === 0;
    }

    // 便宜的那半：切 body class、更新按钮文案。每次状态变化都跑
    function render() {
        var hiddenLeft = isHidden(LEFT);
        var hiddenRight = isHidden(RIGHT);
        document.body.classList.toggle('sb-left-hidden', hiddenLeft);
        document.body.classList.toggle('sb-right-hidden', hiddenRight);

        var leftBtn = document.getElementById('sb-toggle-left');
        if (leftBtn) {
            leftBtn.title = hiddenLeft ? '显示左侧栏' : '隐藏左侧栏';
            leftBtn.setAttribute('aria-label', leftBtn.title);
            leftBtn.textContent = hiddenLeft ? '\u276F' : '\u276E';
        }

        var rightBtn = document.getElementById('sb-toggle-right');
        if (rightBtn) {
            rightBtn.title = hiddenRight ? '显示右侧栏' : '隐藏右侧栏';
            rightBtn.setAttribute('aria-label', rightBtn.title);
            rightBtn.textContent = hiddenRight ? '\u276E' : '\u276F';
        }

        var bottomBtn = document.getElementById('sb-toggle-bottom');
        if (bottomBtn) {
            var text = hiddenLeft ? '展开介绍卡片' : '收起介绍卡片';
            var label = bottomBtn.querySelector('[data-role="label"]');
            bottomBtn.setAttribute('aria-expanded', hiddenLeft ? 'false' : 'true');
            bottomBtn.setAttribute('aria-label', text);
            if (label && label.textContent !== text) {
                label.textContent = text;
            }
        }
    }

    // 贵的那半：把右栏卡片搬到左栏 / 搬回去。
    // 只在「该不该搬」翻转时执行 —— 拖动窗口时不会每次 resize 都搬一遍 DOM
    var migrated = null;

    function relayout() {
        var should = rightCollapsed();
        if (should === migrated) {
            return;
        }
        migrated = should;

        // 搬移会改变页面高度，滚动位置会跟着飘，搬完还原回去
        var y = window.scrollY;
        migrateRight(should);
        if (window.scrollY !== y) {
            window.scrollTo(0, y);
        }
    }

    function apply() {
        render();
        relayout();
    }

    // 右侧卡片搬进左栏时，用它和"本来就在左边"的卡片隔开。
    // 中间是可点击的胶囊：点一下把搬过来的卡片收起来，再点展开。
    // 任何宽度都允许搬运 —— 只要右栏处于折叠状态就把卡片挪过来，
    // 保证「更多」这个开关在所有尺寸下都可用
    function migrateRight(hidden) {
        var left = document.querySelector('.column-left');
        var right = document.querySelector('.column-right');
        if (!left || !right) {
            return;
        }

        var marker = document.getElementById('sb-split-marker');

        if (hidden) {
            if (marker) {
                return;
            }
            var widgets = right.querySelectorAll(':scope > .widget');
            if (!widgets.length) {
                return;
            }

            // 默认值跟右栏状态联动：
            //   · 手动收起了右栏 → 搬过来的这组卡片默认是收起的，只留一条「更多」
            //   · 纯靠媒体查询隐藏（手机宽度）→ 默认展开，不然手机上要再点一下才看得到
            // 用户点过「更多」就记住他的选择，不再被默认值覆盖
            var stored = read(FOLDED);
            var isFolded = stored === null
                ? isHidden(RIGHT)
                : stored === '0';            var divider = document.createElement('button');
            divider.type = 'button';
            divider.id = 'sb-split-marker';
            divider.className = 'sb-split' + (isFolded ? ' is-collapsed' : '');
            divider.setAttribute('aria-expanded', isFolded ? 'false' : 'true');
            divider.innerHTML = '<span>更多<span class="sb-split-arrow">&#9662;</span></span>';
            divider.addEventListener('click', function () {
                var folded = !divider.classList.contains('is-collapsed');
                divider.classList.toggle('is-collapsed', folded);
                divider.setAttribute('aria-expanded', folded ? 'false' : 'true');
                save(FOLDED, folded ? '0' : '1');
            });

            left.appendChild(divider);
            left.classList.add('sb-migrated');
            Array.prototype.forEach.call(widgets, function (widget, index) {
                widget.setAttribute('data-sb-moved', '1');
                widget.setAttribute('data-sb-order', String(index));
                left.appendChild(widget);
            });
            return;
        }

        if (!marker) {
            return;
        }
        left.classList.remove('sb-migrated');
        // 还原成原来的顺序，避免多次折叠后错位
        var moved = Array.prototype.slice.call(left.querySelectorAll('[data-sb-moved]'));
        moved.sort(function (a, b) {
            return Number(a.getAttribute('data-sb-order')) - Number(b.getAttribute('data-sb-order'));
        });
        moved.forEach(function (widget) {
            widget.removeAttribute('data-sb-moved');
            widget.removeAttribute('data-sb-order');
            // 不碰 style：那是主题/插件自己写的，删掉会出问题
            right.appendChild(widget);
        });
        marker.parentNode.removeChild(marker);
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
            rightBtn.classList.toggle('is-visible', !isNarrow() && (visible(right) || isHidden(RIGHT)));
        }
        var bottomBtn = document.getElementById('sb-toggle-bottom');
        if (bottomBtn) {
            // 手机上才有意义：宽屏用左右贴边按钮
            bottomBtn.classList.toggle('is-visible', isNarrow() && !!left);
        }
    }

    function makeButton(side) {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'sb-toggle-' + side;
        button.className = 'sb-toggle sb-toggle-' + side;
        button.addEventListener('click', function () {
            var key = side === 'left' ? LEFT : RIGHT;
            var expanding = isHidden(key);
            save(key, expanding ? '1' : '0');
            // 重新展开右栏时把「更多」的偏好清掉：下次再收起右栏，它依旧默认是收起的
            if (side === 'right' && expanding) {
                forget(FOLDED);
            }
            apply();
            syncVisibility();
        });
        return button;
    }

    // 手机底部的胶囊：和左侧贴边按钮管同一份状态（LEFT），只是位置和文案变了。
    // 文案用两个固定节点，点击时只改 textContent，不重建 DOM
    function makeBottomButton() {
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'sb-toggle-bottom';
        button.className = 'sb-toggle-bottom';

        var label = document.createElement('span');
        label.setAttribute('data-role', 'label');
        var arrow = document.createElement('span');
        arrow.className = 'sb-toggle-bottom-arrow';
        arrow.textContent = '\u25BE';
        button.appendChild(label);
        button.appendChild(arrow);

        button.addEventListener('click', function () {
            var expanding = isHidden(LEFT);
            save(LEFT, expanding ? '1' : '0');
            apply();
            syncVisibility();
            if (expanding) {
                var column = document.querySelector('.column-left');
                if (column) {
                    column.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
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
        if (!document.getElementById('sb-toggle-bottom')) {
            document.body.appendChild(makeBottomButton());
        }
    }

    function init() {
        // Pjax 切换后侧栏内容变了，按钮可能还没建，显隐和标题也要重新同步。
        // migrated 置空：新页面的 DOM 里没有搬运痕迹，必须重算一次
        document.addEventListener('pjax:complete', function () {
            ensureButtons();
            migrated = null;
            apply();
            syncVisibility();
        });

        ensureButtons();
        apply();
        syncVisibility();

        var timer = null;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                // 宽度变了右栏的可见性也跟着变（桌面 → 手机），
                // 卡片该搬的搬、该还的还，按钮显隐也要重新同步
                apply();
                syncVisibility();
            }, 120);
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

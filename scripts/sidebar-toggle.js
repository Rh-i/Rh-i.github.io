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
   目录卡片（#toc）就住在左栏里，堆叠形态下主题把「目录」按钮点开的浮层
   也是它（#toc.is-active + #toc-mask）。祖先一旦 display:none，
   浮层永远出不来，表现为「点了没反应、页面只剩遮罩」。
   所以：侧栏形态整列藏掉；堆叠形态只藏卡片，列留着。
   这两个形态由 JS 按真实几何打到 body 上（sb-side / sb-stack），不再用媒体查询猜 */
body.sb-side.sb-left-hidden .column-left {
    display: none !important;
}

body.sb-stack.sb-left-hidden .column-left > :not([data-type="toc"]) {
    display: none !important;
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

/* 贴边按钮只在「侧栏形态」出现：卡片在正文左边时，用左右两条边的按钮。
   卡片堆在正文上/下时（体感就是手机单栏）改用底部胶囊，见 .sb-toggle-bottom。
   形态由 JS 按真实几何判断（body.sb-side / body.sb-stack）：
   之前用「≥768 且 ≥3:4」猜，768px 时猜成桌面但布局还是堆叠，
   结果贴边按钮跟底部胶囊两个一起出现；竖屏平板又反过来只给胶囊 */
body.sb-side .sb-toggle.is-visible {
    display: flex;
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

body.sb-left-hidden .sb-toggle-bottom-arrow {
    transform: rotate(180deg);
}

/* 胶囊只给「堆叠形态」：卡片在正文上/下，贴边按钮盖正文、位置也对不上 */
body.sb-stack .sb-toggle-bottom.is-visible {
    display: flex;
}

/* 堆叠形态下胶囊贴着视口底部固定，滚到左栏末尾会盖住「更多」：
   给左栏留出一块让位，两者就不会叠在一起 */
body.sb-stack .column-left {
    padding-bottom: 4.25rem;
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

    /* ── 布局形态：不猜断点，直接量 ──────────────────
       左栏右边缘在正文左边缘左侧 → 侧栏形态（用两侧贴边按钮）
       否则（左栏堆在正文上/下）      → 堆叠形态（用底部胶囊）
       之前用「宽度 + 纵溠比」两套条件去猜，经常和 Bulma 的实际佈局对不上：
       768px 时猜成桌面但佈局仍是堆叠（贴边按钮 + 胶囊一起出现），
       820×1180 这种竖屏平板明明左栏在侧边，却又只给胶囊。
       直接量几何就不会有这种错位，主题以后改断点也不影响 */
    function layoutMode() {
        var left = document.querySelector('.column-left');
        var main = document.querySelector('.column-main');
        if (!left || !main) {
            return 'stack';
        }
        return left.getBoundingClientRect().right <= main.getBoundingClientRect().left + 1
            ? 'side'
            : 'stack';
    }

    /* 把形态写到 body 上，样式侧全靠这两个 class 开关按钮，
       不再写一套媒体查询去猜 */
    function syncMode() {
        var side = layoutMode() === 'side';
        document.body.classList.toggle('sb-side', side);
        document.body.classList.toggle('sb-stack', !side);
        return side;
    }

    /* 右栏能不能出现：只看主题自己的断点（实测 1278 display:none、1279 display:block）。
       少一像素就会出现「右栏根本出不来、却摆了个能展开它的按钮」的死按钮 */
    var WIDE = '(min-width: 1279px)';

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


    // 右栏能不能出现：主题用 is-hidden-touch / is-hidden-desktop-only 把它
    // 在 <1279（非 widescreen）的宽度下直接 display:none 了。
    // 这个区间里再给一个「展开右侧栏」按钮就是个死按钮（点完什么也不会变），
    // 所以按钮只在右栏真的能显示时才露出来
    function canShowRight() {
        return window.matchMedia(WIDE).matches;
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

    // 左栏里有没有目录卡片：有目录的地方（文章页）不摆「更多」和搬过来的那组卡片，
    // 没有目录的地方（归档 / 分类 / 标签）才需要它们。样式侧的规则在 layout.js
    function syncHasToc() {
        var toc = document.querySelector('.column-left > [data-type="toc"]');
        var has = !!toc && toc.getClientRects().length > 0;
        document.body.classList.toggle('sb-has-toc', has);
    }

    // 便宜的那半：切 body class、更新按钮文案。每次状态变化都跑
    function render() {
        var hiddenLeft = isHidden(LEFT);
        var hiddenRight = isHidden(RIGHT);
        document.body.classList.toggle('sb-left-hidden', hiddenLeft);
        document.body.classList.toggle('sb-right-hidden', hiddenRight);
        syncHasToc();

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

            // 右栏一没了（手动收起 / 窗口太窄被主题藏掉），这组卡片默认收起，
            // 只在最下面留一条「更多」——不要一出场就自己铺开把左栏撑长。
            // 用户点过「更多」就记住他的选择（localStorage），不再被默认值覆盖；
            // 重新展开右栏时这个记忆会被清掉，下次收起右栏又回到默认收起
            var stored = read(FOLDED);
            var isFolded = stored === null ? true : stored === '0';            var divider = document.createElement('button');
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
        // 形态每次都要重新量：侧栏 ↔ 堆叠的翻转直接影响用哪套按钮
        var side = syncMode();
        // 侧栏被隐藏时要靠按钮找回来，因此判断的是"页面上有没有这一栏"，
        // 而不是它现在是否可见
        if (leftBtn) {
            // 侧栏形态：卡片在正文左边 → 左边缘的 <；堆叠形态改用底部胶囊
            leftBtn.classList.toggle('is-visible', side && !!left);
        }
        if (rightBtn) {
            rightBtn.classList.toggle('is-visible',
                side && canShowRight() && (visible(right) || isHidden(RIGHT)));
        }
        var bottomBtn = document.getElementById('sb-toggle-bottom');
        if (bottomBtn) {
            // 堆叠形态（卡片在正文上/下）才用胶囊；两个按钮永远互斥
            bottomBtn.classList.toggle('is-visible', !side && !!left);
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

        // 脚本在 body 末尾执行，此时主题的样式表（走 CDN）可能还没到，
        // 三栏的宽度都还是 0，rightCollapsed() 会误判成「右栏被隐藏」而把卡片搬到左栏，
        // 结果右栏和左栏各显示一份。load 之后宽度才是真的，重算一次
        window.addEventListener('load', function () {
            migrated = null;
            apply();
            syncVisibility();
        });

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

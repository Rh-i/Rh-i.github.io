/* global hexo */

'use strict';

/**
 * 个人栏社交图标的悬停提示，统一成同一种气泡样式：
 *   - GitHub 等普通链接：悬停显示名称，点击正常跳转
 *   - QQ：悬停显示"QQ 号码 · 点击复制"，点击复制号码，气泡变绿 + 图标变对勾
 *
 * Icarus 的 profile widget 把 social_links 渲染成带 title 的 <a>，
 * 这里去掉原生 title（浏览器那种灰框提示）换成自定义气泡。
 * 兜底：navigator.clipboard 不可用时退回 textarea + execCommand。
 */

const style = `<style id="site-profile-social-style">
a.social-tip {
    position: relative;
}

/* 悬停时把整个图标抬到「关注我」按钮之上，否则气泡会被它盖住 */
a.social-tip:hover,
a.social-tip:focus-visible {
    z-index: 60;
}

/* 气泡本体：显示在图标下方，因为上方紧贴着「关注我」按钮 */
a.social-tip[data-tip]::after {
    content: attr(data-tip);
    position: absolute;
    left: 50%;
    top: calc(100% + 9px);
    padding: 5px 10px;
    border-radius: 7px;
    background: rgba(23, 24, 28, .95);
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: .2px;
    white-space: nowrap;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .22);
    opacity: 0;
    transform: translate(-50%, -4px);
    pointer-events: none;
    z-index: 30;
}

/* 小三角 */
a.social-tip[data-tip]::before {
    content: '';
    position: absolute;
    left: 50%;
    top: calc(100% + 5px);
    width: 8px;
    height: 8px;
    background: rgba(23, 24, 28, .95);
    border-radius: 1px;
    opacity: 0;
    transform: translateX(-50%) rotate(45deg);
    pointer-events: none;
    z-index: 29;
}

/* 个人栏底部多留一点空间，让下方气泡不被卡片圆角裁掉 */
[data-type="profile"] .card-content {
    padding-bottom: 3.25rem;
}

a.social-tip:hover::after,
a.social-tip:focus-visible::after {
    opacity: 1;
    transform: translate(-50%, 0);
}

a.social-tip:hover::before,
a.social-tip:focus-visible::before {
    opacity: 1;
}

/* QQ 复制成功后气泡转成成功色 */
a.social-tip.is-copied::after,
a.social-tip.is-copied::before {
    background: #257942;
}
</style>`;

const script = `<script id="site-profile-social">
(function () {
    var QQ = '750920400';
    var QQ_TIP = 'QQ ' + QQ + ' · 点击复制';

    function copy(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            try {
                if (document.execCommand('copy')) {
                    resolve();
                } else {
                    reject(new Error('copy failed'));
                }
            } catch (e) {
                reject(e);
            } finally {
                document.body.removeChild(area);
            }
        });
    }

    // QQ：不跳转，点击复制
    function setupQq(link, icon) {
        link.dataset.tip = QQ_TIP;
        link.removeAttribute('href');
        link.removeAttribute('target');
        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', 'QQ ' + QQ + '，点击复制');
        link.setAttribute('tabindex', '0');

        var timer = null;

        function restore() {
            link.dataset.tip = QQ_TIP;
            link.classList.remove('is-copied');
            icon.className = 'fab fa-qq';
        }

        function done() {
            link.dataset.tip = '已复制 ' + QQ;
            link.classList.add('is-copied');
            icon.className = 'fas fa-check';
            clearTimeout(timer);
            timer = setTimeout(restore, 1600);
        }

        function fail() {
            link.dataset.tip = '复制失败，请手动选择';
            clearTimeout(timer);
            timer = setTimeout(restore, 1600);
        }

        link.addEventListener('click', function (event) {
            event.preventDefault();
            copy(QQ).then(done).catch(fail);
        });

        link.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                link.click();
            }
        });
    }

    function mark() {
        var profile = document.querySelector('[data-type="profile"]');
        if (!profile) {
            return;
        }

        var links = profile.querySelectorAll('a.level-item');
        Array.prototype.forEach.call(links, function (link) {
            if (link.dataset.tip) {
                return;
            }
            var icon = link.querySelector('i');
            if (!icon) {
                return;
            }

            // 用 widget 配置里的名称作为提示文字（title 由 social_links 的键生成）
            var label = link.getAttribute('title') || link.getAttribute('aria-label');
            if (!label) {
                return;
            }

            link.dataset.tip = label;
            link.classList.add('social-tip');
            link.removeAttribute('title');

            if (icon.classList.contains('fa-qq')) {
                setupQq(link, icon);
            }
        });
    }

    if (document.readyState !== 'loading') {
        mark();
    } else {
        document.addEventListener('DOMContentLoaded', mark);
    }

    // Pjax 切换会替换整个左栏，个人卡片重建后需要重新挂交互
    document.addEventListener('pjax:complete', mark);
})();
</script>`;

hexo.extend.injector.register('head_end', style, 'default');
hexo.extend.injector.register('body_end', script, 'default');

/* global hexo */

'use strict';

/**
 * 让 giscus 评论框跟随明暗切换。
 *
 * 主题在渲染时会把 data-theme 写死进 giscus 的 iframe 地址：
 *   appearance=light → theme=noborder_light
 *   appearance=dark  → theme=noborder_dark
 * 所以刷新页面是对的，但点右上角切换按钮时 iframe 不会重新加载，
 * 暗色页面里会留一个纯白评论框，非常突兀。
 *
 * 这里用 giscus 官方的 postMessage 接口在切换后通知它换主题。
 */

const script = `<script id="site-giscus-theme-sync">
(function () {
    var THEME = { light: 'noborder_light', dark: 'noborder_dark' };

    function isDark() {
        var appearance = document.documentElement.getAttribute('data-appearance');
        return appearance === 'dark' || (appearance === 'auto' && !!window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    function sync() {
        var frame = document.querySelector('iframe.giscus-frame');
        if (!frame || !frame.contentWindow) {
            return false;
        }
        frame.contentWindow.postMessage({
            giscus: { setConfig: { theme: isDark() ? THEME.dark : THEME.light } }
        }, 'https://giscus.app');
        return true;
    }

    // iframe 比脚本晚加载，所以做几次短间隔重试。
    // 不再写死一个「差不多够长」的延时：慢网下会漏，快网下白等
    function retry(times) {
        if (sync() || times <= 0) {
            return;
        }
        setTimeout(function () {
            retry(times - 1);
        }, 300);
    }

    // 切换按钮改的就是 <html data-appearance>，监听它即可
    new MutationObserver(sync).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-appearance']
    });

    // 首次加载和 Pjax 切换后各补一次（内部会自己重试）
    window.addEventListener('load', function () {
        retry(8);
    });
    document.addEventListener('pjax:complete', function () {
        retry(8);
    });
})();
</script>`;

hexo.extend.injector.register('body_end', script, 'default');

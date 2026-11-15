/* global hexo */

'use strict';

/**
 * 站点级自定义样式。
 *
 * 主题是从 npm 装的（node_modules/hexo-theme-icarus），不要直接改里面的文件，
 * 升级会被覆盖。这里用 injector 把一段 <style> 追加到每个页面的 </head> 前，
 * 因为排在主题样式表之后，同优先级下会覆盖主题默认值。
 */
const css = `<style id="site-custom-style">
/* 桌面以上：容器接近满宽，让左右两栏的卡片贴近窗口边缘 */
@media screen and (min-width: 1024px) {
    body.is-2-column .section,
    body.is-3-column .section {
        padding-left: 1rem;
        padding-right: 1rem;
    }

    body.is-2-column .container,
    body.is-3-column .container {
        width: 100%;
        /* 超宽屏时封顶，避免正文行宽太长 */
        max-width: min(1800px, 100%);
    }
}
</style>`;

hexo.extend.injector.register('head_end', css, 'default');

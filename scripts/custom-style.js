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
/* 桌面以上：左右各留 10%（容器占中间 80%） */
@media screen and (min-width: 1024px) {
    body.is-2-column .section,
    body.is-3-column .section {
        padding-left: 0;
        padding-right: 0;
    }

    body.is-2-column .container,
    body.is-3-column .container {
        width: 80%;
        max-width: 80%;
    }

    /* 正文大一号，行距放松（主题基础字号是 14px） */
    body.is-2-column .column-main .content,
    body.is-3-column .column-main .content {
        font-size: 16px;
        line-height: 1.85;
    }

    body.is-2-column .column-main .content h2,
    body.is-3-column .column-main .content h2 {
        font-size: 1.55rem;
    }

    body.is-2-column .column-main .content h3,
    body.is-3-column .column-main .content h3 {
        font-size: 1.3rem;
    }
}

/* 宽屏：侧边栏固定 300px，卡片不会被拉宽；剩余宽度全给正文 */
@media screen and (min-width: 1216px) {
    body.is-3-column .column-left,
    body.is-3-column .column-right {
        flex: 0 0 300px;
        width: 300px;
        max-width: 300px;
    }

    body.is-3-column .column-main {
        flex: 1 1 auto;
        width: auto;
        max-width: none;
    }
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

/* 后面那个数字徽章稍微深一点，形成层次 */
.widget[data-type="tags"] .tags.has-addons .tag:last-child {
    background: rgba(128, 128, 128, .3);
    color: inherit;
}

.widget[data-type="tags"] .tags.has-addons:hover .tag {
    background: rgba(128, 128, 128, .34);
}
</style>`;

hexo.extend.injector.register('head_end', css, 'default');

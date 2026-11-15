/* global hexo */

'use strict';

/**
 * 让正文里的行内公式 `$...$` 也能渲染。
 *
 * Icarus 的 KaTeX 插件只调用 `renderMathInElement(el)`，用的 KaTeX 默认分隔符，
 * 并不包含单个 `$`。这里在所有页面注入一段脚本，用带 `$` 的分隔符再渲染一次。
 * 渲染过（或主题已渲染完 $$）的元素会打标记，不会重复处理。
 */
const DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
];

const script = `<script>
(function () {
    var DELIMITERS = ${JSON.stringify(DELIMITERS)};

    function renderAll() {
        if (typeof window.renderMathInElement !== 'function') {
            return;
        }
        var nodes = document.querySelectorAll('[role="article"] > .content');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.dataset.mathDone === '1') {
                continue;
            }
            try {
                window.renderMathInElement(el, {
                    delimiters: DELIMITERS,
                    throwOnError: false
                });
                el.dataset.mathDone = '1';
            } catch (e) {
                console.warn('KaTeX render error:', e);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', renderAll);
    document.addEventListener('pjax:complete', function () {
        setTimeout(renderAll, 0);
    });
}());
</script>`;

hexo.extend.injector.register('body_end', script, 'default');

'use strict';

/**
 * markdown 逐行扫描工具。
 *
 * auto-excerpt 和 heading-number 都要「跳过代码块、逐行找标题」，
 * 这段围栏判断原本在两边各写了一份，改放到这里。
 *
 * 注意：Hexo 会把 scripts 目录下所有 .js 都 require 一遍，
 * 这个文件只导出函数、不注册任何过滤器，所以没有副作用。
 * 目录名用 lib，是为了和那些「一加载就生效」的插件脚本区分开。
 */

const FENCE_RE = /^[ \t]*(```|~~~)/;

/**
 * 逐行回调，自动跳过 fenced code block（``` / ~~~）里的内容。
 *
 * @param {string[]} lines 已经按 \n 切好的行
 * @param {(line: string, index: number) => void} onLine
 */
function eachLine(lines, onLine) {
    let fence = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = FENCE_RE.exec(line);

        if (match) {
            if (fence === null) {
                fence = match[1];
            } else if (fence === match[1]) {
                fence = null;
            }
            continue;
        }

        if (fence !== null) {
            continue;
        }

        onLine(line, i);
    }
}

module.exports = { eachLine };

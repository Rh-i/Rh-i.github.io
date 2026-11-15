---
title: 用 Hexo + Icarus 搭建这个博客
date: 2026-11-15 10:00:00
tags:
  - Hexo
  - 博客
categories:
  - 折腾
---

这是第一篇文章，记录一下这个博客是怎么搭起来的。

## 技术栈

| 部分 | 选择 |
| --- | --- |
| 生成器 | [Hexo](https://hexo.io) 8 |
| 主题 | [Icarus](https://github.com/ppoffice/hexo-theme-icarus) 7 |
| 部署 | GitHub Actions → GitHub Pages |
| 地址 | <https://rh-i.github.io> |

## 写新文章

在 `source/_posts/` 下新建 `.md` 文件，开头写 front-matter：

```yaml
---
title: 文章标题
date: 2026-11-15 10:00:00
tags: [STM32]
categories: [嵌入式]
---
```

也可以直接用命令行生成骨架：

```bash
npx hexo new post "文章标题"
```

## 本地预览

```bash
npx hexo server      # http://localhost:4000
```

## 发布

```bash
git add -A && git commit -m "post: xxx" && git push
```

推上去之后 Actions 会自动构建并部署，一两分钟后就能在线上看到。

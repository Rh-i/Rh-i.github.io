---
title: 用 Hexo + Icarus 搭建这个博客
date: 2026-11-15 22:00:00
tags:
  - Hexo
  - 博客
  - Icarus
categories:
  - 个人的一点小折腾
---
这是第一篇文章，记录一下这个博客是如何搭建起来的

## 1. 技术栈

| 部分   | 选择                                                     |
| ------ | -------------------------------------------------------- |
| 生成器 | [Hexo](https://hexo.io) 8                                 |
| 主题   | [Icarus](https://github.com/ppoffice/hexo-theme-icarus) 7 |
| 部署   | GitHub Actions → GitHub Pages                           |
| 地址   | [https://rh-i.github.io](https://rh-i.github.io)          |

## 2. 如何搭建以及发布

新时代了大家都积极拥抱ai，这个博客的搭建比曾经要轻松很多。

首先去Hexo上面选一个喜欢的主题，然后根据教程装环境，拉取[Icarus](https://github.com/ppoffice/hexo-theme-icarus)的仓库。修改完善之后，vscode上打开这个文件夹（工作区），配置github相关内容、折腾一些自动化脚本方便写博客。

推上去之后 Actions 会自动构建并部署，一两分钟后就能在线上看到。

## 3. 如何写博客

### 3.1 创建文章

在 `source/_posts/` 下新建 `.md` 文件，开头写 front-matter：

```yaml
---
title: 文章标题
date: 2026-11-15 10:00:00
tags: [STM32]
categories: [嵌入式]
---
```

其他部分就正常的md语法，写好之后推送，就可以正常显示。

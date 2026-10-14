# GitHub Notes

<div align="center">

![GitHub Notes Logo](assets/icon.svg)

**为 GitHub 仓库添加私有备注，并在常用页面中快速查看与管理**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chromewebstore.google.com/detail/github-notes/mejhlipglijbkcfcnljjdcdngafbbheo)
[![Microsoft Edge](https://img.shields.io/badge/Edge-Add--ons-blue)](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)
[![Release](https://img.shields.io/github/v/release/zjkal/github-notes)](https://github.com/zjkal/github-notes/releases)

[English](README_en.md) | 中文

</div>

---

## 快速开始

### 安装扩展（推荐）

> 普通用户请优先通过官方商店安装，可自动接收更新，无需开启开发者模式。

| 浏览器 | 安装方式 |
|--------|----------|
| **Chrome** | [Chrome Web Store](https://chromewebstore.google.com/detail/github-notes/mejhlipglijbkcfcnljjdcdngafbbheo) |
| **Edge** | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk) |

安装完成后，打开任意 GitHub 仓库，在右侧边栏 About 区域附近即可看到备注卡片；点击浏览器工具栏中的扩展图标可搜索与管理全部备注。详细步骤见下文 [使用说明](#使用说明)。

---

## 项目简介

![GitHub Notes Hero1](assets/hero1.png)

`GitHub Notes` 是基于 Manifest V3 的 Chromium 浏览器扩展，为 GitHub 仓库保存**仅自己可见**的本地备注，不依赖云端服务。

围绕三个主要场景设计：

| 场景 | 说明 |
|------|------|
| 仓库详情页 | 在侧边栏直接添加、编辑、删除备注 |
| Star 列表页 | 展示已保存的备注，方便回顾 |
| 弹窗 / 侧边栏 | 集中搜索、打开、备份所有备注 |

---

## 功能特性

### 仓库页内联备注

- 在 GitHub 仓库页面自动插入备注卡片
- 支持点击卡片或编辑按钮打开编辑器
- 支持保存、删除备注，并显示最后更新时间
- 兼容 GitHub 动态导航与 PJAX 页面切换

### Star 页面备注展示

- 在 `/<username>?tab=stars` 页面显示已保存备注
- 支持 `/stars/<username>/lists/<list>` 自定义 Star 列表
- 仅对本地已有备注的仓库注入内容
- 点击 Star 列表中的备注可直接进入编辑

### 弹窗与侧边栏管理

- 展示所有已保存备注，按最近更新时间排序
- 按仓库名或备注内容搜索
- 点击条目打开对应 GitHub 仓库
- 在支持 `sidePanel` 的浏览器中可切换为侧边栏模式

### 数据管理与其它

- 导出全部备注和插件设置为 JSON；从 JSON 文件导入
- 选项页查看备注数量、最近更新、最近备份、最近导入等概览
- 中英文界面本地化，适配浅色 / 深色主题
- 首次安装时自动初始化本地设置

### 支持的 GitHub 页面

- 仓库页：`https://github.com/<owner>/<repo>` 及 `issues`、`pulls`、`actions` 等子路径
- Star 页：`https://github.com/<user>?tab=stars`
- 自定义 Star 列表：`https://github.com/stars/<user>/lists/<list>`

---

## 使用说明

### 在仓库页添加备注

1. 打开任意 GitHub 仓库
2. 在右侧边栏 About 区域附近找到备注卡片
3. 点击卡片或编辑按钮，输入内容后保存

### 在 Star 页面查看备注

1. 打开自己的 Star 页面或某个 Star List
2. 已为本地保存过备注的仓库会显示备注块
3. 点击备注块可直接编辑

### 在弹窗中管理备注

1. 点击浏览器工具栏中的扩展图标
2. 在「备注列表」中浏览、搜索全部记录
3. 在「数据备份」中导入或导出 JSON
4. 在「设置」或选项页中查看配置与概览信息

---

## 数据与隐私

- 所有备注保存在 `chrome.storage.local`，不会自动上传到外部服务器
- 当前权限：`storage`、`activeTab`、`sidePanel`、`https://github.com/*`
- 备注以仓库全名作为键，例如 `owner/repo`

---

## 开发者指南

适用于参与贡献、调试或自行打包发布。

### 从源码加载（开发者模式）

1. 克隆仓库：

```bash
git clone https://github.com/zjkal/github-notes.git
cd github-notes
```

2. 打开扩展管理页：Chrome `chrome://extensions/` · Edge `edge://extensions/`
3. 开启「开发者模式」
4. 选择「加载已解压的扩展程序」，指向项目根目录

修改 `src`、`pages`、`styles` 或 `_locales` 后，在扩展管理页点击「重新加载」，再刷新 GitHub 页面验证。

### 项目结构

```text
github-notes/
├── manifest.json
├── src/
│   ├── background.js
│   ├── content.js
│   ├── i18n.js
│   ├── options.js
│   └── popup.js
├── pages/
│   ├── options.html
│   └── popup.html
├── styles/
│   └── content.css
├── _locales/
│   ├── en/messages.json
│   └── zh_CN/messages.json
├── assets/
└── build.ps1
```

### 构建发布包

```powershell
.\build.ps1
```

脚本会重建 `release/`、复制运行所需文件，并生成 `github-notes-v<version>.zip`。

### 技术实现

Manifest V3 · 原生 JavaScript · Chrome Extension / Storage / i18n API · 使用 `MutationObserver` 与防抖适配 GitHub 动态 DOM

---

## 贡献

欢迎提交 Issue 和 Pull Request。开始前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

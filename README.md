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

## 项目简介

![GitHub Notes Hero1](assets/hero1.png)

`GitHub Notes` 是一个基于 Manifest V3 的 Chromium 浏览器扩展，用来给 GitHub 仓库保存仅自己可见的本地备注。

它当前围绕 3 个主要使用场景展开：

- 在仓库详情页侧边栏直接添加、编辑、删除备注
- 在 GitHub Star 列表页展示已经保存过的备注，方便回顾
- 在弹窗或侧边栏中集中搜索、打开、备份所有备注

所有数据都保存在浏览器本地，不依赖云端服务。

## 当前功能

### 1. 仓库页内联备注

- 在 GitHub 仓库页面自动插入备注卡片
- 支持点击卡片或编辑按钮打开编辑器
- 支持保存、删除备注
- 显示最后更新时间
- 兼容 GitHub 的动态导航和 PJAX 页面切换

### 2. Star 页面备注展示

- 在 `/<username>?tab=stars` 页面显示已保存备注
- 支持在 `/stars/<username>/lists/<list>` 自定义 Star 列表中显示备注
- 仅对本地已存在备注的仓库注入内容，不改动未备注的条目
- 点击 Star 列表中的备注可直接进入编辑

### 3. 弹窗与侧边栏管理

- 展示所有已保存备注
- 按仓库名或备注内容搜索
- 按最近更新时间排序
- 点击条目可直接打开对应 GitHub 仓库
- 在支持 `sidePanel` 的浏览器中可切换为侧边栏模式

### 4. 数据管理

- 导出全部备注和插件设置为 JSON
- 从 JSON 文件导入备注数据
- 在选项页查看备注数量、最近更新、最近备份、最近导入等概览信息

### 5. 其他

- 中英文界面本地化
- 适配浅色/深色主题
- 首次安装时自动初始化本地设置

## 支持页面

- 仓库页面：`https://github.com/<owner>/<repo>`
- 仓库子页面：如 `issues`、`pulls`、`actions` 等仓库内页面
- Star 页面：`https://github.com/<user>?tab=stars`
- 自定义 Star 列表：`https://github.com/stars/<user>/lists/<list>`

## 安装

### 通过扩展商店安装

- Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/github-notes/mejhlipglijbkcfcnljjdcdngafbbheo)
- Edge: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)

### 开发者模式加载

1. 克隆仓库

```bash
git clone https://github.com/zjkal/github-notes.git
cd github-notes
```

2. 打开浏览器扩展页

- Chrome: `chrome://extensions/`
- Edge: `edge://extensions/`

3. 开启“开发者模式”

4. 选择“加载已解压的扩展程序”，并指向当前项目目录

## 使用说明

### 在仓库页添加备注

1. 打开任意 GitHub 仓库
2. 在右侧边栏的 About 区域附近找到备注卡片
3. 点击卡片或编辑按钮
4. 输入内容后保存

### 在 Star 页面查看备注

1. 打开自己的 Star 页面或某个 Star List
2. 插件会为本地已经保存过备注的仓库显示备注块
3. 点击备注块可直接编辑

### 在弹窗中管理备注

1. 点击浏览器工具栏中的扩展图标
2. 在“备注列表”中浏览全部记录
3. 使用搜索框按仓库名或备注关键词过滤
4. 在“数据备份”中导入或导出 JSON
5. 在“设置”或选项页中查看基本配置与概览信息

## 数据与隐私

- 所有备注保存在 `chrome.storage.local`
- 不会自动上传到任何外部服务器
- 当前仅请求 `storage`、`activeTab`、`sidePanel` 以及 `https://github.com/*` 访问权限
- 备注以仓库全名作为键保存，例如 `owner/repo`

## 项目结构

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

## 本地开发

这个项目当前不依赖打包器，修改源文件后重新加载扩展即可查看效果。

### 开发流程

1. 修改 `src`、`pages`、`styles` 或 `_locales` 下的文件
2. 回到浏览器扩展管理页
3. 点击“重新加载”
4. 在 GitHub 页面刷新后验证效果

### 构建发布包

仓库提供了一个 PowerShell 构建脚本：

```powershell
.\build.ps1
```

执行后会：

- 重新创建 `release/` 目录
- 复制扩展运行所需文件
- 生成 `github-notes-v<version>.zip` 发布包

## 技术实现

- Manifest V3
- 原生 JavaScript
- Chrome Extension APIs
- Chrome Storage API
- Chrome i18n API
- `MutationObserver` + 防抖，用于适配 GitHub 动态页面更新

## 贡献

欢迎提交 Issue 和 Pull Request。开始之前可以先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

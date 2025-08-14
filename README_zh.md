# GitHub Notes

<div align="center">

![GitHub Notes Logo](icon.svg)

**为 GitHub 仓库添加私人备注的强大浏览器扩展**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Microsoft Edge](https://img.shields.io/badge/Edge-Add--ons-blue)](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/zjkal/github-notes/releases)

[English](README.md) | 中文

</div>

## 📝 项目简介

GitHub Notes 是一个轻量级的浏览器扩展，允许您为任何 GitHub 仓库添加私人备注。通过持久化的本地备注功能，帮助您记住重要的仓库信息，提升代码管理体验。

## ✨ 功能特性

### 🎯 核心功能
- **私有备注**：为任何 GitHub 仓库添加个人备注
- **实时编辑**：点击即可编辑，支持即时保存
- **本地存储**：所有数据保存在本地，保护隐私
- **跨标签页同步**：备注在浏览器标签页间实时同步
- **GitHub 集成**：完美融入 GitHub 界面设计

### 🌍 多语言支持
- **中英双语**：完整的界面本地化
- **自动检测**：自动检测浏览器语言
- **手动切换**：可在设置中切换语言

### 📊 数据管理
- **导入导出**：支持 JSON 格式的数据备份和恢复
- **搜索功能**：快速搜索备注内容
- **统计信息**：查看备注数量和使用统计
- **数据隐私**：无云同步，所有数据保存在本地

### 🎨 用户体验
- **GitHub 风格界面**：完美匹配 GitHub 设计语言
- **响应式设计**：支持所有屏幕尺寸
- **深色模式**：自动适配主题
- **快捷键支持**：高效的备注管理

## 🚀 安装方法

### 方法一：浏览器扩展商店（推荐）
- **Chrome**：[从 Chrome 网上应用店安装](https://chrome.google.com/webstore)（即将推出）
- **Edge**：[从 Microsoft Edge 加载项安装](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)

### 方法二：开发者模式（当前）

1. **下载扩展**
   ```bash
   git clone https://github.com/zjkal/github-notes.git
   cd github-notes
   ```

2. **打开浏览器扩展页面**
   - Chrome：访问 `chrome://extensions/`
   - Edge：访问 `edge://extensions/`

3. **启用开发者模式**
   - 在右上角打开"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择扩展文件夹
   - 扩展将自动安装并启用

## 📖 使用指南

### 基本使用

1. **添加备注**
   - 访问任何 GitHub 仓库页面
   - 在仓库侧边栏查找备注区域
   - 点击"添加备注"开始编写

2. **编辑备注**
   - 点击现有备注内容或编辑按钮
   - 在弹出编辑器中修改内容
   - 点击"保存"或按 `Ctrl+S` 保存

3. **删除备注**
   - 在备注编辑器中点击删除链接
   - 确认删除操作

### 高级功能

- **备注管理**：点击浏览器工具栏中的扩展图标
- **搜索备注**：在弹窗中使用搜索功能
- **数据备份**：通过设置页面导出/导入备注
- **自定义设置**：右键扩展图标 → 选项

## ⌨️ 快捷键

- `Ctrl + E`：快速编辑当前页面备注
- `Ctrl + S`：保存备注（编辑模式下）
- `Escape`：取消编辑

## 🔒 隐私与安全

- **仅本地存储**：所有数据仅存储在您的浏览器本地
- **无网络请求**：扩展不会向任何服务器发送数据
- **最小权限**：仅需要访问 GitHub 页面的权限
- **开源透明**：完整源代码可供审查

## 🛠️ 技术细节

### 技术栈
- **Manifest V3**：最新的浏览器扩展标准
- **原生 JavaScript**：无外部依赖
- **Chrome Storage API**：安全的本地数据存储
- **国际化**：Chrome i18n API 多语言支持

### 浏览器兼容性
- Chrome 88+
- Microsoft Edge 88+
- 任何支持 Manifest V3 的 Chromium 内核浏览器

## 📁 项目结构

```
github-notes/
├── manifest.json          # 扩展配置文件
├── _locales/              # 国际化文件
│   ├── en/messages.json   # 英文翻译
│   └── zh_CN/messages.json # 中文翻译
├── background.js          # 后台服务
├── content.js             # GitHub 页面内容脚本
├── content.css            # GitHub 集成样式
├── popup.html             # 扩展弹窗界面
├── popup.js               # 弹窗功能
├── options.html           # 设置页面
├── options.js             # 设置功能
├── i18n.js                # 国际化工具
├── icon.svg               # 扩展图标
└── README.md              # 说明文档
```

## 🤝 贡献代码

我们欢迎贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解详情。

### 开发环境搭建

1. **克隆仓库**
   ```bash
   git clone https://github.com/zjkal/github-notes.git
   cd github-notes
   ```

2. **在浏览器中加载**
   - 按照上述开发者模式安装步骤
   - 修改代码
   - 重新加载扩展以测试更改

3. **提交更改**
   - Fork 仓库
   - 创建功能分支
   - 进行更改
   - 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 支持项目

如果这个扩展对您有帮助，请考虑：
- ⭐ 为仓库点星
- 🐛 报告问题和建议
- 💡 贡献代码和想法
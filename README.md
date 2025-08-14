# GitHub Notes

<div align="center">

![GitHub Notes Logo](icon.svg)

**A powerful browser extension for adding private notes to GitHub repositories**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Microsoft Edge](https://img.shields.io/badge/Edge-Add--ons-blue)](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/zjkal/github-notes/releases)

English | [中文](README_zh.md)

</div>

## 📝 Overview

GitHub Notes is a lightweight browser extension that allows you to add private, personal notes to any GitHub repository. Enhance your code management experience with persistent, local notes that help you remember important details about repositories you work with.

## ✨ Features

### 🎯 Core Functionality
- **Private Notes**: Add personal notes to any GitHub repository
- **Real-time Editing**: Click to edit with instant save functionality
- **Local Storage**: All data stored locally for privacy protection
- **Cross-tab Sync**: Notes sync across browser tabs in real-time
- **GitHub Integration**: Seamlessly integrates with GitHub's interface

### 🌍 Multi-language Support
- **English & Chinese**: Full interface localization
- **Auto Detection**: Automatically detects browser language

### 📊 Data Management
- **Import/Export**: JSON format data backup and restore
- **Search Function**: Quickly find notes by content
- **Statistics**: View note counts and usage statistics
- **Data Privacy**: No cloud sync, all data stays local

### 🎨 User Experience
- **GitHub-style UI**: Perfectly matches GitHub's design language
- **Responsive Design**: Works on all screen sizes
- **Dark Mode**: Automatic theme adaptation
- **Keyboard Shortcuts**: Efficient note management

## 🚀 Installation

### Method 1: Browser Extension Store (Recommended)
- **Chrome**: [Install from Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
- **Edge**: [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/github-notes/kjecncpipakdbomdpagliljcaomojjbk)

### Method 2: Developer Mode (Current)

1. **Download the extension**
   ```bash
   git clone https://github.com/zjkal/github-notes.git
   cd github-notes
   ```

2. **Open browser extensions page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the extension folder
   - The extension will be installed and activated

## 📖 Usage Guide

### Basic Usage

1. **Adding Notes**
   - Visit any GitHub repository page
   - Look for the notes section in the repository sidebar
   - Click "Add Note" to start writing

2. **Editing Notes**
   - Click on existing note content or the edit button
   - Modify content in the popup editor
   - Click "Save" or press `Ctrl+S` to save

3. **Deleting Notes**
   - Click the delete link in the note editor
   - Confirm the deletion

### Advanced Features

- **Notes Management**: Click the extension icon in the browser toolbar
- **Search Notes**: Use the search function in the popup
- **Data Backup**: Export/import notes via the settings page
- **Customize Settings**: Right-click extension icon → Options

## ⌨️ Keyboard Shortcuts

- `Ctrl + E`: Quick edit current page note
- `Ctrl + S`: Save note (in edit mode)
- `Escape`: Cancel editing

## 🔒 Privacy & Security

- **Local Storage Only**: All data stored in your browser locally
- **No Network Requests**: Extension doesn't send data to any servers
- **Minimal Permissions**: Only requires access to GitHub pages
- **Open Source**: Full source code available for audit

## 🛠️ Technical Details

### Built With
- **Manifest V3**: Latest browser extension standard
- **Vanilla JavaScript**: No external dependencies
- **Chrome Storage API**: Secure local data storage
- **Internationalization**: Chrome i18n API for multi-language support

### Browser Compatibility
- Chrome 88+
- Microsoft Edge 88+
- Any Chromium-based browser with Manifest V3 support

## 📁 Project Structure

```
github-notes/
├── manifest.json          # Extension configuration
├── _locales/              # Internationalization files
│   ├── en/messages.json   # English translations
│   └── zh_CN/messages.json # Chinese translations
├── background.js          # Service worker
├── content.js             # Content script for GitHub pages
├── content.css            # Styles for GitHub integration
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── options.html           # Settings page
├── options.js             # Settings functionality
├── i18n.js                # Internationalization utilities
├── icon.svg               # Extension icon
└── README.md              # This file
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/zjkal/github-notes.git
   cd github-notes
   ```

2. **Load in browser**
   - Follow the developer mode installation steps above
   - Make changes to the code
   - Reload the extension to test changes

3. **Submit changes**
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support

If you find this extension helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and suggestions
- 💡 Contributing code and ideas
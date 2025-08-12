// GitHub Repository Notes - Options Script
// 选项页面的交互逻辑和设置管理功能

class GitHubNotesOptions {
  constructor() {
    this.settings = {};
    this.init();
  }

  // 初始化选项页面
  async init() {
    try {
      // 初始化国际化
      I18n.initPageText();
      
      // 绑定事件监听器
      this.bindEventListeners();
      
      // 加载设置
      await this.loadSettings();
      
      // 显示版本信息
      this.displayVersion();
      
    } catch (error) {
      console.error('GitHub Notes Options: 初始化失败', error);
      this.showNotification(t('error'), 'error');
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 导航菜单
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchSection(e.target.dataset.section);
      });
    });

    // 数据管理按钮
    document.getElementById('exportAllBtn').addEventListener('click', () => this.exportAllNotes());
    document.getElementById('importBtn').addEventListener('click', () => this.importNotes());

    // 文件输入
    document.getElementById('importFile').addEventListener('change', (e) => this.handleFileImport(e));

    // 保存设置按钮
    document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAllSettings());

    // 关于页面链接
    document.getElementById('homepageLink').addEventListener('click', () => this.openLink('https://github.com/zjkal/github-notes'));
    document.getElementById('issuesLink').addEventListener('click', () => this.openLink('https://github.com/zjkal/github-notes/issues'));
    document.getElementById('changelogLink').addEventListener('click', () => this.openLink('https://github.com/zjkal/github-notes/releases'));
    document.getElementById('donateLink').addEventListener('click', () => this.openLink('https://github.com/sponsors/zjkal'));
  }

  // 切换页面部分
  switchSection(sectionName) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
  }

  // 加载设置
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });
      
      if (response.success) {
        this.settings = response.settings;
        this.updateSettingsUI();
      }
    } catch (error) {
      console.error('GitHub Notes Options: 加载设置失败', error);
      // 使用默认设置
      this.settings = this.getDefaultSettings();
      this.updateSettingsUI();
    }
  }

  // 获取默认设置
  getDefaultSettings() {
    return {
      enableNotifications: true
    };
  }

  // 更新设置界面
  updateSettingsUI() {
    // 常规设置
    document.getElementById('enableNotifications').checked = this.settings.enableNotifications !== false;
  }

  // 保存所有设置
  async saveAllSettings() {
    try {
      const newSettings = {
        enableNotifications: document.getElementById('enableNotifications').checked
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });
      
      if (response.success) {
        this.settings = response.settings;
        this.showNotification(t('settingsSaved'), 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Options: 保存设置失败', error);
      this.showNotification(t('saveFailed'), 'error');
    }
  }

  // 导出所有备注
  async exportAllNotes() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportAllNotes'
      });
      
      if (response.success) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `github-notes-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(t('exportSuccess'), 'success');
      } else {
        throw new Error(t('exportFailed'));
      }
    } catch (error) {
      console.error('GitHub Notes Options: 导出失败', error);
      this.showNotification(t('exportFailed'), 'error');
    }
  }

  // 导入备注
  importNotes() {
    document.getElementById('importFile').click();
  }

  // 处理文件导入
  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      const response = await chrome.runtime.sendMessage({
        action: 'importNotes',
        data: importData
      });
      
      if (response.success) {
        this.showNotification(response.message, 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Options: 导入失败', error);
      this.showNotification(t('importFailed') + '：' + error.message, 'error');
    }
    
    // 清空文件输入
    event.target.value = '';
  }

  // 显示版本信息
  displayVersion() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById('pluginVersion').textContent = t('version', manifest.version);
  }

  // 打开链接
  openLink(url) {
    chrome.tabs.create({ url });
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化选项页面
const options = new GitHubNotesOptions();

// 导出到全局作用域
window.options = options;
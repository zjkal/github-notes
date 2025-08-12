// GitHub Repository Notes - Popup Script
// 弹窗页面的交互逻辑和数据管理功能

class GitHubNotesPopup {
  constructor() {
    this.currentTab = 'notes';
    this.allNotes = {};
    this.filteredNotes = {};
    this.settings = {};
    this.init();
  }

  // 初始化弹窗
  async init() {
    try {
      // 初始化国际化
      I18n.initPageText();
      
      // 绑定事件监听器
      this.bindEventListeners();
      
      // 加载数据
      await this.loadData();
      
      // 更新统计信息
      await this.updateStats();
      
      // 显示备注列表
      this.displayNotes();
      
      // 加载设置
      await this.loadSettings();
      
      // 显示版本信息
      this.displayVersion();
      
    } catch (error) {
      console.error('GitHub Notes Popup: 初始化失败', error);
      this.showNotification(t('error'), 'error');
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchNotes(e.target.value);
    });

    // 数据管理按钮
    document.getElementById('exportBtn').addEventListener('click', () => this.exportNotes());
    document.getElementById('importBtn').addEventListener('click', () => this.importNotes());

    // 文件导入
    document.getElementById('importFile').addEventListener('change', (e) => this.handleFileImport(e));

    // 设置按钮
    document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
    document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());

    // 底部链接
    document.getElementById('optionsLink').addEventListener('click', () => this.openOptions());
    document.getElementById('helpLink').addEventListener('click', () => this.openHelp());
  }

  // 切换标签页
  switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;

    // 根据标签页执行特定操作
    if (tabName === 'notes') {
      this.displayNotes();
    } else if (tabName === 'settings') {
      this.loadSettings();
    }
  }

  // 加载数据
  async loadData() {
    try {
      const result = await chrome.storage.local.get(null);
      this.allNotes = {};
      
      // 提取备注数据
      for (const key in result) {
        if (!key.startsWith('plugin_') && result[key].content !== undefined) {
          this.allNotes[key] = result[key];
        }
      }
      
      this.filteredNotes = { ...this.allNotes };
    } catch (error) {
      console.error('GitHub Notes Popup: 加载数据失败', error);
      throw error;
    }
  }

  // 更新统计信息
  async updateStats() {
    try {
      const totalNotes = Object.keys(this.allNotes).length;
      document.getElementById('totalNotes').textContent = totalNotes;

      // 计算今日新增备注
      const today = new Date().toDateString();
      let todayCount = 0;
      
      for (const key in this.allNotes) {
        const note = this.allNotes[key];
        if (note.createdAt) {
          const noteDate = new Date(note.createdAt).toDateString();
          if (noteDate === today) {
            todayCount++;
          }
        }
      }
      
      document.getElementById('todayNotes').textContent = todayCount;
    } catch (error) {
      console.error('GitHub Notes Popup: 更新统计失败', error);
    }
  }

  // 显示备注列表
  displayNotes() {
    const notesList = document.getElementById('notesList');
    
    if (Object.keys(this.filteredNotes).length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <div class="message">${t('noNotesFound')}</div>
          <div class="submessage">${t('noNotesDescription')}</div>
        </div>
      `;
      return;
    }

    // 按更新时间排序
    const sortedNotes = Object.entries(this.filteredNotes)
      .sort(([,a], [,b]) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const notesHtml = sortedNotes.map(([repoKey, note]) => {
      const updatedDate = new Date(note.updatedAt).toLocaleString();
      const shortContent = note.content.length > 100 
        ? note.content.substring(0, 100) + '...' 
        : note.content;

      return `
        <div class="note-item" data-repo="${repoKey}">
          <div class="note-repo">
            <a href="https://github.com/${repoKey}" target="_blank" class="repo-link">${repoKey}</a>
          </div>
          <div class="note-content">${this.escapeHtml(shortContent)}</div>
          <div class="note-meta">
            <span>${t('updated', updatedDate)}</span>
          </div>
        </div>
      `;
    }).join('');

    notesList.innerHTML = notesHtml;
  }

  // 搜索备注
  async searchNotes(query) {
    if (!query || query.trim() === '') {
      this.filteredNotes = { ...this.allNotes };
    } else {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'searchNotes',
          query: query
        });
        
        if (response.success) {
          this.filteredNotes = {};
          response.results.forEach(result => {
            this.filteredNotes[result.repoKey] = {
              content: result.content,
              createdAt: result.createdAt,
              updatedAt: result.updatedAt
            };
          });
        }
      } catch (error) {
        console.error('GitHub Notes Popup: 搜索失败', error);
        this.filteredNotes = {};
      }
    }
    
    this.displayNotes();
  }



  // 导出备注
  async exportNotes() {
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
        a.download = `github-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(t('exportSuccess'), 'success');
      } else {
        throw new Error(t('exportFailed'));
      }
    } catch (error) {
      console.error('GitHub Notes Popup: 导出失败', error);
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
        await this.loadData();
        await this.updateStats();
        this.displayNotes();
        this.showNotification(response.message, 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Popup: 导入失败', error);
      this.showNotification(t('importFailed') + '：' + error.message, 'error');
    }
    
    // 清空文件输入
    event.target.value = '';
  }



  // 加载设置
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });
      
      if (response.success) {
        this.settings = response.settings;
        
        // 更新设置UI
    document.getElementById('enableNotifications').checked = this.settings.enableNotifications !== false;
      }
    } catch (error) {
      console.error('GitHub Notes Popup: 加载设置失败', error);
    }
  }

  // 保存设置
  async saveSettings() {
    try {
      const settings = {
        enableNotifications: document.getElementById('enableNotifications').checked
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
      
      if (response.success) {
        this.settings = response.settings;
        this.showNotification(t('settingsSaved'), 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Popup: 保存设置失败', error);
      this.showNotification(t('saveFailed'), 'error');
    }
  }

  // 重置设置
  async resetSettings() {
    if (!confirm(t('confirmReset'))) {
      return;
    }

    try {
      const defaultSettings = {
        enableNotifications: true
      };
      
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: defaultSettings
      });
      
      if (response.success) {
        await this.loadSettings();
        this.showNotification(t('settingsReset'), 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Popup: 重置设置失败', error);
      this.showNotification(t('resetFailed'), 'error');
    }
  }

  // 打开选项页面
  openOptions() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }

  // 打开帮助
  openHelp() {
    chrome.tabs.create({
      url: 'https://github.com/zjkal/github-notes#readme'
    });
  }

  // 显示版本信息
  displayVersion() {
    const manifest = chrome.runtime.getManifest();
    const popupVersion = document.getElementById('popupVersion');
    if (popupVersion) {
      popupVersion.textContent = t('version', manifest.version);
    }
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

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化弹窗
const popup = new GitHubNotesPopup();

// 导出到全局作用域（用于HTML中的onclick事件）
window.popup = popup;
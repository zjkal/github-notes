// GitHub Repository Notes - Popup Script
// 弹窗页面的交互逻辑和数据管理功能

// 生产环境禁用调试信息输出
if ('update_url' in chrome.runtime.getManifest()) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

class GitHubNotesPopup {
  constructor() {
    this.currentTab = 'notes';
    this.allNotes = {};
    this.filteredNotes = {};
    this.settings = {};
    this.searchQuery = '';
    this.surfaceMode = 'popup';
    this.sidePanelSupported = false;
    this.handleWindowResize = () => this.applySurfaceMode();
    this.init();
  }

  // 初始化弹窗
  async init() {
    try {
      this.sidePanelSupported = this.supportsSidePanel();
      this.applySurfaceMode();
      I18n.initPageText();
      document.getElementById('clearSearchBtn').setAttribute('aria-label', t('clearSearch'));
      this.bindEventListeners();
      await this.loadData();
      await this.updateStats();
      this.displayNotes();
      await this.loadSettings();
      this.displayVersion();
    } catch (error) {
      console.error('GitHub Notes Popup: 初始化失败', error);
      this.showNotification(t('error'), 'error');
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    window.addEventListener('resize', this.handleWindowResize);

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchNotes(e.target.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && e.target.value) {
        this.clearSearch();
      }
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());

    const notesList = document.getElementById('notesList');
    notesList.addEventListener('click', (e) => {
      const noteItem = e.target.closest('.note-item');
      if (!noteItem) {
        return;
      }
      this.openRepo(noteItem.dataset.repo);
    });
    notesList.addEventListener('keydown', (e) => {
      const noteItem = e.target.closest('.note-item');
      if (!noteItem) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openRepo(noteItem.dataset.repo);
      }
    });

    document.getElementById('exportBtn').addEventListener('click', () => this.exportNotes());
    document.getElementById('importBtn').addEventListener('click', () => this.importNotes());
    document.getElementById('importFile').addEventListener('change', (e) => this.handleFileImport(e));

    document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
    document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());

    const openSidePanelBtn = document.getElementById('openSidePanelBtn');
    if (openSidePanelBtn) {
      openSidePanelBtn.addEventListener('click', () => this.openSidePanel());
    }

    document.getElementById('optionsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openOptions();
    });
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });
  }

  applySurfaceMode() {
    const nextMode = this.detectSurfaceMode();
    const hasSameSurface = this.surfaceMode === nextMode && document.body.dataset.surface === nextMode;
    if (hasSameSurface) {
      this.updateSidePanelEntryVisibility();
      return;
    }

    this.surfaceMode = nextMode;
    document.documentElement.dataset.surface = nextMode;
    document.body.dataset.surface = nextMode;
    this.updateSidePanelEntryVisibility();
  }

  detectSurfaceMode() {
    const requestedSurface = new URLSearchParams(window.location.search).get('surface');
    if (requestedSurface === 'sidebar' || requestedSurface === 'popup') {
      return requestedSurface;
    }

    return window.innerHeight >= 700 || window.innerWidth >= 480
      ? 'sidebar'
      : 'popup';
  }

  supportsSidePanel() {
    return Boolean(chrome.sidePanel?.open);
  }

  updateSidePanelEntryVisibility() {
    const openSidePanelBtn = document.getElementById('openSidePanelBtn');
    if (!openSidePanelBtn) {
      return;
    }

    openSidePanelBtn.hidden = !this.sidePanelSupported || this.surfaceMode === 'sidebar';
  }

  // 切换标签页
  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;

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
    const resultsCount = document.getElementById('resultsCount');
    const notesSummaryText = document.getElementById('notesSummaryText');
    const filteredEntries = Object.entries(this.filteredNotes);

    resultsCount.textContent = filteredEntries.length
      ? t('searchResultsCount', filteredEntries.length.toString())
      : '';
    notesSummaryText.textContent = this.searchQuery
      ? t('searchResults')
      : t('recentlyUpdated');

    if (Object.keys(this.filteredNotes).length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">${this.searchQuery ? t('searchNoResultsTitle') : t('noNotesFound')}</div>
          <div class="empty-description">${this.searchQuery ? t('searchNoResultsDescription') : t('noNotesDescription')}</div>
        </div>
      `;
      return;
    }

    const sortedNotes = filteredEntries.sort(([, a], [, b]) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const notesHtml = sortedNotes.map(([repoKey, note]) => {
      const ownerInitial = repoKey.charAt(0).toUpperCase();

      return `
        <button class="note-item" type="button" data-repo="${repoKey}" title="${t('openRepository')}">
          <div class="note-avatar">${this.escapeHtml(ownerInitial)}</div>
          <div>
            <div class="note-header">
              <div class="note-repo">${this.escapeHtml(repoKey)}</div>
            </div>
            <div class="note-content">${this.escapeHtml(note.content)}</div>
            <div class="note-meta">
              <span>${t('lastUpdated', this.formatDate(note.updatedAt))}</span>
              <span>${t('clickToOpen')}</span>
            </div>
          </div>
        </button>
      `;
    }).join('');

    notesList.innerHTML = notesHtml;
  }

  // 搜索备注
  async searchNotes(query) {
    this.searchQuery = query.trim();
    this.updateSearchUi();

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

  updateSearchUi() {
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    clearSearchBtn.classList.toggle('visible', Boolean(this.searchQuery));
  }

  clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    this.searchNotes('');
    searchInput.focus();
  }

  openRepo(repoKey) {
    if (!repoKey) {
      return;
    }

    chrome.tabs.create({
      url: `https://github.com/${repoKey}`
    });
  }

  async openSidePanel() {
    if (!chrome.sidePanel?.open) {
      this.showNotification(t('openSidePanelUnsupported'), 'error');
      return;
    }

    try {
      const currentWindow = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      window.close();
    } catch (error) {
      console.error('GitHub Notes Popup: 打开侧边栏失败', error);
      this.showNotification(t('openSidePanelFailed'), 'error');
    }
  }

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
    chrome.runtime.openOptionsPage();
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
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

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

  formatDate(dateString) {
    if (!dateString) {
      return '';
    }

    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  }
}

// 初始化弹窗
const popup = new GitHubNotesPopup();

// 导出到全局作用域（用于HTML中的onclick事件）
window.popup = popup;

// GitHub Repository Notes - Options Script
// 选项页面的交互逻辑和设置管理功能

// 生产环境禁用调试信息输出
if ('update_url' in chrome.runtime.getManifest()) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

class GitHubNotesOptions {
  constructor() {
    this.settings = {};
    this.overview = {
      totalNotes: 0,
      latestUpdate: null,
      metadata: {}
    };
    this.init();
  }

  // 初始化选项页面
  async init() {
    try {
      I18n.initPageText();
      this.bindEventListeners();
      await this.loadSettings();
      await this.loadOverview();
      this.displayVersion();
    } catch (error) {
      console.error('GitHub Notes Options: 初始化失败', error);
      this.showNotification(t('error'), 'error');
    }
  }

  // 绑定事件监听器
  bindEventListeners() {
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.exportAllNotes());
    }

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importNotes());
    }

    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.addEventListener('change', (e) => this.handleFileImport(e));
    }

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.saveAllSettings());
    }

    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }
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

  updateSettingsUI() {
    const enableNotifications = document.getElementById('enableNotifications');
    if (enableNotifications) {
      enableNotifications.checked = this.settings.enableNotifications !== false;
      enableNotifications.setAttribute('aria-label', t('enableNotifications'));
    }
  }

  async saveAllSettings() {
    try {
      const enableNotifications = document.getElementById('enableNotifications');
      const newSettings = {
        enableNotifications: enableNotifications ? enableNotifications.checked : true
      };

      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });

      if (response.success) {
        this.settings = response.settings;
        this.updateNotificationState();
        this.showNotification(t('settingsSaved'), 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Options: 保存设置失败', error);
      this.showNotification(t('saveFailed'), 'error');
    }
  }

  async resetSettings() {
    if (!confirm(t('confirmReset'))) {
      return;
    }

    this.settings = this.getDefaultSettings();
    this.updateSettingsUI();
    await this.saveAllSettings();
  }

  async loadOverview() {
    try {
      const result = await chrome.storage.local.get(null);
      const notesEntries = Object.entries(result).filter(([key, value]) => !key.startsWith('plugin_') && value && value.content !== undefined);
      const metadata = result.plugin_metadata || {};
      let latestUpdate = null;

      notesEntries.forEach(([, note]) => {
        if (note.updatedAt && (!latestUpdate || new Date(note.updatedAt) > new Date(latestUpdate))) {
          latestUpdate = note.updatedAt;
        }
      });

      this.overview = {
        totalNotes: notesEntries.length,
        latestUpdate,
        metadata
      };

      this.renderOverview();
    } catch (error) {
      console.error('GitHub Notes Options: 加载概览失败', error);
    }
  }

  renderOverview() {
    this.setText('overviewNoteCount', this.overview.totalNotes.toString());

    const latestUpdateText = this.overview.latestUpdate
      ? this.formatDate(this.overview.latestUpdate)
      : t('neverUpdated');

    const lastBackupText = this.overview.metadata.lastBackup
      ? this.formatDate(this.overview.metadata.lastBackup)
      : t('notBackedUpYet');

    const lastImportText = this.overview.metadata.lastImport
      ? this.formatDate(this.overview.metadata.lastImport)
      : t('neverImported');
    this.setText('overviewLatestUpdate', latestUpdateText);
    this.setText('backupLastTime', lastBackupText);
    this.setText('importLastTime', lastImportText);

    this.updateNotificationState();
  }

  updateNotificationState() {
    const notificationState = this.settings.enableNotifications !== false
      ? t('notificationsEnabled')
      : t('notificationsDisabled');

    this.setText('settingsStatus', notificationState);
  }

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

        await this.loadOverview();
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
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.click();
    }
  }

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
        await this.loadOverview();
        this.showNotification(response.message, 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('GitHub Notes Options: 导入失败', error);
      this.showNotification(t('importFailed') + '：' + error.message, 'error');
    }

    event.target.value = '';
  }

  displayVersion() {
    const manifest = chrome.runtime.getManifest();
    const pluginVersion = document.getElementById('pluginVersion');
    if (pluginVersion) {
      pluginVersion.textContent = t('version', manifest.version);
    }
  }

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

  setText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  formatDate(dateString) {
    if (!dateString) {
      return '-';
    }

    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  }
}

// 初始化选项页面
const options = new GitHubNotesOptions();

// 导出到全局作用域
window.options = options;

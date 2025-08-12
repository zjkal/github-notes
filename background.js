// GitHub Repository Notes - Background Script
// 处理插件生命周期和数据同步

class GitHubNotesBackground {
  constructor() {
    this.init();
  }

  // 初始化后台脚本
  init() {
    // 监听插件安装事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // 监听来自content script和popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听存储变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChanged(changes, namespace);
    });

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });
  }

  // 处理插件安装事件
  async handleInstalled(details) {
    console.log('GitHub Notes: 插件已安装', details);

    if (details.reason === 'install') {
      // 首次安装
      await this.initializePlugin();
      
      // 打开欢迎页面
      chrome.tabs.create({
        url: chrome.runtime.getURL('options.html')
      });
    } else if (details.reason === 'update') {
      // 插件更新
      await this.handlePluginUpdate(details.previousVersion);
    }
  }

  // 初始化插件
  async initializePlugin() {
    try {
      // 设置默认配置
      const defaultSettings = {
        enableNotifications: true
      };

      // 设置插件元数据
      const metadata = {
        version: '1.0.0',
        installDate: new Date().toISOString(),
        totalNotes: 0,
        lastBackup: null
      };

      await chrome.storage.local.set({
        'plugin_settings': defaultSettings,
        'plugin_metadata': metadata
      });

      console.log('GitHub Notes: 插件初始化完成');
    } catch (error) {
      console.error('GitHub Notes: 插件初始化失败', error);
    }
  }

  // 处理插件更新
  async handlePluginUpdate(previousVersion) {
    try {
      console.log(`GitHub Notes: 插件从 ${previousVersion} 更新到 1.0.0`);
      
      // 更新元数据
      const result = await chrome.storage.local.get(['plugin_metadata']);
      const metadata = result.plugin_metadata || {};
      
      metadata.version = '1.0.0';
      metadata.lastUpdate = new Date().toISOString();
      
      await chrome.storage.local.set({ 'plugin_metadata': metadata });
      
      // 这里可以添加数据迁移逻辑
      await this.migrateData(previousVersion);
      
    } catch (error) {
      console.error('GitHub Notes: 插件更新处理失败', error);
    }
  }

  // 数据迁移
  async migrateData(fromVersion) {
    // 根据版本进行数据迁移
    // 目前是第一个版本，暂无迁移需求
    console.log(`GitHub Notes: 数据迁移完成 (从 ${fromVersion})`);
  }

  // 处理消息
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getNoteCount':
          const count = await this.getNoteCount();
          sendResponse({ success: true, count });
          break;

        case 'exportAllNotes':
          const exportData = await this.exportAllNotes();
          sendResponse({ success: true, data: exportData });
          break;

        case 'importNotes':
          const importResult = await this.importNotes(request.data);
          sendResponse(importResult);
          break;

        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, settings });
          break;

        case 'updateSettings':
          const updateResult = await this.updateSettings(request.settings);
          sendResponse(updateResult);
          break;

        case 'searchNotes':
          const searchResult = await this.searchNotes(request.query);
          sendResponse({ success: true, results: searchResult });
          break;

        default:
          sendResponse({ success: false, error: chrome.i18n.getMessage('unknownAction') });
      }
    } catch (error) {
      console.error('GitHub Notes: 处理消息失败', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取备注数量
  async getNoteCount() {
    try {
      const result = await chrome.storage.local.get(null);
      let count = 0;
      
      for (const key in result) {
        // 排除设置和元数据
        if (!key.startsWith('plugin_') && result[key].content !== undefined) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      console.error('GitHub Notes: 获取备注数量失败', error);
      return 0;
    }
  }

  // 导出所有备注
  async exportAllNotes() {
    try {
      const result = await chrome.storage.local.get(null);
      const notes = {};
      const settings = result.plugin_settings || {};
      const metadata = result.plugin_metadata || {};
      
      // 提取备注数据
      for (const key in result) {
        if (!key.startsWith('plugin_') && result[key].content !== undefined) {
          notes[key] = result[key];
        }
      }
      
      // 过滤有效的设置项，移除废弃的设置
      const validSettings = {
        enableNotifications: settings.enableNotifications
      };
      
      // 移除undefined值
      Object.keys(validSettings).forEach(key => {
        if (validSettings[key] === undefined) {
          delete validSettings[key];
        }
      });
      
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        notes,
        settings: validSettings,
        metadata: {
          totalNotes: Object.keys(notes).length,
          exportSource: 'GitHub Notes Extension'
        }
      };
      
      // 更新最后备份时间
      metadata.lastBackup = new Date().toISOString();
      await chrome.storage.local.set({ 'plugin_metadata': metadata });
      
      return exportData;
    } catch (error) {
      console.error('GitHub Notes: 导出备注失败', error);
      throw error;
    }
  }

  // 导入备注
  async importNotes(importData) {
    try {
      if (!importData || !importData.notes) {
        throw new Error(chrome.i18n.getMessage('invalidImportData'));
      }
      
      const { notes, settings } = importData;
      let importCount = 0;
      
      // 导入备注
      for (const repoKey in notes) {
        const noteData = notes[repoKey];
        if (noteData && noteData.content !== undefined) {
          await chrome.storage.local.set({ [repoKey]: noteData });
          importCount++;
        }
      }
      
      // 导入设置（可选）
      if (settings) {
        const currentSettings = await this.getSettings();
        
        // 只导入有效的设置项，过滤废弃的设置
        const validSettingsToImport = {};
        const validKeys = ['enableNotifications'];
        
        validKeys.forEach(key => {
          if (settings[key] !== undefined) {
            validSettingsToImport[key] = settings[key];
          }
        });
        
        const mergedSettings = { ...currentSettings, ...validSettingsToImport };
        await chrome.storage.local.set({ 'plugin_settings': mergedSettings });
      }
      
      // 更新元数据
      const metadata = await this.getMetadata();
      metadata.lastImport = new Date().toISOString();
      metadata.totalNotes = await this.getNoteCount();
      await chrome.storage.local.set({ 'plugin_metadata': metadata });
      
      return {
        success: true,
        message: chrome.i18n.getMessage('importSuccess', importCount.toString()),
        importCount
      };
    } catch (error) {
      console.error('GitHub Notes: 导入备注失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取设置
  async getSettings() {
    try {
      const result = await chrome.storage.local.get(['plugin_settings']);
      return result.plugin_settings || {};
    } catch (error) {
      console.error('GitHub Notes: 获取设置失败', error);
      return {};
    }
  }

  // 更新设置
  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const mergedSettings = { ...currentSettings, ...newSettings };
      
      await chrome.storage.local.set({ 'plugin_settings': mergedSettings });
      
      return {
        success: true,
        message: chrome.i18n.getMessage('settingsSaved'),
        settings: mergedSettings
      };
    } catch (error) {
      console.error('GitHub Notes: 更新设置失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取元数据
  async getMetadata() {
    try {
      const result = await chrome.storage.local.get(['plugin_metadata']);
      return result.plugin_metadata || {};
    } catch (error) {
      console.error('GitHub Notes: 获取元数据失败', error);
      return {};
    }
  }

  // 搜索备注
  async searchNotes(query) {
    try {
      const result = await chrome.storage.local.get(null);
      const searchResults = [];
      
      if (!query || query.trim() === '') {
        return searchResults;
      }
      
      const searchTerm = query.toLowerCase();
      
      for (const key in result) {
        if (!key.startsWith('plugin_') && result[key].content !== undefined) {
          const noteData = result[key];
          const content = noteData.content.toLowerCase();
          const repoName = key.toLowerCase();
          
          if (content.includes(searchTerm) || repoName.includes(searchTerm)) {
            searchResults.push({
              repoKey: key,
              content: noteData.content,
              createdAt: noteData.createdAt,
              updatedAt: noteData.updatedAt,
              // 高亮匹配的文本
              highlightedContent: this.highlightText(noteData.content, query)
            });
          }
        }
      }
      
      // 按更新时间排序
      searchResults.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return searchResults;
    } catch (error) {
      console.error('GitHub Notes: 搜索备注失败', error);
      return [];
    }
  }

  // 高亮文本
  highlightText(text, query) {
    if (!query || query.trim() === '') {
      return text;
    }
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // 处理存储变化
  handleStorageChanged(changes, namespace) {
    if (namespace === 'local') {
      // 可以在这里处理存储变化事件
      // 例如：同步数据、更新统计信息等
      console.log('GitHub Notes: 存储数据已变化', Object.keys(changes));
    }
  }

  // 处理标签页更新
  handleTabUpdated(tabId, changeInfo, tab) {
    // 检查是否是GitHub页面
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('github.com')) {
      // 可以在这里执行一些与GitHub页面相关的操作
      console.log('GitHub Notes: GitHub页面已加载', tab.url);
    }
  }
}

// 初始化后台脚本
const gitHubNotesBackground = new GitHubNotesBackground();

// 导出到全局作用域（用于调试）
self.gitHubNotesBackground = gitHubNotesBackground;
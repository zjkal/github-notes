// GitHub Repository Notes - Content Script
// 注入到GitHub页面，实现备注显示和编辑功能

class GitHubNotesManager {
  constructor() {
    this.currentRepo = null;
    this.noteContainer = null;
    this.isEditing = false;
    this.isInitialized = false;
    this.lastUrl = window.location.href;
    this.init();
  }

  // 初始化插件
  init() {
    // 等待页面完全稳定后再初始化
    this.waitForPageStable().then(() => {
      this.setupNotes();
      this.startUrlMonitoring();
    });
  }

  // 等待页面完全稳定
  async waitForPageStable() {
    // 等待基本DOM加载完成
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        } else {
          window.addEventListener('load', resolve, { once: true });
        }
      });
    }

    // 等待GitHub关键元素出现
    await this.waitForGitHubElements();
    
    // 额外等待确保页面完全稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 等待GitHub关键元素加载完成
  async waitForGitHubElements() {
    const maxWaitTime = 10000; // 最多等待10秒
    const checkInterval = 200; // 每200ms检查一次
    let waitTime = 0;

    return new Promise(resolve => {
      const checkElements = () => {
        // 检查GitHub页面的关键元素是否存在
        const hasHeader = document.querySelector('header[role="banner"]') || 
                         document.querySelector('.Header') ||
                         document.querySelector('[data-testid="header"]');
        
        const hasMainContent = document.querySelector('main') ||
                              document.querySelector('#js-repo-pjax-container') ||
                              document.querySelector('.application-main');

        if (hasHeader && hasMainContent) {
          resolve();
          return;
        }

        waitTime += checkInterval;
        if (waitTime >= maxWaitTime) {
          console.warn('GitHub Notes: 等待页面元素超时，继续初始化');
          resolve();
          return;
        }

        setTimeout(checkElements, checkInterval);
      };

      checkElements();
    });
  }

  // 开始URL监听
  startUrlMonitoring() {
    let urlChangeTimeout = null;
    
    // 防抖处理URL变化
    const handleUrlChangeDebounced = () => {
      if (urlChangeTimeout) {
        clearTimeout(urlChangeTimeout);
      }
      urlChangeTimeout = setTimeout(() => {
        this.handleUrlChange();
        urlChangeTimeout = null;
      }, 2000); // 增加延迟，确保页面完全稳定
    };
    
    // 监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', handleUrlChangeDebounced);

    // 定期检查URL变化（GitHub的PJAX导航）
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        console.log(`GitHub Notes: URL变化检测 ${this.lastUrl} -> ${currentUrl}`);
        this.lastUrl = currentUrl;
        handleUrlChangeDebounced();
      }
    }, 1500); // 减少检查频率
  }

  // 处理URL变化
  async handleUrlChange() {
    console.log('GitHub Notes: 处理URL变化，等待页面稳定...');
    
    // 等待页面稳定
    await this.waitForPageStable();
    
    // 重新设置备注
    this.setupNotes();
  }

  // 设置备注功能
  setupNotes() {
    try {
      // 检查是否在仓库页面
      if (!this.isRepositoryPage()) {
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      }

      // 获取当前仓库信息
      const newRepo = this.getCurrentRepository();
      if (!newRepo) {
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      }

      // 如果仓库没有变化且容器已存在，则不重复创建
      if (this.currentRepo === newRepo && 
          this.noteContainer && 
          document.body.contains(this.noteContainer)) {
        return;
      }

      // 更新当前仓库
      this.currentRepo = newRepo;

      // 移除已存在的备注容器
      this.removeExistingNoteContainer();

      // 创建新的备注容器
      this.createNoteContainer();
      this.loadAndDisplayNote();
      
      console.log(`GitHub Notes: 已为仓库 ${newRepo} 加载备注功能`);
    } catch (error) {
      console.error('GitHub Notes: 设置备注功能失败', error);
    }
  }

  // 检查是否在仓库页面
  isRepositoryPage() {
    const path = window.location.pathname;
    
    // 排除非仓库页面
    if (path === '/' || 
        path.startsWith('/settings') || 
        path.startsWith('/notifications') || 
        path.startsWith('/explore') || 
        path.startsWith('/marketplace') || 
        path.startsWith('/pricing') || 
        path.startsWith('/features') || 
        path.startsWith('/enterprise') || 
        path.startsWith('/login') || 
        path.startsWith('/join') ||
        path.startsWith('/search')) {
      return false;
    }
    
    // 匹配仓库页面格式: /username/repository[/...]
    const parts = path.split('/').filter(part => part);
    if (parts.length < 2) {
      return false;
    }
    
    // 检查是否有侧边栏（仓库页面的特征）
    const hasSidebar = document.querySelector('.Layout-sidebar');
    
    // 基本仓库页面格式检查
    const repoPattern = /^\/[^/]+\/[^/]+(?:\/.*)?$/;
    return repoPattern.test(path) && hasSidebar;
  }

  // 获取当前仓库信息
  getCurrentRepository() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(part => part);
    
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  // 移除已存在的备注容器
  removeExistingNoteContainer() {
    // 优先使用已有的引用
    if (this.noteContainer) {
      if (document.body.contains(this.noteContainer)) {
        this.noteContainer.remove();
      }
      this.noteContainer = null;
    }
    
    // 清理所有可能存在的备注容器（防止重复创建）
    const existingContainers = document.querySelectorAll('.github-notes-container');
    existingContainers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  }

  // 创建备注容器
  createNoteContainer() {
    try {
      // 严格检查是否已存在容器
      if (this.noteContainer && document.body.contains(this.noteContainer)) {
        console.log('GitHub Notes: 备注容器已存在，跳过创建');
        return;
      }
      
      // 再次检查DOM中是否已有容器
      const existingContainer = document.querySelector('.github-notes-container');
      if (existingContainer) {
        console.log('GitHub Notes: 发现已存在的容器，移除后重新创建');
        existingContainer.remove();
      }

      // 查找GitHub侧边栏
      const sidebar = document.querySelector('.Layout-sidebar');
      if (!sidebar) {
        console.log('GitHub Notes: 未找到侧边栏，跳过创建');
        return;
      }

      // 查找About板块
      const aboutSection = sidebar.querySelector('.BorderGrid.about-margin');
      if (!aboutSection) {
        console.log('GitHub Notes: 未找到About板块，跳过创建');
        return;
      }

      // 创建备注容器，作为BorderGrid-row插入到About板块内部
      this.noteContainer = document.createElement('div');
      this.noteContainer.className = 'BorderGrid-row github-notes-container';
      
      // 添加唯一标识，防止重复创建
      this.noteContainer.setAttribute('data-github-notes-id', Date.now().toString());
      
      this.noteContainer.innerHTML = `
        <div class="BorderGrid-cell">
          <div class="hide-sm hide-md">
            <div class="github-notes-header">
              <h2 class="mb-0 h4">${chrome.i18n.getMessage('myNotes')}</h2>
              <button class="github-notes-edit-btn btn-octicon" type="button" title="${chrome.i18n.getMessage('editNote')}">
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-pencil">
                  <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z"></path>
                </svg>
              </button>
            </div>
            <p class="f4 my-3 github-notes-content">${chrome.i18n.getMessage('clickToAddNote')}</p>
          </div>
        </div>
      `;

      // 插入到About板块内部的第一个位置
      const firstChild = aboutSection.firstElementChild;
      if (firstChild) {
        aboutSection.insertBefore(this.noteContainer, firstChild);
      } else {
        aboutSection.appendChild(this.noteContainer);
      }

      // 绑定编辑按钮事件
      const editBtn = this.noteContainer.querySelector('.github-notes-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openEditor();
        });
      }
    } catch (error) {
      console.error('GitHub Notes: 创建备注容器失败', error);
    }
  }

  // 加载并显示备注
  async loadAndDisplayNote() {
    if (!this.currentRepo || !this.noteContainer) {
      return;
    }

    try {
      const result = await chrome.storage.local.get([this.currentRepo]);
      const noteData = result[this.currentRepo];
      
      const contentDiv = this.noteContainer.querySelector('.github-notes-content');
      
      if (noteData && noteData.content) {
        contentDiv.innerHTML = `
          <div class="github-notes-text">${this.escapeHtml(noteData.content)}</div>
        `;
      } else {
        contentDiv.innerHTML = `<div class="github-notes-placeholder">${chrome.i18n.getMessage('clickToAddNote')}</div>`;
      }
    } catch (error) {
      console.error('GitHub Notes: 加载备注失败', error);
    }
  }

  // 打开编辑器
  openEditor() {
    if (this.isEditing) {
      return;
    }

    this.isEditing = true;
    this.createEditorModal();
  }

  // 创建编辑器模态框
  async createEditorModal() {
    // 移除已存在的模态框
    const existingModal = document.querySelector('.github-notes-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 获取当前备注内容
    let currentContent = '';
    try {
      const result = await chrome.storage.local.get([this.currentRepo]);
      const noteData = result[this.currentRepo];
      if (noteData && noteData.content) {
        currentContent = noteData.content;
      }
    } catch (error) {
      console.error('GitHub Notes: 获取备注内容失败', error);
    }

    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'github-notes-modal';
    modal.innerHTML = `
      <div class="github-notes-modal-content">
        <div class="github-notes-modal-header">
          <h3>${chrome.i18n.getMessage('editNoteTitle', this.currentRepo)}</h3>
          <button class="github-notes-close-btn">&times;</button>
        </div>
        <div class="github-notes-modal-body">
          <textarea class="github-notes-textarea" placeholder="${chrome.i18n.getMessage('notePlaceholder')}">${this.escapeHtml(currentContent)}</textarea>
        </div>
        <div class="github-notes-modal-footer">
          <div class="github-notes-footer-left">
            <button class="github-notes-delete-btn">${chrome.i18n.getMessage('delete')}</button>
          </div>
          <div class="github-notes-footer-right">
            <button class="github-notes-save-btn">${chrome.i18n.getMessage('save')}</button>
            <button class="github-notes-cancel-btn">${chrome.i18n.getMessage('cancel')}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    const textarea = modal.querySelector('.github-notes-textarea');
    const saveBtn = modal.querySelector('.github-notes-save-btn');
    const cancelBtn = modal.querySelector('.github-notes-cancel-btn');
    const deleteBtn = modal.querySelector('.github-notes-delete-btn');
    const closeBtn = modal.querySelector('.github-notes-close-btn');

    // 聚焦到文本框并确保可编辑
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 100);

    // 保存按钮
    saveBtn.addEventListener('click', () => this.saveNote(textarea.value, modal));

    // 取消按钮
    cancelBtn.addEventListener('click', () => this.closeEditor(modal));

    // 关闭按钮
    closeBtn.addEventListener('click', () => this.closeEditor(modal));

    // 删除按钮
    deleteBtn.addEventListener('click', () => this.deleteNote(modal));

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeEditor(modal);
      }
    });

    // ESC键关闭
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeEditor(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Ctrl+S保存
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveNote(textarea.value, modal);
      }
    });
  }

  // 保存备注
  async saveNote(content, modal) {
    if (!this.currentRepo) {
      return;
    }

    const noteData = {
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      // 检查是否已存在备注，如果存在则保留创建时间
      const result = await chrome.storage.local.get([this.currentRepo]);
      const existingNote = result[this.currentRepo];
      if (existingNote && existingNote.createdAt) {
        noteData.createdAt = existingNote.createdAt;
      }

      await chrome.storage.local.set({ [this.currentRepo]: noteData });
      
      // 更新显示
      this.loadAndDisplayNote();
      
      // 关闭编辑器
      this.closeEditor(modal);
      
      // 显示成功提示
      this.showNotification(chrome.i18n.getMessage('noteSaved'), 'success');
    } catch (error) {
      console.error('GitHub Notes: 保存备注失败', error);
      this.showNotification(chrome.i18n.getMessage('saveFailed'), 'error');
    }
  }

  // 删除备注
  async deleteNote(modal) {
    if (!this.currentRepo) {
      return;
    }

    if (!confirm(chrome.i18n.getMessage('confirmDeleteNote'))) {
      return;
    }

    try {
      await chrome.storage.local.remove([this.currentRepo]);
      
      // 更新显示
      this.loadAndDisplayNote();
      
      // 关闭编辑器
      this.closeEditor(modal);
      
      // 显示成功提示
      this.showNotification(chrome.i18n.getMessage('noteDeleted'), 'success');
    } catch (error) {
      console.error('GitHub Notes: 删除备注失败', error);
      this.showNotification(chrome.i18n.getMessage('deleteFailed'), 'error');
    }
  }

  // 关闭编辑器
  closeEditor(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    this.isEditing = false;
  }

  // 显示通知
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `github-notes-notification github-notes-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.add('github-notes-notification-show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('github-notes-notification-show');
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

// 初始化插件
const gitHubNotes = new GitHubNotesManager();

// 导出到全局作用域（用于调试）
window.gitHubNotes = gitHubNotes;
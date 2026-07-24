// GitHub Repository Notes - Content Script
// 注入到GitHub页面，实现备注显示和编辑功能

// 生产环境禁用调试信息输出
if ('update_url' in chrome.runtime.getManifest()) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

class GitHubNotesManager {
  constructor() {
    this.currentRepo = null;
    this.noteContainer = null;
    this.isEditing = false;
    this.isInitialized = false;
    this.lastUrl = window.location.href;
    this.retryCount = 0;
    this.maxRetryCount = 12;
    this.retryTimer = null;
    this.modalEscapeHandler = null;
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
      if (this.isStarsPage()) {
        this.setupStarsNotes();
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      } else {
        if (this.starsObserver) {
          this.starsObserver.disconnect();
          this.starsObserver = null;
        }
      }

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
        path.startsWith('/search') ||
        path.startsWith('/stars')) {
      return false;
    }
    
    // 匹配仓库页面格式: /username/repository[/...]
    const parts = path.split('/').filter(part => part);
    if (parts.length < 2) {
      return false;
    }
    
    // 基本仓库页面格式检查
    const repoPattern = /^\/[^/]+\/[^/]+(?:\/.*)?$/;
    return repoPattern.test(path);
  }

  // 检查是否在Stars页面
  isStarsPage() {
    const path = window.location.pathname;
    const search = window.location.search;
    const parts = path.split('/').filter(part => part);
    
    // 匹配常规Stars页面: /username?tab=stars
    const isNormalStarsPage = parts.length === 1 && search.includes('tab=stars');
    
    // 匹配自定义Stars列表页面: /stars/username/lists/listname
    const isCustomListsPage = parts.length >= 4 && parts[0] === 'stars' && parts[2] === 'lists';
    
    return isNormalStarsPage || isCustomListsPage;
  }

  // 设置Stars页面备注
  async setupStarsNotes() {
    try {
      console.log('GitHub Notes: 开始设置 Stars 页面备注...');
      await this.renderStarsNotes();
      
      // 监听DOM变化，以处理动态加载或PJAX更新
      const container = document.querySelector('#user-starred-repos') || document.querySelector('#user-list-repositories') || document.querySelector('main') || document.body;
      console.log('GitHub Notes: Stars 页面监听容器:', container);
      if (container && !this.starsObserver) {
        // 使用防抖避免频繁触发
        let timeout = null;
        this.starsObserver = new MutationObserver(() => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            console.log('GitHub Notes: 检测到 DOM 变化，重新渲染 Stars 备注');
            this.renderStarsNotes();
          }, 500);
        });
        this.starsObserver.observe(container, { childList: true, subtree: true });
      }
    } catch (error) {
      console.error('GitHub Notes: 设置 Stars 页面备注失败', error);
    }
  }

  // 渲染Stars页面备注
  async renderStarsNotes() {
    try {
      console.log('GitHub Notes: 开始执行 renderStarsNotes');
      // 查找所有仓库列表项 (使用精确选择器匹配Star列表和自定义列表)
      let repoLinks = document.querySelectorAll('#user-starred-repos .col-12.d-block.width-full h3 > a, #user-list-repositories .col-12.d-block.width-full h2 > a');
      if (!repoLinks || repoLinks.length === 0) {
        console.log('GitHub Notes: 精确选择器未找到链接，尝试降级选择器');
        // 降级兼容其他可能的结构
        repoLinks = document.querySelectorAll('.col-12.d-block.width-full h3 > a[href^="/"], .col-12.d-block.width-full h2 > a[href^="/"]');
      }
      console.log(`GitHub Notes: 找到 ${repoLinks.length} 个仓库链接`);
      
      const reposToFetch = [];
      const linkMap = new Map();

      repoLinks.forEach(link => {
        const href = link.getAttribute('href');
        const parts = href.split('/').filter(part => part);
        if (parts.length === 2) {
          const repoFullName = `${parts[0]}/${parts[1]}`;
          if (!reposToFetch.includes(repoFullName)) {
            reposToFetch.push(repoFullName);
          }
          
          if (!linkMap.has(repoFullName)) {
            linkMap.set(repoFullName, []);
          }
          linkMap.get(repoFullName).push(link);
        }
      });

      console.log(`GitHub Notes: 准备查询备注的仓库数量: ${reposToFetch.length}`, reposToFetch);

      if (reposToFetch.length === 0) return;

      const results = await chrome.storage.local.get(reposToFetch);
      console.log('GitHub Notes: 存储查询结果:', results);

      for (const [repo, noteData] of Object.entries(results)) {
        if (noteData && noteData.content) {
          console.log(`GitHub Notes: 准备渲染仓库 ${repo} 的备注`);
          const links = linkMap.get(repo) || [];
          links.forEach(link => {
            // 找到包含这个链接的列表项容器 (适配GitHub新版类名 tmp-py-4 等)
            const listItem = link.closest('.col-12.d-block.width-full') || link.closest('div[class*="border-bottom"]') || link.closest('div.col-12') || link.closest('div.py-4') || link.closest('div.tmp-py-4');
            
            if (listItem) {
              if (listItem.querySelector('.github-notes-star-badge')) {
                console.log(`GitHub Notes: 仓库 ${repo} 备注已存在，跳过`);
                return;
              }

              console.log(`GitHub Notes: 找到仓库 ${repo} 的容器，准备插入`);
              const noteDiv = document.createElement('div');
              // 添加 data-repo 属性用于后续可能的删除/更新
              noteDiv.className = 'github-notes-star-badge mt-2';
              noteDiv.setAttribute('data-repo', repo);
              
              const noteContentDiv = document.createElement('div');
              noteContentDiv.className = 'github-notes-content';
              // 模拟与详情页一致的内部结构，只保留点击编辑等效果
              noteContentDiv.innerHTML = `
                <div class="github-notes-header" style="margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                  <h4 class="mb-0" style="font-size: 12px; color: var(--fgColor-muted, #656d76); display: flex; align-items: center; font-weight: 600;">
                    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" data-view-component="true" class="octicon octicon-pencil mr-1">
                      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z"></path>
                    </svg>
                    ${chrome.i18n.getMessage('myNotes') || '我的备注'}
                  </h4>
                </div>
                <div class="github-notes-text">${this.escapeHtml(noteData.content)}</div>
                ${noteData.updatedAt ? `
                <div class="github-notes-meta">
                  <span>${chrome.i18n.getMessage('lastUpdated', this.formatDate(noteData.updatedAt)) || '最后更新: ' + this.formatDate(noteData.updatedAt)}</span>
                  <span>${chrome.i18n.getMessage('clickToEditHint') || '点击编辑'}</span>
                </div>` : ''}
              `;
              
              // 点击任意区域即可编辑
              noteContentDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openEditor(repo);
              });
              
              noteDiv.appendChild(noteContentDiv);
              
              const descDiv = listItem.querySelector('[itemprop="description"]') || listItem.querySelector('p');
              if (descDiv) {
                // 如果找到描述段落，为了保持排版，将其插入到描述的父级 div（如 .py-1 或类似容器）的后面
                const wrapperDiv = descDiv.closest('div[class*="py-"]') || descDiv.closest('div[class*="mt-"]') || descDiv.closest('div') || descDiv;
                wrapperDiv.parentNode.insertBefore(noteDiv, wrapperDiv.nextSibling);
                console.log(`GitHub Notes: 仓库 ${repo} 备注插入成功 (跟随描述)`);
              } else {
                // 兼容没有描述的情况，插入到h3/h2外层div后面
                const hContainer = link.closest('.d-inline-block.mb-1') || link.closest('h3') || link.closest('h2');
                if (hContainer) {
                  hContainer.parentNode.insertBefore(noteDiv, hContainer.nextSibling);
                  console.log(`GitHub Notes: 仓库 ${repo} 备注插入成功 (跟随标题)`);
                } else {
                  console.log(`GitHub Notes: 仓库 ${repo} 找不到合适的插入位置`);
                }
              }
            } else {
              console.log(`GitHub Notes: 找不到仓库 ${repo} 的外层容器 (listItem 为 null)`);
            }
          });
        }
      }
    } catch (error) {
      console.error('GitHub Notes: 渲染 Stars 页面备注失败', error);
    }
  }

  // 获取当前仓库信息
  getCurrentRepository() {
    const path = window.location.pathname;
    
    // 如果是 stars 等非仓库页面，不要获取仓库名
    if (path.startsWith('/stars/')) {
      return null;
    }
    
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

      // 查找GitHub侧边栏（兼容 Edge rails-partial 布局）
      const sidebar =
        document.querySelector('.Layout-sidebar') ||
        document.querySelector('rails-partial[data-partial-name="codeViewRepoRoute.Sidebar"]') ||
        document.querySelector('aside[aria-label="Repository sidebar"]');
      if (!sidebar) {
        console.log('GitHub Notes: 未找到侧边栏容器，稍后重试');
        this.scheduleCreateRetry();
        return;
      }

      // 查找About板块
      let aboutSection =
        sidebar.querySelector('.BorderGrid.about-margin') ||
        sidebar.querySelector('.BorderGrid');
      if (!aboutSection) {
        console.log('GitHub Notes: 未找到About板块，稍后重试');
        this.scheduleCreateRetry();
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
            <div class="f4 my-3 github-notes-content"></div>
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

      this.retryCount = 0;

      // 绑定编辑按钮事件
      const editBtn = this.noteContainer.querySelector('.github-notes-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openEditor();
        });
      }

      const contentArea = this.noteContainer.querySelector('.github-notes-content');
      if (contentArea) {
        contentArea.addEventListener('click', () => this.openEditor());
        contentArea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openEditor();
          }
        });
      }
    } catch (error) {
      console.error('GitHub Notes: 创建备注容器失败', error);
    }
  }

  scheduleCreateRetry() {
    if (this.retryTimer || this.retryCount >= this.maxRetryCount) {
      return;
    }
    this.retryCount += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.createNoteContainer();
      this.loadAndDisplayNote();
    }, 1000);
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
      contentDiv.tabIndex = 0;
      contentDiv.setAttribute('role', 'button');
      contentDiv.setAttribute('aria-label', chrome.i18n.getMessage('editNote'));
      
      if (noteData && noteData.content) {
        contentDiv.innerHTML = `
          <div class="github-notes-text">${this.escapeHtml(noteData.content)}</div>
          <div class="github-notes-meta">
            <span>${chrome.i18n.getMessage('lastUpdated', this.formatDate(noteData.updatedAt))}</span>
            <span>${chrome.i18n.getMessage('clickToEditHint')}</span>
          </div>
        `;
      } else {
        contentDiv.innerHTML = `
          <div class="github-notes-placeholder">${chrome.i18n.getMessage('clickToAddNote') || '暂无备注'}</div>
        `;
      }
    } catch (error) {
      console.error('GitHub Notes: 加载备注失败', error);
    }
  }

  // 打开编辑器
  openEditor(repoName = this.currentRepo) {
    if (this.isEditing) {
      return;
    }

    if (!repoName) {
      return;
    }

    this.isEditing = true;
    this.createEditorModal(repoName);
  }

  // 创建编辑器模态框
  async createEditorModal(repoName) {
    // 移除已存在的模态框
    const existingModal = document.querySelector('.github-notes-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 获取当前备注内容
    let currentContent = '';
    try {
      const result = await chrome.storage.local.get([repoName]);
      const noteData = result[repoName];
      if (noteData && noteData.content) {
        currentContent = noteData.content;
      }
    } catch (error) {
      console.error('GitHub Notes: 获取备注内容失败', error);
    }

    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'github-notes-modal';
    
    // 处理 i18n，如果没有匹配的 key 则使用默认值
    let title = chrome.i18n.getMessage('editNoteTitle', repoName);
    if (!title) {
      // 降级处理：有些情况下 getMessage 可能会返回空字符串，这里提供一个默认的中文回退
      title = `编辑 ${repoName} 的备注`;
    }

    modal.innerHTML = `
      <div class="github-notes-modal-content">
        <div class="github-notes-modal-header">
          <h3>${title}</h3>
          <button class="github-notes-close-btn">&times;</button>
        </div>
        <div class="github-notes-modal-body">
          <textarea class="github-notes-textarea" placeholder="${chrome.i18n.getMessage('notePlaceholder') || '请输入备注内容...'}">${this.escapeHtml(currentContent)}</textarea>
          <div class="github-notes-editor-meta">
            <span class="github-notes-shortcut-hint">${chrome.i18n.getMessage('editorShortcutHint') || '支持 Markdown 格式 • Ctrl/Cmd + S 或 Ctrl/Cmd + Enter 保存 • Esc 取消'}</span>
            <span class="github-notes-character-count" id="github-notes-character-count"></span>
          </div>
        </div>
        <div class="github-notes-modal-footer">
          <div class="github-notes-footer-left">
            ${currentContent.trim() ? `<button class="github-notes-delete-btn">${chrome.i18n.getMessage('delete') || '删除'}</button>` : ''}
          </div>
          <div class="github-notes-footer-right">
            <button class="github-notes-save-btn">${chrome.i18n.getMessage('save') || '保存'}</button>
            <button class="github-notes-cancel-btn">${chrome.i18n.getMessage('cancel') || '取消'}</button>
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
    const characterCount = modal.querySelector('#github-notes-character-count');
    const updateCharacterCount = () => {
      if (characterCount) {
        characterCount.textContent = chrome.i18n.getMessage('characterCount', textarea.value.length.toString()) || `共 ${textarea.value.length} 字`;
      }
    };

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 100);
    updateCharacterCount();
    textarea.addEventListener('input', updateCharacterCount);

    saveBtn.addEventListener('click', () => this.saveNote(textarea.value, modal, repoName));
    cancelBtn.addEventListener('click', () => this.closeEditor(modal));
    closeBtn.addEventListener('click', () => this.closeEditor(modal));
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteNote(modal, repoName));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeEditor(modal);
      }
    });

    this.modalEscapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeEditor(modal);
      }
    };
    document.addEventListener('keydown', this.modalEscapeHandler);

    textarea.addEventListener('keydown', (e) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter');
      if (isSaveShortcut) {
        e.preventDefault();
        this.saveNote(textarea.value, modal, repoName);
      }
    });
  }

  // 保存备注
  async saveNote(content, modal, repoName = this.currentRepo) {
    if (!repoName) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      this.showNotification(chrome.i18n.getMessage('emptyNoteWarning') || '备注内容不能为空', 'info');
      return;
    }

    const noteData = {
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      // 检查是否已存在备注，如果存在则保留创建时间
      const result = await chrome.storage.local.get([repoName]);
      const existingNote = result[repoName];
      if (existingNote && existingNote.createdAt) {
        noteData.createdAt = existingNote.createdAt;
      }

      await chrome.storage.local.set({ [repoName]: noteData });
      
      if (this.isStarsPage()) {
        // 在Stars页面，移除已有的该仓库备注DOM，然后重新渲染
        const existingBadges = document.querySelectorAll(`.github-notes-star-badge[data-repo="${repoName}"]`);
        existingBadges.forEach(badge => badge.remove());
        this.renderStarsNotes();
      } else if (this.currentRepo === repoName) {
        this.loadAndDisplayNote();
      }
      
      this.closeEditor(modal);
      this.showNotification(chrome.i18n.getMessage('noteSaved') || '备注已保存', 'success');
    } catch (error) {
      console.error('GitHub Notes: 保存备注失败', error);
      this.showNotification(chrome.i18n.getMessage('saveFailed') || '保存失败，请重试', 'error');
    }
  }

  // 删除备注
  async deleteNote(modal, repoName = this.currentRepo) {
    if (!repoName) {
      return;
    }

    if (!confirm(chrome.i18n.getMessage('confirmDeleteNote') || '确定要删除这条备注吗？')) {
      return;
    }

    try {
      await chrome.storage.local.remove([repoName]);
      
      if (this.isStarsPage()) {
        // 在Stars页面，移除该仓库的备注DOM
        const existingBadges = document.querySelectorAll(`.github-notes-star-badge[data-repo="${repoName}"]`);
        existingBadges.forEach(badge => badge.remove());
      } else if (this.currentRepo === repoName) {
        this.loadAndDisplayNote();
      }
      
      this.closeEditor(modal);
      this.showNotification(chrome.i18n.getMessage('noteDeleted') || '备注已删除', 'success');
    } catch (error) {
      console.error('GitHub Notes: 删除备注失败', error);
      this.showNotification(chrome.i18n.getMessage('deleteFailed') || '删除失败，请重试', 'error');
    }
  }

  // 关闭编辑器
  closeEditor(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    if (this.modalEscapeHandler) {
      document.removeEventListener('keydown', this.modalEscapeHandler);
      this.modalEscapeHandler = null;
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

// 初始化插件
const gitHubNotes = new GitHubNotesManager();

// 导出到全局作用域（用于调试）
window.gitHubNotes = gitHubNotes;

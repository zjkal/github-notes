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
    this.repoSidebarObserver = null;
    this.repoSidebarObserverTarget = null;
    this.repoObserverDebounce = null;
    this.starsObserver = null;
    this.starsObserverDebounce = null;
    this.starsTurboFrameHandler = null;
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

    await this.waitForGitHubElements();
  }

  // 等待 GitHub 关键元素加载完成（新版 GlobalNav 等布局）
  async waitForGitHubElements() {
    const maxWaitTime = 5000;
    const checkInterval = 100;
    let waitTime = 0;

    return new Promise(resolve => {
      const checkElements = () => {
        const hasHeader =
          document.querySelector('header[role="banner"]') ||
          document.querySelector('header.GlobalNav') ||
          document.querySelector('header[class*="GlobalNav"]') ||
          document.querySelector('header[class*="appHeader"]') ||
          document.querySelector('.Header') ||
          document.querySelector('[data-testid="header"]') ||
          document.querySelector('header');

        const hasMainContent =
          document.querySelector('main') ||
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
        this.disconnectRepoSidebarObserver();
        this.setupStarsNotes();
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      } else {
        this.disconnectStarsObserver();
      }

      // 检查是否在仓库页面
      if (!this.isRepositoryPage()) {
        this.disconnectRepoSidebarObserver();
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      }

      // 获取当前仓库信息
      const newRepo = this.getCurrentRepository();
      if (!newRepo) {
        this.disconnectRepoSidebarObserver();
        this.removeExistingNoteContainer();
        this.currentRepo = null;
        return;
      }

      // 仓库未变且挂载正确时跳过重建
      if (this.currentRepo === newRepo && this.isNoteContainerProperlyMounted()) {
        const mount = this.findSidebarMount();
        if (mount) {
          this.setupRepoSidebarObserver(mount);
        }
        return;
      }

      // 更新当前仓库
      this.currentRepo = newRepo;

      // 移除已存在的备注容器
      this.removeExistingNoteContainer();

      // 创建新的备注容器
      this.createNoteContainer();
      this.loadAndDisplayNote();

      const mount = this.findSidebarMount();
      if (mount) {
        this.setupRepoSidebarObserver(mount);
      }
      
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

    // 匹配 Stars Hub: /stars/:username
    const isStarsHubPage =
      parts.length === 2 && parts[0] === 'stars' && parts[1] !== 'lists';

    // 登录用户 Stars 入口: /stars
    const isStarsRoot = path === '/stars' || path === '/stars/';

    // 匹配自定义Stars列表页面: /stars/username/lists/listname
    const isCustomListsPage = parts.length >= 4 && parts[0] === 'stars' && parts[2] === 'lists';

    return isNormalStarsPage || isStarsHubPage || isStarsRoot || isCustomListsPage;
  }

  parseStarsRepoFromHref(href) {
    if (!href || !href.startsWith('/')) {
      return null;
    }

    const parts = href.split('?')[0].split('#')[0].split('/').filter(part => part);
    if (parts.length !== 2) {
      return null;
    }

    const [owner] = parts;
    if (owner === 'stars' || owner === 'settings' || owner === 'orgs' || owner === 'marketplace') {
      return null;
    }

    return `${parts[0]}/${parts[1]}`;
  }

  findStarsListRoot() {
    return (
      document.querySelector('#user-starred-repos') ||
      document.querySelector('#user-list-repositories') ||
      document.querySelector('main') ||
      document.body
    );
  }

  findStarsObserveTarget() {
    return this.findStarsListRoot();
  }

  collectStarsRepoLinks(root) {
    const scope = root || this.findStarsListRoot();
    const selectors = [
      '#user-starred-repos .col-12.d-block.width-full h3 > a',
      '#user-list-repositories .col-12.d-block.width-full h2 > a',
      '.col-12.d-block.width-full h3 > a[href^="/"]',
      '.col-12.d-block.width-full h2 > a[href^="/"]',
      'h3 > a[href^="/"]',
      'h2 > a[href^="/"]'
    ];

    const reposToFetch = [];
    const linkMap = new Map();
    const seenLinks = new Set();

    selectors.forEach((selector) => {
      scope.querySelectorAll(selector).forEach((link) => {
        if (seenLinks.has(link)) {
          return;
        }

        const repoFullName = this.parseStarsRepoFromHref(link.getAttribute('href'));
        if (!repoFullName) {
          return;
        }

        seenLinks.add(link);
        if (!reposToFetch.includes(repoFullName)) {
          reposToFetch.push(repoFullName);
        }

        if (!linkMap.has(repoFullName)) {
          linkMap.set(repoFullName, []);
        }
        linkMap.get(repoFullName).push(link);
      });
    });

    return { reposToFetch, linkMap };
  }

  findStarsListItem(link) {
    return (
      link.closest('.col-12.d-block.width-full') ||
      link.closest('li[class*="border-bottom"]') ||
      link.closest('li.tmp-py-4') ||
      link.closest('div[class*="border-bottom"]') ||
      link.closest('div.col-12') ||
      link.closest('div.py-4') ||
      link.closest('div.tmp-py-4') ||
      link.closest('li')
    );
  }

  findStarsInsertAnchor(listItem, link) {
    const descDiv = listItem.querySelector('[itemprop="description"]') || listItem.querySelector('p');
    if (descDiv) {
      const wrapperDiv =
        descDiv.closest('div[class*="py-"]') ||
        descDiv.closest('div[class*="mt-"]') ||
        descDiv.closest('div') ||
        descDiv;
      if (wrapperDiv.parentNode) {
        return { parent: wrapperDiv.parentNode, before: wrapperDiv.nextSibling };
      }
    }

    const hContainer = link.closest('.d-inline-block.mb-1') || link.closest('h3') || link.closest('h2');
    if (hContainer && hContainer.parentNode) {
      return { parent: hContainer.parentNode, before: hContainer.nextSibling };
    }

    return { parent: listItem, append: true };
  }

  mountStarsNoteBadge(listItem, link, repo, noteData) {
    if (listItem.querySelector('.github-notes-star-badge')) {
      return;
    }

    const noteDiv = document.createElement('div');
    noteDiv.className = 'github-notes-star-badge mt-2';
    noteDiv.setAttribute('data-repo', repo);

    const noteContentDiv = document.createElement('div');
    noteContentDiv.className = 'github-notes-content';

    const myNotesLabel = chrome.i18n.getMessage('myNotes') || '我的备注';
    const headerHtml = `
      <div class="github-notes-header" style="margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
        <h4 class="mb-0" style="font-size: 12px; color: var(--fgColor-muted, #656d76); display: flex; align-items: center; font-weight: 600;">
          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" data-view-component="true" class="octicon octicon-pencil mr-1">
            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z"></path>
          </svg>
          ${myNotesLabel}
        </h4>
      </div>
    `;

    const hasContent = noteData && noteData.content;
    if (hasContent) {
      noteContentDiv.innerHTML = `${headerHtml}
        <div class="github-notes-text">${this.escapeHtml(noteData.content)}</div>
        ${noteData.updatedAt ? `
        <div class="github-notes-meta">
          <span>${chrome.i18n.getMessage('lastUpdated', this.formatDate(noteData.updatedAt)) || '最后更新: ' + this.formatDate(noteData.updatedAt)}</span>
          <span class="github-notes-edit-hint">${chrome.i18n.getMessage('clickToEditHint') || '点击编辑'}</span>
        </div>` : ''}`;
    } else {
      noteContentDiv.innerHTML = `${headerHtml}
        <div class="github-notes-placeholder" style="font-size: 12px; padding: 6px 8px;">${chrome.i18n.getMessage('clickToAddNote') || '点击添加备注'}</div>`;
    }

    noteContentDiv.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openEditor(repo);
    });

    noteDiv.appendChild(noteContentDiv);

    const anchor = this.findStarsInsertAnchor(listItem, link);
    if (anchor.append) {
      anchor.parent.appendChild(noteDiv);
    } else {
      anchor.parent.insertBefore(noteDiv, anchor.before);
    }
  }

  disconnectStarsObserver() {
    if (this.starsObserver) {
      this.starsObserver.disconnect();
      this.starsObserver = null;
    }

    if (this.starsObserverDebounce) {
      clearTimeout(this.starsObserverDebounce);
      this.starsObserverDebounce = null;
    }

    if (this.starsTurboFrameHandler) {
      document.removeEventListener('turbo:frame-load', this.starsTurboFrameHandler);
      this.starsTurboFrameHandler = null;
    }
  }

  scheduleStarsNotesRender() {
    if (this.starsObserverDebounce) {
      clearTimeout(this.starsObserverDebounce);
    }

    this.starsObserverDebounce = setTimeout(() => {
      this.starsObserverDebounce = null;
      this.renderStarsNotes();
    }, 450);
  }

  async waitForStarsListContent() {
    const maxWaitTime = 5000;
    const checkInterval = 100;
    let waitTime = 0;

    return new Promise((resolve) => {
      const check = () => {
        const root = this.findStarsListRoot();
        const { reposToFetch } = this.collectStarsRepoLinks(root);
        if (reposToFetch.length > 0 || waitTime >= maxWaitTime) {
          resolve();
          return;
        }

        waitTime += checkInterval;
        setTimeout(check, checkInterval);
      };

      check();
    });
  }

  // 设置Stars页面备注
  async setupStarsNotes() {
    try {
      console.log('GitHub Notes: 开始设置 Stars 页面备注...');
      this.disconnectStarsObserver();
      await this.waitForStarsListContent();
      await this.renderStarsNotes();

      const container = this.findStarsObserveTarget();
      console.log('GitHub Notes: Stars 页面监听容器:', container);
      if (container) {
        this.starsObserver = new MutationObserver(() => {
          this.scheduleStarsNotesRender();
        });
        this.starsObserver.observe(container, { childList: true, subtree: true });
      }

      this.starsTurboFrameHandler = (event) => {
        const target = event.target;
        if (!target || (target.id !== 'user-starred-repos' && target.id !== 'user-list-repositories')) {
          return;
        }
        this.scheduleStarsNotesRender();
      };
      document.addEventListener('turbo:frame-load', this.starsTurboFrameHandler);
    } catch (error) {
      console.error('GitHub Notes: 设置 Stars 页面备注失败', error);
    }
  }

  // 渲染Stars页面备注
  async renderStarsNotes() {
    try {
      console.log('GitHub Notes: 开始执行 renderStarsNotes');
      const root = this.findStarsListRoot();
      const { reposToFetch, linkMap } = this.collectStarsRepoLinks(root);
      console.log(`GitHub Notes: 找到 ${reposToFetch.length} 个仓库链接`);

      if (reposToFetch.length === 0) {
        return;
      }

      const results = await chrome.storage.local.get(reposToFetch);
      console.log('GitHub Notes: 存储查询结果:', results);

      for (const repo of reposToFetch) {
        const noteData = results[repo];
        const links = linkMap.get(repo) || [];

        links.forEach((link) => {
          const listItem = this.findStarsListItem(link);
          if (!listItem) {
            console.log(`GitHub Notes: 找不到仓库 ${repo} 的外层容器 (listItem 为 null)`);
            return;
          }

          this.mountStarsNoteBadge(listItem, link, repo, noteData);
        });
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

  // CSS Modules 类名查询（兼容 module__token 与 module_HASH_token）
  queryByModuleClass(root, modulePrefix, token) {
    const scope = root || document;
    return scope.querySelector(`[class*="${modulePrefix}"][class*="${token}"]`);
  }

  // 新版仓库页：含 borderGrid 的 SplitPageLayout.Pane
  findSplitSidebarPane() {
    const panes = document.querySelectorAll('[data-component="SplitPageLayout.Pane"]');
    for (const pane of panes) {
      const borderGrid = this.queryByModuleClass(pane, 'CodeViewSidebar', 'borderGrid');
      if (borderGrid) {
        return { pane, borderGrid };
      }
    }

    const fallbackPane = document.querySelector('[class*="prc-PageLayout-Pane-"]');
    if (fallbackPane) {
      const borderGrid =
        this.queryByModuleClass(fallbackPane, 'CodeViewSidebar', 'borderGrid') ||
        fallbackPane.firstElementChild;
      if (borderGrid) {
        return { pane: fallbackPane, borderGrid };
      }
    }

    return null;
  }

  // 通过 About/关于 标题定位侧边栏区块
  findAboutSectionInRoot(root) {
    if (!root) {
      return null;
    }

    const headings = root.querySelectorAll('h2');
    for (const heading of headings) {
      if (!/^(About|关于)$/i.test(heading.textContent.trim())) {
        continue;
      }
      // 避免 closest('[class*="SidebarSection"]') 命中 sectionHeading 自身
      return heading.closest('[class*="sidebarSection"]') || heading.parentElement;
    }

    return null;
  }

  // 将 About 区块解析为 mountParent 的直接子节点，便于 insertBefore
  resolveMountInsertBefore(mountParent, aboutSection) {
    if (!aboutSection || !mountParent) {
      return null;
    }

    let node = aboutSection;
    while (node && node.parentElement !== mountParent) {
      node = node.parentElement;
    }

    return node && node.parentElement === mountParent ? node : null;
  }

  isNoteContainerProperlyMounted() {
    if (!this.noteContainer || !document.body.contains(this.noteContainer)) {
      return false;
    }

    const mount = this.findSidebarMount();
    if (!mount || !mount.mountParent) {
      return false;
    }

    if (mount.layout === 'split') {
      return this.noteContainer.parentElement === mount.mountParent;
    }

    return mount.mountParent.contains(this.noteContainer);
  }

  disconnectRepoSidebarObserver() {
    if (this.repoSidebarObserver) {
      this.repoSidebarObserver.disconnect();
      this.repoSidebarObserver = null;
    }
    this.repoSidebarObserverTarget = null;
    if (this.repoObserverDebounce) {
      clearTimeout(this.repoObserverDebounce);
      this.repoObserverDebounce = null;
    }
  }

  setupRepoSidebarObserver(mount) {
    if (!mount || !mount.observeTarget) {
      return;
    }

    if (this.repoSidebarObserverTarget === mount.observeTarget && this.repoSidebarObserver) {
      return;
    }

    this.disconnectRepoSidebarObserver();
    this.repoSidebarObserverTarget = mount.observeTarget;

    this.repoSidebarObserver = new MutationObserver(() => {
      if (!this.isRepositoryPage() || this.isStarsPage()) {
        return;
      }

      if (!this.getCurrentRepository()) {
        return;
      }

      const containerLost =
        !this.noteContainer || !document.body.contains(this.noteContainer);
      const wrongMount =
        this.noteContainer &&
        document.body.contains(this.noteContainer) &&
        !this.isNoteContainerProperlyMounted();

      if (!containerLost && !wrongMount) {
        return;
      }

      if (this.repoObserverDebounce) {
        clearTimeout(this.repoObserverDebounce);
      }

      this.repoObserverDebounce = setTimeout(() => {
        this.repoObserverDebounce = null;
        this.rebuildRepoNoteUi();
      }, 400);
    });

    this.repoSidebarObserver.observe(mount.observeTarget, {
      childList: true,
      subtree: true
    });
  }

  rebuildRepoNoteUi() {
    if (!this.isRepositoryPage() || this.isStarsPage()) {
      return;
    }

    const repo = this.getCurrentRepository();
    if (!repo) {
      return;
    }

    this.currentRepo = repo;

    if (this.isNoteContainerProperlyMounted()) {
      return;
    }

    if (this.noteContainer) {
      if (document.body.contains(this.noteContainer)) {
        this.noteContainer.remove();
      }
      this.noteContainer = null;
    }

    const orphan = document.querySelector('.github-notes-container');
    if (orphan) {
      orphan.remove();
    }

    this.createNoteContainer();
    this.loadAndDisplayNote();

    const mount = this.findSidebarMount();
    if (mount) {
      this.setupRepoSidebarObserver(mount);
    }
  }

  // 查找仓库页侧边栏挂载点（兼容旧 BorderGrid 与新 SplitPageLayout）
  findSidebarMount() {
    const split = this.findSplitSidebarPane();
    if (split) {
      const { pane, borderGrid } = split;
      const aboutSection = this.findAboutSectionInRoot(borderGrid);
      const insertBefore = this.resolveMountInsertBefore(borderGrid, aboutSection);

      return {
        layout: 'split',
        mountParent: borderGrid,
        insertBefore: insertBefore || null,
        observeTarget: borderGrid || pane
      };
    }

    // 旧版布局：Layout-sidebar / rails-partial / aside
    const sidebar =
      document.querySelector('.Layout-sidebar') ||
      document.querySelector('rails-partial[data-partial-name="codeViewRepoRoute.Sidebar"]') ||
      document.querySelector('aside[aria-label="Repository sidebar"]');

    if (!sidebar) {
      return null;
    }

    const aboutSection =
      sidebar.querySelector('.BorderGrid.about-margin') ||
      sidebar.querySelector('.BorderGrid');

    if (!aboutSection) {
      return null;
    }

    return {
      layout: 'border-grid',
      mountParent: aboutSection,
      insertBefore: aboutSection.firstElementChild,
      observeTarget: sidebar
    };
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

      const mount = this.findSidebarMount();
      if (!mount || !mount.mountParent) {
        console.log('GitHub Notes: 未找到侧边栏容器，稍后重试');
        this.scheduleCreateRetry();
        return;
      }

      const notesTitle = chrome.i18n.getMessage('myNotes');
      const editTitle = chrome.i18n.getMessage('editNote');
      const headerHtml = `
        <div class="github-notes-header">
          <h2 class="mb-0 h4">${notesTitle}</h2>
          <button class="github-notes-edit-btn btn-octicon" type="button" title="${editTitle}">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-pencil">
              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z"></path>
            </svg>
          </button>
        </div>
        <div class="f4 my-3 github-notes-content"></div>
      `;

      this.noteContainer = document.createElement('div');
      this.noteContainer.setAttribute('data-github-notes-id', Date.now().toString());

      if (mount.layout === 'split') {
        // 新版侧边栏：作为独立区块插入到 About 之前
        this.noteContainer.className = 'github-notes-container github-notes-container--split hide-sm hide-md';
        this.noteContainer.innerHTML = headerHtml;
      } else {
        // 旧版 BorderGrid：保持原有行结构
        this.noteContainer.className = 'BorderGrid-row github-notes-container';
        this.noteContainer.innerHTML = `
          <div class="BorderGrid-cell">
            <div class="hide-sm hide-md">
              ${headerHtml}
            </div>
          </div>
        `;
      }

      if (mount.insertBefore && mount.insertBefore.parentNode === mount.mountParent) {
        mount.mountParent.insertBefore(this.noteContainer, mount.insertBefore);
      } else if (mount.layout === 'split') {
        mount.mountParent.appendChild(this.noteContainer);
      } else {
        mount.mountParent.insertBefore(
          this.noteContainer,
          mount.mountParent.firstElementChild
        );
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
      const mount = this.findSidebarMount();
      if (mount) {
        this.setupRepoSidebarObserver(mount);
      }
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
            <span class="github-notes-edit-hint">${chrome.i18n.getMessage('clickToEditHint')}</span>
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
        const existingBadges = document.querySelectorAll(`.github-notes-star-badge[data-repo="${repoName}"]`);
        existingBadges.forEach(badge => badge.remove());
        this.renderStarsNotes();
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

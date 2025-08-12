// 国际化工具函数
class I18n {
  /**
   * 获取本地化文本
   * @param {string} key - 消息键
   * @param {string|string[]} substitutions - 替换参数
   * @returns {string} 本地化文本
   */
  static getMessage(key, substitutions = null) {
    try {
      return chrome.i18n.getMessage(key, substitutions) || key;
    } catch (error) {
      console.warn(`I18n: Failed to get message for key '${key}':`, error);
      return key;
    }
  }

  /**
   * 获取当前语言
   * @returns {string} 语言代码
   */
  static getUILanguage() {
    try {
      return chrome.i18n.getUILanguage();
    } catch (error) {
      console.warn('I18n: Failed to get UI language:', error);
      return 'zh-CN';
    }
  }

  /**
   * 检查是否为中文环境
   * @returns {boolean}
   */
  static isChineseLocale() {
    const lang = this.getUILanguage().toLowerCase();
    return lang.includes('zh') || lang.includes('cn');
  }

  /**
   * 初始化页面文本
   * @param {Document} document - 文档对象
   */
  static initPageText(document = window.document) {
    // 处理带有 data-i18n 属性的元素
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = this.getMessage(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
        element.placeholder = text;
      } else if (element.tagName === 'TEXTAREA') {
        element.placeholder = text;
      } else {
        element.textContent = text;
      }
    });

    // 处理带有 data-i18n-title 属性的元素
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.getMessage(key);
    });

    // 更新页面标题
    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.hasAttribute('data-i18n')) {
      const key = titleElement.getAttribute('data-i18n');
      document.title = this.getMessage(key);
    }
  }

  /**
   * 动态设置元素文本
   * @param {string} elementId - 元素ID
   * @param {string} key - 消息键
   * @param {string|string[]} substitutions - 替换参数
   */
  static setElementText(elementId, key, substitutions = null) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.getMessage(key, substitutions);
    }
  }

  /**
   * 动态设置元素占位符
   * @param {string} elementId - 元素ID
   * @param {string} key - 消息键
   */
  static setElementPlaceholder(elementId, key) {
    const element = document.getElementById(elementId);
    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      element.placeholder = this.getMessage(key);
    }
  }
}

// 全局快捷函数
window.t = (key, substitutions = null) => I18n.getMessage(key, substitutions);
window.I18n = I18n;

// 如果是模块环境，导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}
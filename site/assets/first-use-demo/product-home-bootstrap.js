(function () {
  'use strict';

  // 基址供完整版的静态资源使用，应用内部路由仍应留在当前演示页。
  for (const method of ['pushState', 'replaceState']) {
    const update = window.history[method].bind(window.history);
    window.history[method] = (state, title, url) => {
      const resolved = typeof url === 'string' && url.startsWith('#')
        ? new URL(url, window.location.href).href
        : url;
      return update(state, title, resolved);
    };
  }
}());

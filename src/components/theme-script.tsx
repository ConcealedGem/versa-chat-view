/**
 * 主题初始化脚本
 * 这个脚本会在页面加载时立即执行，避免主题闪烁
 */
export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const root = document.documentElement;
        const savedTheme = localStorage.getItem('theme') || 'system';
        
        // 清除现有主题类
        root.classList.remove('light', 'dark');
        
        let actualTheme = 'light'; // 默认浅色
        
        if (savedTheme === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          actualTheme = systemDark ? 'dark' : 'light';
        } else if (savedTheme === 'dark') {
          actualTheme = 'dark';
        } else {
          actualTheme = 'light';
        }
        
        // 应用主题类
        root.classList.add(actualTheme);
        
        console.log('ThemeScript: 主题已初始化为', actualTheme);
      } catch (error) {
        console.error('ThemeScript: 初始化失败', error);
        // 安全回退到浅色模式
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return (
    <script 
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  appliedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system' 
}: ThemeProviderProps) {
  // 使用延迟初始化避免水合不匹配
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // 避免水合不匹配
  useEffect(() => {
    setMounted(true)
    
    // 客户端初始化
    try {
      const savedTheme = localStorage.getItem('theme') as Theme || defaultTheme
      setThemeState(savedTheme)
      const applied = applyTheme(savedTheme)
      setAppliedTheme(applied)
      console.log('ThemeProvider initialized with theme:', savedTheme, 'applied:', applied)
    } catch (error) {
      console.error('ThemeProvider initialization failed:', error)
      // 回退到默认主题
      setThemeState(defaultTheme)
      const applied = applyTheme(defaultTheme)
      setAppliedTheme(applied)
    }
  }, [defaultTheme])

  // 应用主题到 DOM
  function applyTheme(theme: Theme) {
    // 确保在浏览器环境中执行
    if (typeof window === 'undefined') {
      console.log('applyTheme: 服务端环境，跳过DOM操作')
      return theme === 'dark' ? 'dark' : 'light'
    }
    
    const root = document.documentElement
    
    // 清除现有主题类
    root.classList.remove('light', 'dark')
    
    let actualTheme: 'light' | 'dark'
    
    if (theme === 'system') {
      try {
        localStorage.removeItem('theme')
      } catch (error) {
        console.log('localStorage access failed:', error)
      }
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      actualTheme = systemDark ? 'dark' : 'light'
    } else {
      try {
        localStorage.setItem('theme', theme)
      } catch (error) {
        console.log('localStorage access failed:', error)
      }
      actualTheme = theme
    }
    
    // 应用主题类
    root.classList.add(actualTheme)
    
    console.log(`主题已应用: ${theme} -> ${actualTheme}`)
    return actualTheme
  }

  function getAppliedTheme(theme: Theme): 'light' | 'dark' {
    if (typeof window === 'undefined') {
      // 服务端渲染时的默认值
      return theme === 'dark' ? 'dark' : 'light'
    }
    
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  const setTheme = (newTheme: Theme) => {
    if (!mounted) {
      console.log('setTheme called before mounted, ignoring')
      return
    }
    
    setThemeState(newTheme)
    const applied = applyTheme(newTheme)
    setAppliedTheme(applied)
  }

  const handleToggleTheme = () => {
    if (!mounted) {
      console.log('toggleTheme called before mounted, ignoring')
      return
    }
    
    let newTheme: Theme
    if (theme === 'light') {
      newTheme = 'dark'
    } else if (theme === 'dark') {
      newTheme = 'system'
    } else {
      newTheme = 'light'
    }
    
    setTheme(newTheme)
  }

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const applied = applyTheme('system')
        setAppliedTheme(applied)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  // 始终提供上下文，即使在服务端渲染或未挂载时
  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        appliedTheme, 
        setTheme, 
        toggleTheme: handleToggleTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
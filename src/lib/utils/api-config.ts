/**
 * API配置管理工具
 */

export interface ApiConfig {
  baseUrl: string
  reactEndpoint: string
}

// 默认API配置
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8000',
  reactEndpoint: '/api/agent/react'
}

// 存储key
const API_CONFIG_KEY = 'api-config'

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_API_CONFIG
  }
  
  try {
    const stored = localStorage.getItem(API_CONFIG_KEY)
    if (stored) {
      const config = JSON.parse(stored)
      // 确保配置包含必要的字段，如果缺失则使用默认值
      return {
        baseUrl: config.baseUrl || DEFAULT_API_CONFIG.baseUrl,
        reactEndpoint: config.reactEndpoint || DEFAULT_API_CONFIG.reactEndpoint
      }
    }
  } catch (error) {
    console.warn('Failed to parse API config from localStorage:', error)
  }
  
  return DEFAULT_API_CONFIG
}

/**
 * 设置API配置
 */
export function setApiConfig(config: ApiConfig): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
    // 触发配置变更事件
    window.dispatchEvent(new CustomEvent('api-config-changed', { detail: config }))
  } catch (error) {
    console.error('Failed to save API config to localStorage:', error)
  }
}

/**
 * 重置API配置为默认值
 */
export function resetApiConfig(): void {
  setApiConfig(DEFAULT_API_CONFIG)
}

/**
 * 获取完整的API URL
 */
export function getFullApiUrl(endpoint: string = ''): string {
  const config = getApiConfig()
  return config.baseUrl + endpoint
}

/**
 * 获取React API的完整URL
 */
export function getReactApiUrl(): string {
  const config = getApiConfig()
  return config.baseUrl + config.reactEndpoint
}

/**
 * 验证API配置是否有效
 */
export function validateApiConfig(config: ApiConfig): boolean {
  try {
    // 检查baseUrl是否为有效URL
    new URL(config.baseUrl)
    
    // 检查endpoint是否以/开头
    if (!config.reactEndpoint.startsWith('/')) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

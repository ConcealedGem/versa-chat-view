'use client'

import axios, { AxiosError } from 'axios'
import { useState } from 'react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: () => void
}

interface LoginResponse {
  token: string
  user_id: string
  username: string
}

interface ErrorResponse {
  detail?: string
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 处理登录请求
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await axios.post<LoginResponse>('/api/user/login', {
        username,
        password
      })
      
      // 保存token到localStorage
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user_id', response.data.user_id)
      localStorage.setItem('username', response.data.username)
      console.log('Login successful, token saved:', response.data.token ? 'YES' : 'NO')
      
      // 触发登录状态变化事件
      window.dispatchEvent(new CustomEvent('loginStatusChanged'))
      
      // 通知父组件登录成功
      onLoginSuccess()
      
      // 重置表单
      setUsername('')
      setPassword('')
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>
      console.error('Login Error:', axiosError.response?.data?.detail || axiosError.message)
      setError(axiosError.response?.data?.detail || 'Login failed, please check username and password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div 
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl animate-scale-in border border-neutral-200 dark:border-neutral-700"
        style={{
          width: '400px',
          minWidth: '320px',
          maxWidth: '90vw',
          padding: '32px'
        }}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">登录</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">请输入您的登录凭据</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 
                         bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-neutral-500 dark:placeholder-neutral-400
                         transition-all duration-200"
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 
                         bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-neutral-500 dark:placeholder-neutral-400
                         transition-all duration-200"
              placeholder="请输入密码"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 
                         rounded-lg font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-600 
                         transition-all duration-200 transform hover:scale-[0.98]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                         text-white rounded-lg font-semibold 
                         transition-all duration-200 transform hover:scale-[0.98]
                         disabled:cursor-not-allowed disabled:transform-none
                         focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  登录中...
                </div>
              ) : (
                '登录'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
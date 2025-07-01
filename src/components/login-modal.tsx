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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">Login</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              UserName
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              PassWord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              required
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Logging in ...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
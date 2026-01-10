<script setup>
import { ref } from 'vue'
import axios from 'axios'

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const emit = defineEmits(['login-success'])

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/login', {
      username: username.value,
      password: password.value
    })
    
    if (res.data.success) {
      // 儲存使用者資訊到 localStorage
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('user', JSON.stringify(res.data.user))
      emit('login-success', res.data.user)
    }
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = err.response.data.detail || '帳號或密碼錯誤'
    } else {
      error.value = '連線失敗，請確認後端是否啟動'
    }
  } finally {
    isLoading.value = false
  }
}

const handleKeyup = (e) => {
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">💰</div>
        <h1>PyMoney</h1>
        <p class="subtitle">家庭記帳管理系統</p>
      </div>
      
      <div class="login-form">
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="username" 
            type="text" 
            placeholder="請輸入帳號" 
            @keyup="handleKeyup"
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔒</span>
          <input 
            v-model="password" 
            type="password" 
            placeholder="請輸入密碼" 
            @keyup="handleKeyup"
            :disabled="isLoading"
          />
        </div>
        
        <p v-if="error" class="error-text">{{ error }}</p>
        
        <button 
          @click="handleLogin" 
          class="btn-login"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>登入系統</span>
        </button>
      </div>
      
      <div class="login-footer">
        <p>預設管理員帳號：admin / admin</p>
        <button @click="$emit('go-to-register')" class="btn-register-link">
          還沒有帳號？立即註冊 →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  font-size: 4rem;
  margin-bottom: 10px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

h1 {
  margin: 0;
  font-size: 2rem;
  color: #2c3e50;
  font-weight: 700;
}

.subtitle {
  color: #7f8c8d;
  margin-top: 5px;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 15px;
  font-size: 1.2rem;
}

.input-wrapper input {
  width: 100%;
  padding: 15px 15px 15px 50px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.input-wrapper input:disabled {
  background: #f5f5f5;
}

.error-text {
  color: #e74c3c;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.btn-login {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.login-footer p {
  color: #95a5a6;
  font-size: 0.85rem;
  margin: 0;
}

.btn-register-link {
  background: transparent;
  border: none;
  color: #667eea;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 10px;
  transition: color 0.3s;
}

.btn-register-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
  
  .logo {
    font-size: 3rem;
  }
  
  h1 {
    font-size: 1.5rem;
  }
}
</style>

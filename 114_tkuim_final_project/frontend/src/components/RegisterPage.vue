<script setup>
import { ref } from 'vue'
import axios from 'axios'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const role = ref('user')
const error = ref('')
const success = ref('')
const isLoading = ref(false)

const emit = defineEmits(['go-to-login'])

const handleRegister = async () => {
  error.value = ''
  success.value = ''
  
  if (!username.value || !password.value || !displayName.value) {
    error.value = '請填寫所有欄位'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = '兩次密碼不一致'
    return
  }
  
  if (password.value.length < 4) {
    error.value = '密碼至少需要 4 個字元'
    return
  }
  
  isLoading.value = true
  
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/register', {
      username: username.value,
      password: password.value,
      display_name: displayName.value,
      role: role.value
    })
    
    success.value = '註冊成功！請返回登入'
    setTimeout(() => emit('go-to-login'), 1500)
  } catch (err) {
    error.value = err.response?.data?.detail || '註冊失敗'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <div class="logo">📝</div>
        <h1>建立帳號</h1>
        <p class="subtitle">加入 PyMoney 家庭記帳</p>
      </div>
      
      <div class="register-form">
        <div class="input-wrapper">
          <span class="input-icon">😀</span>
          <input 
            v-model="displayName" 
            type="text" 
            placeholder="顯示名稱（如：小明）" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="username" 
            type="text" 
            placeholder="帳號" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔒</span>
          <input 
            v-model="password" 
            type="password" 
            placeholder="密碼" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔐</span>
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="確認密碼" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="role-selector">
          <label>👑 身分別</label>
          <div class="role-options">
            <label class="role-option" :class="{ active: role === 'user' }">
              <input type="radio" v-model="role" value="user" :disabled="isLoading" />
              <span class="role-icon">👤</span>
              <span class="role-text">一般成員</span>
              <span class="role-desc">可記帳、產生邀請碼</span>
            </label>
            <label class="role-option" :class="{ active: role === 'admin' }">
              <input type="radio" v-model="role" value="admin" :disabled="isLoading" />
              <span class="role-icon">👨‍👩‍👧</span>
              <span class="role-text">家庭管理員</span>
              <span class="role-desc">可管理成員、查看全家帳目</span>
            </label>
          </div>
        </div>
        
        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="success" class="success-text">{{ success }}</p>
        
        <button 
          @click="handleRegister" 
          class="btn-register"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>註冊</span>
        </button>
        
        <button @click="$emit('go-to-login')" class="btn-back">
          ← 返回登入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 20px;
}

.register-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  font-size: 4rem;
  margin-bottom: 10px;
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

.register-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border-color: #11998e;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.2);
}

.error-text {
  color: #e74c3c;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
}

.success-text {
  color: #27ae60;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  font-weight: bold;
}

.btn-register {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
}

.btn-register:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(17, 153, 142, 0.4);
}

.btn-back {
  background: transparent;
  color: #7f8c8d;
  border: none;
  padding: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.3s;
}

.btn-back:hover {
  color: #2c3e50;
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

.role-selector {
  margin: 10px 0;
}

.role-selector > label {
  font-size: 0.9rem;
  color: #555;
  display: block;
  margin-bottom: 8px;
}

.role-options {
  display: flex;
  gap: 10px;
}

.role-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.role-option:hover {
  border-color: #11998e;
}

.role-option.active {
  border-color: #11998e;
  background: rgba(17, 153, 142, 0.1);
}

.role-option input {
  display: none;
}

.role-icon {
  font-size: 2rem;
  margin-bottom: 5px;
}

.role-text {
  font-weight: bold;
  font-size: 0.9rem;
  color: #2c3e50;
}

.role-desc {
  font-size: 0.75rem;
  color: #7f8c8d;
  margin-top: 3px;
}
</style>

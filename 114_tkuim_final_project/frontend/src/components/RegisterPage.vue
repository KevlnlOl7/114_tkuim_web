<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { t, currentLocale, setLocale } from '../i18n'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const email = ref('')
const role = ref('user')
const error = ref('')
const success = ref('')
const isLoading = ref(false)

const emit = defineEmits(['go-to-login'])

const backendErrors = {
  '使用者名稱已存在': 'error_username_exists',
  '使用者不存在': 'error_user_not_found',
  '密碼錯誤': 'error_password_wrong',
  '邀請碼無效': 'error_invite_invalid',
  '邀請碼已過期': 'error_invite_expired',
  '帳號長度需至少 3 個字元': 'validation_username_length',
  '密碼太短': 'password_too_short',
  'Email 格式不正確': 'validation_email_invalid'
}

const handleRegister = async () => {
  error.value = ''
  success.value = ''
  
  if (!username.value || !password.value || !displayName.value || !email.value) {
    error.value = t('fill_all_fields')
    return
  }
  
  if (username.value.length < 3) {
    error.value = t('validation_username_length')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    error.value = t('validation_email_invalid')
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = t('password_mismatch')
    return
  }
  
  if (password.value.length < 4) {
    error.value = t('password_too_short')
    return
  }
  
  isLoading.value = true
  
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/register', {
      username: username.value,
      password: password.value,
      display_name: displayName.value,
      email: email.value,
      role: role.value
    })
    
    if (res.data.id) {
      success.value = t('register_success')
      setTimeout(() => {
        emit('go-to-login')
      }, 1500)
    }
  } catch (err) {
    const msg = err.response?.data?.detail
    // 嘗試翻譯後端錯誤訊息
    if (msg && backendErrors[msg]) {
      error.value = t(backendErrors[msg])
    } else {
      error.value = msg || t('register_failed')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="lang-switch-container">
        <select v-model="currentLocale" @change="setLocale(currentLocale)" class="lang-select-small">
          <option value="zh-TW">🇹🇼 中文</option>
          <option value="en-US">🇺🇸 English</option>
          <option value="ja">🇯🇵 日本語</option>
          <option value="ko">🇰🇷 한국어</option>
          <option value="vi">🇻🇳 Tiếng Việt</option>
          <option value="id">🇮🇩 Bahasa Ind</option>
          <option value="tl">🇵🇭 Filipino</option>
        </select>
      </div>

      <div class="register-header">
        <div class="logo">📝</div>
        <h1>{{ t('create_account') }}</h1>
        <p class="subtitle">{{ t('join_pymoney') }}</p>
      </div>
      
      <div class="register-form">
        <div class="input-wrapper">
          <span class="input-icon">😀</span>
          <input 
            v-model="displayName" 
            type="text" 
            :placeholder="t('display_name_ph')" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">📧</span>
          <input 
            v-model="email" 
            type="email" 
            :placeholder="t('email_ph')" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="username" 
            type="text" 
            :placeholder="t('username_ph')" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔒</span>
          <input 
            v-model="password" 
            type="password" 
            :placeholder="t('password_ph')" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔐</span>
          <input 
            v-model="confirmPassword" 
            type="password" 
            :placeholder="t('confirm_password_ph')" 
            :disabled="isLoading"
          />
        </div>
        
        <div class="role-selector">
          <label>👑 {{ t('role_label') }}</label>
          <div class="role-options">
            <label class="role-option" :class="{ active: role === 'user' }">
              <input type="radio" v-model="role" value="user" :disabled="isLoading" />
              <span class="role-icon">👤</span>
              <span class="role-text">{{ t('general_member') }}</span>
              <span class="role-desc">{{ t('role_user_desc') }}</span>
            </label>
            <label class="role-option" :class="{ active: role === 'admin' }">
              <input type="radio" v-model="role" value="admin" :disabled="isLoading" />
              <span class="role-icon">👨‍👩‍👧</span>
              <span class="role-text">{{ t('family_admin') }}</span>
              <span class="role-desc">{{ t('role_admin_desc') }}</span>
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
          <span v-else>{{ t('register') }}</span>
        </button>
        
        <button @click="$emit('go-to-login')" class="btn-back">
          ← {{ t('back_to_login') }}
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
  background: linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Background Decoration */
.register-container::before {
  content: '';
  position: absolute;
  top: -10%;
  left: -10%;
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.3);
  filter: blur(80px);
  border-radius: 50%;
  z-index: 0;
}

.register-container::after {
  content: '';
  position: absolute;
  bottom: -10%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: rgba(161, 140, 209, 0.4);
  filter: blur(60px);
  border-radius: 50%;
  z-index: 0;
}

.register-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 1;
  position: relative;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.register-header {
  text-align: center;
  margin-bottom: 25px;
}

.logo {
  font-size: 4rem;
  margin-bottom: 10px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

h1 {
  margin: 0;
  font-size: 2rem;
  background: -webkit-linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #7f8c8d;
  margin-top: 5px;
  font-size: 0.9rem;
  font-weight: 500;
}

.register-form {
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
  left: 18px;
  font-size: 1.2rem;
  color: #a0a0a0;
  transition: color 0.3s;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 14px 14px 50px;
  border: 2px solid #f0f0f0;
  background: white;
  border-radius: 14px;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #2d3436;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #A18CD1;
  box-shadow: 0 0 0 4px rgba(161, 140, 209, 0.15);
  transform: translateY(-1px);
}

.input-wrapper:focus-within .input-icon {
  color: #A18CD1;
}

.error-text {
  color: #ff6b6b;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  font-weight: 500;
  background: rgba(255, 107, 107, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.success-text {
  color: #00b894;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  font-weight: 500;
  background: rgba(0, 184, 148, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.btn-register {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(17, 153, 142, 0.3);
  margin-top: 10px;
}

.btn-register:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 15px 30px rgba(17, 153, 142, 0.4);
}

.btn-register:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-register:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-back {
  background: transparent;
  color: #7f8c8d;
  border: none;
  padding: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  margin-top: 5px;
}

.btn-back:hover {
  color: #11998e;
  transform: translateX(-3px);
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
  margin: 5px 0;
}

.role-selector > label {
  font-size: 0.9rem;
  color: #555;
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.role-options {
  display: flex;
  gap: 12px;
}

.role-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 10px;
  border: 2px solid #f0f0f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  background: white;
}

.role-option:hover {
  border-color: #11998e;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.role-option.active {
  border-color: #11998e;
  background: rgba(17, 153, 142, 0.08);
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.1);
}

.role-option input {
  display: none;
}

.role-icon {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.role-text {
  font-weight: bold;
  font-size: 0.9rem;
  color: #2c3e50;
}

.role-desc {
  font-size: 0.7rem;
  color: #7f8c8d;
  margin-top: 3px;
  line-height: 1.2;
}

/* Language Selector */
.lang-switch-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.lang-select-small {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(224, 224, 224, 0.5);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 0.85rem;
  color: #2d3436;
  cursor: pointer;
  outline: none;
  font-weight: 500;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  backdrop-filter: blur(5px);
}

.lang-select-small:hover {
  background: white;
  border-color: #11998e;
  box-shadow: 0 4px 10px rgba(17, 153, 142, 0.15);
}
</style>


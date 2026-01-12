<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { t, currentLocale, setLocale } from '../i18n'

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

// 忘記密碼
const showForgotModal = ref(false)
const forgotEmail = ref('')
const forgotMessage = ref('')
const forgotLoading = ref(false)

const emit = defineEmits(['login-success', 'go-to-register'])

const backendErrors = {
  '使用者名稱已存在': 'error_username_exists',
  '使用者不存在': 'error_user_not_found',
  '密碼錯誤': 'error_password_wrong',
  '邀請碼無效': 'error_invite_invalid',
  '邀請碼已過期': 'error_invite_expired',
  '郵件發送失敗，請稍後再試': 'error_email_send_failed'
}

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = t('login_error_empty')
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
    const msg = err.response?.data?.detail
    if (err.response?.status === 401) {
      // 嘗試翻譯後端錯誤訊息
      if (msg && backendErrors[msg]) {
        error.value = t(backendErrors[msg])
      } else {
        error.value = msg || t('login_error_failed')
      }
    } else {
      error.value = t('login_error_connection')
    }
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = async () => {
  if (!forgotEmail.value) {
    forgotMessage.value = t('forgot_error_email_empty')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(forgotEmail.value)) {
    forgotMessage.value = '❌ ' + t('validation_email_invalid')
    return
  }
  
  forgotLoading.value = true
  forgotMessage.value = ''
  
  try {
    await axios.post('http://127.0.0.1:8000/api/auth/forgot-password', {
      email: forgotEmail.value
    })
    // 強制使用翻譯的成功訊息
    forgotMessage.value = '✅ ' + t('forgot_send_success')
    setTimeout(() => {
      showForgotModal.value = false
      forgotEmail.value = ''
      forgotMessage.value = ''
    }, 3000)
  } catch (err) {
    const msg = err.response?.data?.detail
    if (msg && backendErrors[msg]) {
      forgotMessage.value = '❌ ' + t(backendErrors[msg])
    } else {
      forgotMessage.value = '❌ ' + (msg || t('forgot_send_failed'))
    }
  } finally {
    forgotLoading.value = false
  }
}

const handleKeyup = (e) => {
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
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

      <div class="login-header">
        <div class="logo">💰</div>
        <h1>PyMoney</h1>
        <p class="subtitle">{{ t('login_header_subtitle') }}</p>
      </div>
      
      <div class="login-form">
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="username" 
            type="text" 
            :placeholder="t('login_input_username_ph')" 
            @keyup="handleKeyup"
            :disabled="isLoading"
          />
        </div>
        
        <div class="input-wrapper">
          <span class="input-icon">🔒</span>
          <input 
            v-model="password" 
            type="password" 
            :placeholder="t('login_input_password_ph')" 
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
          <span v-else>{{ t('login_btn') }}</span>
        </button>
        
        <button @click="showForgotModal = true" class="btn-forgot">
          🔑 {{ t('forgot_password') }}
        </button>
      </div>
      
      <div class="login-footer">
        <p>{{ t('default_admin_hint') }}</p>
        <button @click="$emit('go-to-register')" class="btn-register-link">
          {{ t('no_account_link') }}
        </button>
      </div>
    </div>
    
    <!-- 忘記密碼 Modal -->
    <div v-if="showForgotModal" class="modal-overlay" @click.self="showForgotModal = false">
      <div class="modal-card">
        <h3>🔐 {{ t('forgot_modal_title') }}</h3>
        <p class="modal-hint">{{ t('forgot_modal_hint') }}</p>
        <input 
          v-model="forgotEmail" 
          type="email" 
          :placeholder="t('forgot_email_ph')" 
          class="modal-input"
          :disabled="forgotLoading"
        />
        <p v-if="forgotMessage" :class="forgotMessage.includes('✅') ? 'success-msg' : 'error-msg'">
          {{ forgotMessage }}
        </p>
        <div class="modal-actions">
          <button @click="handleForgotPassword" class="btn-confirm" :disabled="forgotLoading">
            {{ forgotLoading ? t('forgot_sending') : t('forgot_send_btn') }}
          </button>
          <button @click="showForgotModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
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
  background: linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Background Decoration */
.login-container::before {
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

.login-container::after {
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

.login-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 1;
  position: relative;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.logo {
  font-size: 4.5rem;
  margin-bottom: 15px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

h1 {
  margin: 0;
  font-size: 2.2rem;
  background: -webkit-linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #7f8c8d;
  margin-top: 8px;
  font-size: 0.95rem;
  font-weight: 500;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  padding: 16px 16px 16px 50px;
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
  padding: 16px;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  margin-top: 5px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
}

.btn-login:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid rgba(0,0,0,0.06);
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
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.3s;
  padding: 8px 16px;
  border-radius: 8px;
}

.btn-register-link:hover {
  color: #764ba2;
  background: rgba(102, 126, 234, 0.08);
}

.btn-forgot {
  background: transparent;
  border: none;
  color: #636e72;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 5px;
  transition: all 0.3s;
  font-weight: 500;
}
.btn-forgot:hover { 
  color: #667eea; 
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: white;
  border-radius: 20px;
  padding: 35px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0,0,0,0.2);
  animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modalPop {
  0% { opacity: 0; transform: scale(0.8) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-card h3 { 
  margin: 0 0 12px 0; 
  color: #2d3436; 
  font-size: 1.5rem; 
  font-weight: 700;
}
.modal-hint { color: #636e72; margin-bottom: 25px; line-height: 1.5; }

.modal-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1rem;
  margin-bottom: 12px;
  transition: all 0.3s;
}
.modal-input:focus { 
  border-color: #667eea; 
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15); 
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3); }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-cancel {
  background: #f1f2f6;
  color: #2d3436;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-cancel:hover { background: #dfe4ea; }

.success-msg { color: #00b894; font-weight: 600; margin-top: 10px; padding: 10px; background: rgba(0, 184, 148, 0.1); border-radius: 8px;}
.error-msg { color: #ff7675; font-weight: 600; margin-top: 10px; padding: 10px; background: rgba(255, 118, 117, 0.1); border-radius: 8px;}

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
  border-color: #667eea;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.15);
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
  .logo { font-size: 3.5rem; }
  h1 { font-size: 1.8rem; }
}
</style>

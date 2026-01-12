<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import CalendarView from './components/CalendarView.vue'
import CategoryManager from './components/CategoryManager.vue'
import PaymentMethodManager from './components/PaymentMethodManager.vue'
import LoginPage from './components/LoginPage.vue'
import RegisterPage from './components/RegisterPage.vue'
import UserManager from './components/UserManager.vue'
import TransactionForm from './components/TransactionForm.vue'
import TransactionList from './components/TransactionList.vue'
import StatsPanel from './components/StatsPanel.vue'
import QuickEntry from './components/QuickEntry.vue'
import { t, currentLocale, setLocale } from './i18n.js'

// --- Auth State ---
const currentPage = ref('login')
const isLoggedIn = ref(false)
const currentUser = ref(null)
const showUserManager = ref(false)
const showCalendar = ref(false)
const showCategoryManager = ref(false)
const showPaymentMethodManager = ref(false)

// --- Data State ---
const transactions = ref([])
const stats = ref({})
const trendData = ref({})
const budgetLimit = ref(0)
const categories = ref([])
const paymentMethods = ref([])
const isLoading = ref(false)
const accountTotalAmount = ref(0) // 帳戶餘額總計

// --- Filter State ---
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')

// --- Edit State ---
const isEditing = ref(false)
const editId = ref(null)
const rateUpdatedAt = ref('')
const formRef = ref(null)

// --- Form ---
const defaultCurrency = ref(localStorage.getItem('default_currency') || 'TWD')
const form = ref({
  title: '', amount: '', category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense', payment_method: 'Cash',
  target_account: '',
  note: '',
  currency: defaultCurrency.value, foreign_amount: '', exchange_rate: 1
})

// --- Dark Mode ---
const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value)
  applyTheme()
}
const applyTheme = () => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
applyTheme()

// --- Reset Password Modal ---
const showResetPasswordModal = ref(false)
const pendingResetToken = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const resetMessage = ref('')
const resetLoading = ref(false)

// --- Family/Invite State ---
const showInviteModal = ref(false)
const inviteCode = ref('')
const inviteExpires = ref('')
const inviteLoading = ref(false)
const showJoinModal = ref(false)
const joinCode = ref('')
const joinMessage = ref('')
const familyMembers = ref([])
const familyName = ref('')
const familyAdminName = ref('') // Store admin name for i18n
const selectedUserIds = ref([]) // Multi-select: array of user IDs
let pollingInterval = null

// --- Auth Functions ---
const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    currentUser.value = JSON.parse(savedUser)
    if (currentUser.value.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.value.token}`
    }
    currentPage.value = 'main'
  }
}

const handleLoginSuccess = (user) => {
  isLoggedIn.value = true
  currentUser.value = user
  if (user.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`
  }
  currentPage.value = 'main'
  fetchData()
}

const handleLogout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('user')
  delete axios.defaults.headers.common['Authorization']
  isLoggedIn.value = false
  currentUser.value = null
  currentPage.value = 'login'
}

// --- API Functions ---
const fetchData = async () => {
  isLoading.value = true
  try {
    const filterQuery = getFilterQuery()
    
    const listRes = await axios.get(`http://127.0.0.1:8000/api/transactions${filterQuery}`)
    transactions.value = listRes.data 

    await fetchStats()
    
    const budgetRes = await axios.get('http://127.0.0.1:8000/api/budget')
    budgetLimit.value = budgetRes.data.limit
    
    await fetchCategories()
    await fetchPaymentMethods()
  } catch (error) { 
    console.error(error) 
  } finally {
    isLoading.value = false
  }
}

const getFilterQuery = () => {
  let query = `?keyword=${keyword.value}`
  if (startDate.value) query += `&start_date=${startDate.value}`
  if (endDate.value) query += `&end_date=${endDate.value}`
  
  if (selectedUserIds.value.length > 0) {
    query += `&user_ids=${selectedUserIds.value.join(',')}`
  } else if (currentUser.value) {
    query += `&user_id=${currentUser.value.id}`
  }
  return query
}





// --- 取得資料 ---
const fetchStats = async () => {
  try {
    const query = getFilterQuery()
    
    const [statRes, trendRes, accountRes] = await Promise.all([
      axios.get(`http://127.0.0.1:8000/api/dashboard/stats${query}`),
      axios.get(`http://127.0.0.1:8000/api/dashboard/trend${query}`),
      axios.get(`http://127.0.0.1:8000/api/dashboard/accounts${query}`)
    ])

    stats.value = statRes.data
    trendData.value = trendRes.data
    
    // 計算總資產 - 使用帳戶餘額
    const accounts = accountRes.data
    accountTotalAmount.value = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    
  } catch (err) { console.error(err) }
}

const fetchCategories = async () => {
  try {
    let url = 'http://127.0.0.1:8000/api/categories'
    if (currentUser.value) url += `?user_id=${currentUser.value.id}`
    const res = await axios.get(url)
    categories.value = res.data
  } catch (err) { console.error(err) }
}

const fetchPaymentMethods = async () => {
  try {
    let url = 'http://127.0.0.1:8000/api/payment-methods'
    if (currentUser.value) url += `?user_id=${currentUser.value.id}`
    const res = await axios.get(url)
    paymentMethods.value = res.data
  } catch (err) { console.error(err) }
}

// --- Transaction CRUD ---
const handleSubmit = async () => {
  const payload = { 
    ...form.value, 
    amount: Number(form.value.amount),
    foreign_amount: form.value.foreign_amount ? Number(form.value.foreign_amount) : null,
    exchange_rate: form.value.exchange_rate ? Number(form.value.exchange_rate) : null,
    target_account: form.value.target_account || null
  }
  try {
    if (isEditing.value) {
      await axios.put(`http://127.0.0.1:8000/api/transactions/${editId.value}`, payload)
      cancelEdit()
    } else {
      await axios.post('http://127.0.0.1:8000/api/transactions', payload)
      resetForm()
    }
    fetchData()
  } catch (error) { 
    const detail = error.response?.data?.detail
    const msg = Array.isArray(detail) ? detail[0]?.msg : detail
    alert(t('op_failed') + (msg ? ': ' + msg : ''))
    console.error("Operation failed", error)
  }
}

const removeTransaction = async (id) => {
  if (!confirm("確定要刪除嗎？")) return
  await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
  fetchData()
}

const startEdit = (item) => {
  isEditing.value = true
  editId.value = item.id
  form.value = { ...item }
  if (!form.value.currency) form.value.currency = 'TWD'
  scrollToForm()
}

const cancelEdit = () => { 
  isEditing.value = false
  editId.value = null
  resetForm() 
}

const resetForm = () => {
  form.value = {
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense', payment_method: 'Cash',
    target_account: '',
    note: '',
    currency: defaultCurrency.value, foreign_amount: '', exchange_rate: 1
  }
}

const duplicateTransaction = (item) => {
  form.value = {
    ...item,
    id: null,
    date: new Date().toISOString().split('T')[0]
  }
  isEditing.value = false
  editId.value = null
  scrollToForm()
}

// Use template for quick entry
const useTemplate = (template) => {
  form.value = {
    ...form.value,
    title: template.title,
    amount: template.amount,
    category: template.category,
    type: template.type,
    payment_method: template.payment_method,
    note: template.note || '',
    date: new Date().toISOString().split('T')[0],
    // Force TWD for templates (templates store amount in TWD)
    currency: 'TWD',
    foreign_amount: '',
    exchange_rate: 1
  }
  isEditing.value = false
  editId.value = null
  scrollToForm()
}

// Scroll to form helper
const scrollToForm = () => {
  if (formRef.value?.$el) {
    formRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (formRef.value) {
    formRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// --- Budget ---
const saveBudget = async (amount) => {
  try {
    await axios.post('http://127.0.0.1:8000/api/budget', { limit: amount })
    budgetLimit.value = amount
    alert("預算設定成功！")
  } catch (error) { alert("設定失敗") }
}

// --- Import/Export ---
const exportExcel = async () => { 
  if (transactions.value.length < 1) {
    const msg = t('no_data_to_export') || '無資料可匯出，請先新增交易紀錄'
    console.log('Export check failed:', msg)
    alert(msg)
    return
  }
  try {
    const res = await axios.get('http://127.0.0.1:8000/api/export', {
      responseType: 'blob'
    })
    // 建立 Blob 下載連結
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'PyMoney_Export.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('匯出失敗：' + (error.response?.data?.detail || error.message))
  }
}

const downloadSample = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8000/api/import/sample', {
      params: { format: 'csv' },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'PyMoney_Import_Sample.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('下載範例失敗：' + (error.response?.data?.detail || error.message))
  }
}

const handleImport = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    alert(res.data.message)
    fetchData()
  } catch (error) {
    alert("匯入失敗：" + (error.response?.data?.detail || error.message))
  }
}

// --- Calendar ---
const handleDateSelect = (date) => {
  startDate.value = date
  endDate.value = date
  showCalendar.value = false
  fetchData()
}

// --- Computed ---
const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    if (item.type === 'income') return sum + item.amount
    if (item.type === 'expense') return sum - item.amount
    return sum
  }, 0)
})

const displayFamilyName = computed(() => {
  if (!familyName.value) return t('family_book')
  
  if (familyAdminName.value) {
    if (familyName.value.includes(familyAdminName.value)) {
       return t('users_family', { name: familyAdminName.value })
    }
  }
  return familyName.value
})

const monthlyExpense = computed(() => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  return transactions.value
    .filter(item => item.type === 'expense' && item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0)
})

// --- Family Functions ---
const generateInviteCode = async () => {
  if (!currentUser.value) return
  inviteLoading.value = true
  try {
    const res = await axios.post(`http://127.0.0.1:8000/api/invite/generate?user_id=${currentUser.value.id}`)
    inviteCode.value = res.data.code
    inviteExpires.value = res.data.expires_at
    showInviteModal.value = true
    startFamilyPolling()
  } catch (err) {
    alert('產生邀請碼失敗')
  } finally {
    inviteLoading.value = false
  }
}

const startFamilyPolling = () => {
  pollingInterval = setInterval(async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/users/${currentUser.value.id}`)
      if (res.data.family_id) {
        currentUser.value.family_id = res.data.family_id
        localStorage.setItem('user', JSON.stringify(currentUser.value))
        showInviteModal.value = false
        stopFamilyPolling()
        fetchFamilyMembers()
      }
    } catch (err) {
      console.log('檢查狀態失敗')
    }
  }, 3000)
}

const stopFamilyPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

const refreshUser = async () => {
  if (!currentUser.value) return
  try {
    const res = await axios.get(`http://127.0.0.1:8000/api/users/${currentUser.value.id}`)
    if (res.data) {
      const oldFamilyId = currentUser.value.family_id
      currentUser.value = { ...currentUser.value, ...res.data }
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      
      // If user joined or switched family, fetch members
      if (currentUser.value.family_id) {
        await fetchFamilyMembers()
      } else {
        familyMembers.value = []
        familyName.value = ''
      }
    }
  } catch (err) {
    console.error('更新使用者資訊失敗', err)
  }
}

const acceptInviteCode = async () => {
  if (!currentUser.value || !joinCode.value) return
  try {
    const res = await axios.post(
      `http://127.0.0.1:8000/api/invite/accept?admin_id=${currentUser.value.id}`,
      { code: joinCode.value }
    )
    joinMessage.value = res.data.message
    await fetchFamilyMembers()
    setTimeout(() => {
      showJoinModal.value = false
      joinCode.value = ''
      joinMessage.value = ''
    }, 2000)
  } catch (err) {
    joinMessage.value = err.response?.data?.detail || '邀請碼無效'
  }
}

const fetchFamilyMembers = async () => {
  if (!currentUser.value?.family_id) return
  try {
    const res = await axios.get(`http://127.0.0.1:8000/api/family/members/${currentUser.value.family_id}`)
    familyMembers.value = res.data.members
    familyName.value = res.data.family_name
    familyAdminName.value = res.data.admin_name || ''
  } catch (err) {
    console.log('尚未加入家庭或無成員')
  }
}

const leaveFamily = async () => {
  if (!confirm('確定要離開這個家庭嗎？')) return
  try {
    await axios.post(`http://127.0.0.1:8000/api/family/leave?user_id=${currentUser.value.id}`)
    alert('已離開家庭')
    currentUser.value.family_id = null
    localStorage.setItem('user', JSON.stringify(currentUser.value))
    familyMembers.value = []
    familyName.value = ''
    selectedUserIds.value = [] // Clear filter state
  } catch (err) {
    alert(err.response?.data?.detail || '離開失敗')
  }
}

const removeMember = async (memberId, memberName) => {
  if (!confirm(`確定要將 ${memberName} 移出家庭嗎？`)) return
  try {
    await axios.post(`http://127.0.0.1:8000/api/family/remove-member?admin_id=${currentUser.value.id}&member_id=${memberId}`)
    alert(`已將 ${memberName} 移出家庭`)
    await fetchFamilyMembers()
  } catch (err) {
    alert(err.response?.data?.detail || '移除失敗')
  }
}

// --- Reset Password ---
const handleResetPassword = async () => {
  resetMessage.value = ''
  if (!newPassword.value || !confirmNewPassword.value) {
    resetMessage.value = '請填寫所有欄位'
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    resetMessage.value = '兩次密碼不一致'
    return
  }
  if (newPassword.value.length < 4) {
    resetMessage.value = '密碼至少需要 4 個字元'
    return
  }
  resetLoading.value = true
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/auth/reset-password', {
      token: pendingResetToken.value,
      new_password: newPassword.value
    })
    resetMessage.value = '✅ ' + res.data.message
    setTimeout(() => {
      showResetPasswordModal.value = false
      newPassword.value = ''
      confirmNewPassword.value = ''
      pendingResetToken.value = ''
      resetMessage.value = ''
    }, 2000)
  } catch (err) {
    resetMessage.value = '❌ ' + (err.response?.data?.detail || '重設失敗')
  } finally {
    resetLoading.value = false
  }
}

// --- Watchers ---
watch([keyword, startDate, endDate, selectedUserIds], () => { fetchData() }, { deep: true })

watch(currentLocale, (val) => {
  localStorage.setItem('user_locale', val)
  document.documentElement.lang = val
}, { immediate: true })

// --- Password Change Logic ---
const showChangePasswordModal = ref(false)
const oldPassword = ref('')
const newPassword2 = ref('')
const confirmNewPassword2 = ref('')
const pwLoading = ref(false)
const pwMessage = ref('')

const handleUpdatePassword = async () => {
  if (!oldPassword.value || !newPassword2.value || !confirmNewPassword2.value) {
    pwMessage.value = '❌ ' + t('fill_all_required')
    return
  }
  if (newPassword2.value !== confirmNewPassword2.value) {
    pwMessage.value = '❌ ' + t('password_mismatch')
    return
  }
  
  pwLoading.value = true
  pwMessage.value = ''
  
  try {
    await axios.post('http://127.0.0.1:8000/api/users/change-password', {
      old_password: oldPassword.value,
      new_password: newPassword2.value
    })
    pwMessage.value = '✅ ' + t('password_changed')
    setTimeout(() => {
      showChangePasswordModal.value = false
      oldPassword.value = ''
      newPassword2.value = ''
      confirmNewPassword2.value = ''
      pwMessage.value = ''
    }, 2000)
  } catch (err) {
    pwMessage.value = '❌ ' + (err.response?.data?.detail || t('op_failed'))
  } finally {
    pwLoading.value = false
  }
}

// --- Lifecycle ---
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const resetToken = urlParams.get('reset_token')
  if (resetToken) {
    showResetPasswordModal.value = true
    pendingResetToken.value = resetToken
    window.history.replaceState({}, '', window.location.pathname)
    return
  }
  
  checkLoginStatus()
  if (isLoggedIn.value) {
    refreshUser()
    fetchData()
    if (currentUser.value?.family_id) {
      fetchFamilyMembers()
    }
    
    // 定期檢查使用者狀態（每 30 秒），偵測是否被移出家庭
    setInterval(async () => {
      if (currentUser.value && isLoggedIn.value) {
        try {
          const res = await axios.get(`http://127.0.0.1:8000/api/users/${currentUser.value.id}`)
          if (res.data) {
            const oldFamilyId = currentUser.value.family_id
            const newFamilyId = res.data.family_id
            
            // 如果家庭狀態有變化
            if (oldFamilyId !== newFamilyId) {
              currentUser.value = { ...currentUser.value, ...res.data }
              localStorage.setItem('user', JSON.stringify(currentUser.value))
              
              if (newFamilyId) {
                await fetchFamilyMembers()
              } else {
                familyMembers.value = []
                familyName.value = ''
              }
            }
          }
        } catch (err) {
          // 靜默失敗，避免干擾用戶
        }
      }
    }, 30000) // 每 30 秒檢查一次
  }
})
</script>

<template>
  <!-- 登入頁 -->
  <LoginPage 
    v-if="currentPage === 'login'" 
    @login-success="handleLoginSuccess"
    @go-to-register="currentPage = 'register'"
  />
  
  <!-- 註冊頁 -->
  <RegisterPage 
    v-else-if="currentPage === 'register'"
    @go-to-login="currentPage = 'login'"
  />
  
  <!-- 重設密碼 Modal -->
  <div v-if="showResetPasswordModal" class="reset-modal-overlay">
    <div class="reset-modal-card">
      <h2>🔐 重設密碼</h2>
      <p class="reset-hint">請輸入您的新密碼</p>
      <input v-model="newPassword" type="password" placeholder="新密碼" class="reset-input" :disabled="resetLoading" />
      <input v-model="confirmNewPassword" type="password" placeholder="確認新密碼" class="reset-input" :disabled="resetLoading" />
      <p v-if="resetMessage" :class="resetMessage.includes('✅') ? 'success-msg' : 'error-msg'">{{ resetMessage }}</p>
      <button @click="handleResetPassword" class="btn-reset-confirm" :disabled="resetLoading">
        {{ resetLoading ? '處理中...' : '確認重設' }}
      </button>
    </div>
  </div>
  
  <!-- 主頁面 -->
  <div v-else-if="currentPage === 'main'" class="app-background">
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">載入中...</span>
    </div>
    
    <div class="container">
      <div class="app-header">
        <div class="header-left">
          <h1 class="app-title">💰 {{ t('app_title') }}</h1>
          <span v-if="currentUser" class="user-info">
            👋 {{ currentUser.display_name }}
            <span v-if="currentUser.role === 'admin'" class="admin-badge">{{ t('admin') }}</span>
          </span>
        </div>
        <div class="header-actions">
          <select v-model="currentLocale" @change="setLocale(currentLocale)" class="lang-select">
            <option value="zh-TW">🇹🇼 中文</option>
            <option value="en-US">🇺🇸 English</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="ko">🇰🇷 한국어</option>
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="id">🇮🇩 Bahasa Ind</option>
            <option value="tl">🇵🇭 Filipino</option>
          </select>
          <button @click="toggleTheme" class="btn-theme" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">{{ isDarkMode ? '☀️' : '🌙' }}</button>
          <button v-if="currentUser" @click="showChangePasswordModal = true" class="btn-theme" title="修改密碼">🔑</button>
          <button v-if="currentUser?.role === 'user'" @click="generateInviteCode" class="btn-invite" :disabled="inviteLoading">
            {{ inviteLoading ? t('generating') : '🔗 ' + t('gen_invite_code') }}
          </button>
          <button v-if="currentUser?.role === 'admin'" @click="showJoinModal = true" class="btn-join">➕ {{ t('join_member') }}</button>
          <button v-if="currentUser?.role === 'admin'" @click="showUserManager = true" class="btn-manage">👥 {{ t('manage') }}</button>
          <button @click="handleLogout" class="btn-logout">🚪 {{ t('logout') }}</button>
        </div>
      </div>

      <!-- 邀請碼 Modal -->
      <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
        <div class="modal-card">
          <h2>🔗 {{ t('your_invite_code') }}</h2>
          <div class="invite-code-display">{{ inviteCode }}</div>
          <p class="invite-hint">{{ t('invite_code_hint') }}</p>
          <p class="invite-expires">⏰ {{ t('invite_expires_hint') }}</p>
          <button @click="showInviteModal = false; stopFamilyPolling()" class="btn-modal-close">{{ t('close') }}</button>
        </div>
      </div>

      <!-- 加入成員 Modal -->
    <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
      <div class="modal-card">
        <h3>➕ {{ t('join_family_member') }}</h3>
        <input v-model="joinCode" type="text" :placeholder="t('enter_invite_code')" class="modal-input" />
        <p v-if="joinMessage" :class="joinMessage.includes('已將') ? 'success-msg' : 'error-msg'">{{ joinMessage }}</p>
        <div class="modal-actions">
          <button @click="acceptInviteCode" class="btn-confirm">{{ t('join') }}</button>
          <button @click="showJoinModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- 修改密碼 Modal -->
    <div v-if="showChangePasswordModal" class="modal-overlay" @click.self="showChangePasswordModal = false">
      <div class="modal-card">
        <h3>🔑 {{ t('change_password') }}</h3>
        <div class="change-pw-form">
          <input v-model="oldPassword" type="password" :placeholder="t('old_password_ph')" class="modal-input" />
          <input v-model="newPassword2" type="password" :placeholder="t('new_password_ph')" class="modal-input" />
          <input v-model="confirmNewPassword2" type="password" :placeholder="t('confirm_password_ph')" class="modal-input" />
        </div>
        <p v-if="pwMessage" :class="pwMessage.includes('✅') ? 'success-msg' : 'error-msg'">{{ pwMessage }}</p>
        <div class="modal-actions">
          <button @click="handleUpdatePassword" class="btn-confirm" :disabled="pwLoading">
            {{ pwLoading ? '...' : t('save') }}
          </button>
          <button @click="showChangePasswordModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

      <!-- 使用者管理 Modal -->
      <div v-if="showUserManager" class="modal-overlay" @click.self="showUserManager = false">
        <UserManager 
          :currentUser="currentUser" 
          @close="showUserManager = false" 
          @refresh-user="refreshUser"
        />
      </div>

      <!-- 一般使用者：家庭狀態卡片 -->
      <div v-if="currentUser?.role === 'user' && currentUser?.family_id" class="family-card user">
        <div class="family-info">
          <span class="family-icon">🏠</span>
          <div class="family-text">
            <span class="family-label">{{ t('joined_family') }}</span>
            <span class="family-name">{{ displayFamilyName }}</span>
          </div>
        </div>
        <button @click="leaveFamily" class="btn-leave">🚪 {{ t('leave') }}</button>
      </div>

      <!-- 管理員帳本選擇器 (多選 checkbox) -->
      <div v-if="currentUser?.role === 'admin' && familyMembers.length > 0" class="family-card admin">
        <div class="family-card-header">
          <div class="family-info">
            <span class="family-icon">👨‍👩‍👧</span>
            <div class="family-text">
              <span class="family-label">{{ t('family_mgmt') }}</span>
              <span class="family-name">{{ displayFamilyName }}</span>
            </div>
          </div>
        </div>
        
        <!-- Multi-select filter -->
        <div class="family-filter-section">
          <label class="family-filter-label">📊 {{ t('filter_member_accounts') }}</label>
          <div class="member-checkboxes">
            <label class="member-checkbox-item select-all">
              <input 
                type="checkbox" 
                :checked="selectedUserIds.length === 0"
                @change="selectedUserIds = []"
              />
              <span>{{ t('all') }}</span>
            </label>
            <label 
              v-for="member in familyMembers" 
              :key="member.id" 
              class="member-checkbox-item"
              :class="{ selected: selectedUserIds.includes(member.id) }"
            >
              <input 
                type="checkbox" 
                :value="member.id"
                v-model="selectedUserIds"
              />
              <span class="checkbox-avatar">{{ member.display_name.charAt(0) }}</span>
              <span>{{ member.display_name }}</span>
              <span v-if="member.role === 'admin'" class="checkbox-badge" :title="t('admin')">👑</span>
            </label>
          </div>
        </div>
        
        <!-- Member management -->
        <div class="family-members-list">
          <div v-for="member in familyMembers" :key="member.id" class="member-chip">
            <span class="member-avatar">{{ member.display_name.charAt(0) }}</span>
            <span class="member-name">{{ member.display_name }}</span>
            <span v-if="member.role === 'admin'" class="member-badge">👑</span>
            <button v-if="member.id !== currentUser.id" @click="removeMember(member.id, member.display_name)" class="member-remove">×</button>
          </div>
        </div>
      </div>

      <!-- Stats Panel -->
      <StatsPanel 
        :stats="stats"
        :trendData="trendData"
        :budgetLimit="budgetLimit"
        :monthlyExpense="monthlyExpense"
        :totalAmount="totalAmount"
        :categories="categories"
        @update-budget="saveBudget"
        @import="handleImport"
        @export="exportExcel"
        @download-sample="downloadSample"
      />

      <!-- Quick Entry Templates -->
      <QuickEntry
        :currentUser="currentUser"
        :categories="categories"
        @use-template="useTemplate"
      />

      <!-- Transaction Form -->
      <TransactionForm
        ref="formRef"
        v-model:form="form"
        v-model:rateUpdatedAt="rateUpdatedAt"
        :categories="categories"
        :isEditing="isEditing"
        @submit="handleSubmit"
        @cancel="cancelEdit"
        @manage-categories="showCategoryManager = true"
        @manage-payment-methods="showPaymentMethodManager = true"
      />

      <!-- Transaction List -->
      <TransactionList
        :transactions="transactions"
        v-model:keyword="keyword"
        v-model:startDate="startDate"
        v-model:endDate="endDate"
        v-model:showCalendar="showCalendar"
        @edit="startEdit"
        @delete="removeTransaction"
        @duplicate="duplicateTransaction"
      >
        <template #calendar>
          <CalendarView v-if="showCalendar" :trendData="trendData" :locale="currentLocale" @date-selected="handleDateSelect" />
        </template>
      </TransactionList>
    </div>
    
    <CategoryManager 
      :show="showCategoryManager" 
      :categories="categories" 
      :currentUser="currentUser"
      @close="showCategoryManager = false" 
      @updated="fetchCategories" 
    />
    
    <PaymentMethodManager 
      :show="showPaymentMethodManager" 
      :paymentMethods="paymentMethods" 
      :currentUser="currentUser"
      @close="showPaymentMethodManager = false" 
      @updated="fetchPaymentMethods" 
    />
  </div>
</template>

<style scoped>
/* Reset */
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", Roboto, Arial, sans-serif; }

/* Theme Toggle Button */
.btn-theme { background: #e0e0e0; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
.btn-theme:hover { transform: scale(1.1); }

/* Loading Overlay */
.loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); }
.loading-spinner { width: 50px; height: 50px; border: 4px solid #e0e0e0; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { margin-top: 15px; color: #667eea; font-size: 1rem; font-weight: 500; }

/* Light Mode */
.app-background { min-height: 100vh; background-color: #f4f5f7; padding: 20px; transition: background-color 0.3s; }
.container { max-width: 1000px; margin: 0 auto; }
.app-header { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 25px; gap: 15px; }
.header-left { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.app-title { text-align: center; color: #333; font-size: 2.2rem; margin: 0; font-weight: 800; letter-spacing: 1px; }
.user-info { color: #666; font-size: 1rem; }
.admin-badge { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; margin-left: 8px; vertical-align: middle; }
.btn-logout { background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-logout:hover { background: #c0392b; transform: translateY(-2px); }

/* Header Actions */
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center; width: 100%; }
.btn-invite { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-invite:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4); }
.btn-join { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-join:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
.btn-manage { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-manage:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4); }

/* Language Selector */
.lang-select { padding: 6px 12px; border-radius: 20px; border: 1px solid #ddd; background-color: #fff; cursor: pointer; font-size: 0.9rem; outline: none; transition: all 0.3s; }
.lang-select:hover { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }

/* Modal */
.modal-overlay { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.6); 
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; z-index: 1000; 
  transition: all 0.3s;
}

.modal-card { 
  background: white; 
  border-radius: 20px; 
  padding: 35px; 
  max-width: 420px; 
  width: 90%; 
  text-align: center; 
  animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255,255,255,0.8);
}

@keyframes modalPop { 
  from { opacity: 0; transform: scale(0.9) translateY(20px); } 
  to { opacity: 1; transform: scale(1) translateY(0); } 
}

.modal-card h2, .modal-card h3 { 
  margin: 0 0 15px 0; 
  color: #2c3e50; 
  font-weight: 700;
  font-size: 1.5rem;
}

.invite-code-display { 
  font-size: 2.5rem; 
  font-weight: 800; 
  color: #11998e; 
  letter-spacing: 8px; 
  padding: 24px; 
  background: #f0fdf9; 
  border: 2px dashed #11998e;
  border-radius: 16px; 
  margin-bottom: 20px; 
  font-family: "Courier New", monospace; 
  text-shadow: 1px 1px 0px rgba(0,0,0,0.1);
}

.invite-hint { color: #666; font-size: 0.9rem; margin: 15px 0; line-height: 1.5; }
.invite-expires { color: #e67e22; font-size: 0.85rem; font-weight: 600; background: #fff3e0; padding: 4px 10px; border-radius: 10px; display: inline-block; margin-top: 5px; }

.invite-input { 
  width: 100%; 
  padding: 16px; 
  font-size: 1.4rem; 
  text-align: center; 
  letter-spacing: 5px; 
  border: 2px solid #e0e0e0; 
  border-radius: 14px; 
  margin-bottom: 20px; 
  text-transform: uppercase; 
  transition: all 0.3s;
  background: #f8f9fa;
}
.invite-input:focus { border-color: #667eea; outline: none; background: white; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15); }

.modal-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  margin-bottom: 20px;
  transition: all 0.3s;
}
.modal-input:focus {
  border-color: #667eea;
  outline: none;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
}

.modal-actions { display: flex; gap: 12px; justify-content: center; margin-top: 10px; }

.btn-modal-close { 
  background: #f1f2f6; 
  color: #2d3436; 
  border: none; 
  padding: 12px 24px; 
  border-radius: 12px; 
  cursor: pointer; 
  font-size: 0.95rem; 
  font-weight: 600;
  transition: all 0.2s;
}
.btn-modal-close:hover { background: #dfe4ea; transform: translateY(-1px); }

.btn-confirm { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  color: white; 
  border: none; 
  padding: 12px 24px; 
  border-radius: 12px; 
  cursor: pointer; 
  font-size: 0.95rem; 
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
}
.btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(102, 126, 234, 0.3); }

.btn-cancel { 
  background: #f1f2f6; 
  color: #2d3436; 
  border: none; 
  padding: 12px 24px; 
  border-radius: 12px; 
  cursor: pointer; 
  font-size: 0.95rem; 
  font-weight: 600;
  transition: all 0.2s;
}
.btn-cancel:hover { background: #dfe4ea; }

.success-msg { color: #00b894; font-weight: bold; background: rgba(0, 184, 148, 0.1); padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; display: inline-block;}
.error-msg { color: #ff7675; font-weight: bold; background: rgba(255, 118, 117, 0.1); padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; display: inline-block;}


/* Family Card */
.family-card { border-radius: 16px; padding: 20px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 15px; }
.family-card.user { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); flex-direction: row; justify-content: space-between; align-items: center; }
.family-card.admin { background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); }
.family-card-header { margin-bottom: 5px; }
.family-info { display: flex; align-items: center; gap: 12px; }
.family-icon { font-size: 2rem; flex-shrink: 0; }
.family-text { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.family-label { color: rgba(0,0,0,0.6); font-size: 0.8rem; margin-bottom: 2px; }
.family-name { color: #2d3436; font-weight: bold; font-size: 1.1rem; line-height: 1.2; word-break: break-all; }
.btn-leave { background: rgba(255,255,255,0.6); color: #2d3436; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.3s; white-space: nowrap; }
.btn-leave:hover { background: rgba(255,255,255,0.9); color: #d63031; }
.family-selector-row { margin-bottom: 10px; }
.family-select { width: 100%; padding: 12px 15px; border: none; border-radius: 12px; font-size: 1rem; cursor: pointer; background: rgba(255,255,255,0.7); color: #2d3436; }
.family-members-list { display: flex; flex-wrap: wrap; gap: 8px; }
.member-chip { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.7); padding: 6px 12px; border-radius: 20px; }
.member-avatar { width: 26px; height: 26px; background: linear-gradient(135deg, #fd79a8 0%, #a29bfe 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: bold; }
.member-name { color: #2d3436; font-size: 0.9rem; }
.member-badge { font-size: 0.8rem; }
.member-remove { background: transparent; color: #636e72; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.member-remove:hover { background: #ff7675; color: white; }

/* Reset Password Modal */
.reset-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.reset-modal-card { background: white; border-radius: 20px; padding: 40px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.reset-modal-card h2 { margin: 0 0 10px 0; color: #2d3436; font-size: 1.5rem; }
.reset-hint { color: #636e72; margin-bottom: 25px; font-size: 0.95rem; }
.reset-input { width: 100%; padding: 14px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 1rem; margin-bottom: 12px; transition: border-color 0.3s; }
.reset-input:focus { border-color: #667eea; outline: none; }
.btn-reset-confirm { width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: bold; margin-top: 10px; transition: all 0.3s; }
.btn-reset-confirm:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
.btn-reset-confirm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* Family Multi-Select Filter */
.family-filter-section { margin-bottom: 15px; }
.family-filter-label { display: block; font-size: 0.85rem; color: rgba(0,0,0,0.6); margin-bottom: 8px; }
.member-checkboxes { display: flex; flex-wrap: wrap; gap: 8px; }
.member-checkbox-item { 
  display: flex; align-items: center; gap: 6px; 
  background: rgba(255,255,255,0.6); padding: 6px 12px; border-radius: 20px; 
  cursor: pointer; transition: all 0.2s; font-size: 0.9rem;
}
.member-checkbox-item:hover { background: rgba(255,255,255,0.9); }
.member-checkbox-item.selected { background: rgba(102, 126, 234, 0.3); }
.member-checkbox-item.select-all { background: rgba(255,255,255,0.8); font-weight: bold; }
.member-checkbox-item input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.checkbox-avatar { 
  width: 22px; height: 22px; 
  background: linear-gradient(135deg, #fd79a8 0%, #a29bfe 100%); 
  border-radius: 50%; display: flex; align-items: center; justify-content: center; 
  color: white; font-size: 0.65rem; font-weight: bold; 
}
.checkbox-badge { font-size: 0.7rem; }

/* Responsive */
@media (max-width: 600px) {
  .app-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-start; }
}

/* Dark Mode */
:global(.dark) .app-background { background-color: #1a1a2e; }
:global(.dark) .app-title { color: #e0e0e0; }
:global(.dark) .user-info { color: #a0a0a0; }
:global(.dark) .modal-card { background: #16213e; }
:global(.dark) .modal-card h2 { color: #e0e0e0; }
:global(.dark) .invite-code-display { background: #2d3748; color: #00b894; }
:global(.dark) .invite-hint { color: #a0a0a0; }
:global(.dark) .invite-input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
:global(.dark) .btn-theme { background: #2d3748; }
:global(.dark) .lang-select { background-color: #2d3748; border-color: #4a5568; color: #fff; }
:global(.dark) .family-card.user { background: linear-gradient(135deg, #4a3f35 0%, #6d4c41 100%); }
:global(.dark) .family-card.admin { background: linear-gradient(135deg, #3d3a50 0%, #2c3e50 100%); }
:global(.dark) .family-label { color: rgba(255,255,255,0.7); }
:global(.dark) .family-name { color: #f5f5f5; }
:global(.dark) .family-select { background: rgba(0,0,0,0.3); color: #f5f5f5; }
:global(.dark) .member-chip { background: rgba(0,0,0,0.3); }
:global(.dark) .member-name { color: #f5f5f5; }
:global(.dark) .btn-leave { background: rgba(0,0,0,0.3); color: #f5f5f5; }
</style>
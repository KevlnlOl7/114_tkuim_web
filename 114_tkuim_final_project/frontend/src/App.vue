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
import AssetsDashboard from './components/AssetsDashboard.vue'
import StatsPanel from './components/StatsPanel.vue'
import QuickEntry from './components/QuickEntry.vue'
import CategoryBudgetPanel from './components/CategoryBudgetPanel.vue'
import RecurringManager from './components/RecurringManager.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import { t, currentLocale, setLocale } from './i18n.js'
import LedgerSettingsModal from './components/LedgerSettingsModal.vue'

// --- Auth State ---
const currentPage = ref('login')
const isLoggedIn = ref(false)
const currentUser = ref(null)
const showUserManager = ref(false)
const showCategoryManager = ref(false)
const showPaymentMethodManager = ref(false)
const showLedgerSettingsModal = ref(false)

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
const startDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const endDate = ref(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10))
const showCalendar = ref(false)
const calendarSelectedDate = ref(null)

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

// --- Family/Invite State (Deprecated / Removed) ---
const showInviteModal = ref(false) // Leftover if needed for something else, but mostly unused now
const inviteCode = ref('')
const inviteExpires = ref('')
const inviteLoading = ref(false)
const showJoinModal = ref(false)
const joinCode = ref('')
const joinMessage = ref('')
// const familyMembers = ref([]) -> Removed
// const familyName = ref('') -> Removed
const selectedUserIds = ref([]) // Still used for filtering by member

// --- Rename User State ---
const showRenameUserModal = ref(false)
const newDisplayName = ref('')
const renameUserLoading = ref(false)
const renameUserMessage = ref('')

// --- Rename Family State (Legacy - kept for template compatibility) ---
const showRenameFamilyModal = ref(false)
const newFamilyName = ref('')
const renameFamilyLoading = ref(false)
const renameFamilyMessage = ref('')

// --- Ledger State ---
const ledgers = ref([])
const activeLedgerId = ref(localStorage.getItem('active_ledger_id') || 'all')
const showCreateLedgerModal = ref(false)
const newLedgerName = ref('')
const newLedgerType = ref('personal')
const createLedgerLoading = ref(false)

// --- Toast Notification ---
const toast = ref({ show: false, message: '', type: 'info' })
const showToast = (msg, type = 'info') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// --- Auth Functions ---
const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    currentUser.value = JSON.parse(savedUser)
    currentPage.value = 'main'
    fetchLedgers()
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
  fetchLedgers()
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
    
    const listRes = await axios.get(`/api/transactions${filterQuery}`)
    transactions.value = listRes.data 

    await fetchStats()
    
    const budgetRes = await axios.get('/api/budget')
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
  
  // ✅ NEW: 用戶篩選優先
  if (selectedUserIds.value.length > 0) {
    query += `&user_ids=${selectedUserIds.value.join(',')}`
  } else if (currentUser.value) {
    query += `&user_id=${currentUser.value.id}`
  }
  
  // 帳本篩選
  if (activeLedgerId.value && activeLedgerId.value !== 'all') {
    query += `&ledger_id=${activeLedgerId.value}`
  }
  
  return query
}





// --- 取得資料 ---
const fetchStats = async () => {
  try {
    const query = getFilterQuery()
    
    const [statRes, trendRes, accountRes] = await Promise.all([
      axios.get(`/api/dashboard/stats${query}`),
      axios.get(`/api/dashboard/trend${query}`),
      axios.get(`/api/dashboard/accounts${query}`)
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
    let url = '/api/categories'
    if (currentUser.value) url += `?user_id=${currentUser.value.id}`
    const res = await axios.get(url)
    categories.value = res.data
  } catch (err) { console.error(err) }
}

const fetchPaymentMethods = async () => {
  try {
    let url = '/api/payment-methods'
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
    target_account: form.value.target_account || null,
    ledger_id: activeLedgerId.value !== 'all' ? activeLedgerId.value : null
  }
  try {
    if (isEditing.value) {
      await axios.put(`/api/transactions/${editId.value}`, payload)
      cancelEdit()
    } else {
      await axios.post('/api/transactions', payload)
      resetForm()
    }
    fetchData()
  } catch (error) { 
    const detail = error.response?.data?.detail
    const msg = Array.isArray(detail) ? detail[0]?.msg : detail
    showToast(t('op_failed') + (msg ? ': ' + msg : ''), 'error')
    console.error("Operation failed", error)
  }
}

const removeTransaction = async (id) => {
  if (!confirm(t('confirm_delete'))) return
  try {
    await axios.delete(`/api/transactions/${id}`)
    showToast(t('delete_success') || '已刪除', 'success')
    fetchData()
  } catch (error) {
    showToast(t('op_failed') || '刪除失敗', 'error')
    console.error(error)
  }
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
    await axios.post('/api/budget', { limit: amount })
    budgetLimit.value = amount
    showToast("預算設定成功！", 'success')
  } catch (error) { showToast("設定失敗", 'error') }
}

// --- Import/Export ---
const exportExcel = async () => { 
  if (transactions.value.length < 1) {
    const msg = t('no_data_to_export') || '無資料可匯出，請先新增交易紀錄'


    showToast(msg, 'info')
    return
  }
  try {
    // ✅ NEW: 添加用戶篩選到匯出
    let url = '/api/export'
    if (selectedUserIds.value.length > 0) {
      url += `?user_ids=${selectedUserIds.value.join(',')}`
    }
    const res = await axios.get(url, { responseType: 'blob' })
    // 建立 Blob 下載連結
    const blobUrl = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', 'PyMoney_Export.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  } catch (error) {
    showToast('匯出失敗：' + (error.response?.data?.detail || error.message), 'error')
  }
}

const downloadSample = async () => {
  try {
    const res = await axios.get('/api/import/sample', {
      params: { format: 'xlsx' },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'PyMoney_Import_Sample.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    showToast('下載範例失敗：' + (error.response?.data?.detail || error.message), 'error')
  }
}

const handleImport = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  // Add ledger_id if a specific ledger is selected
  if (activeLedgerId.value && activeLedgerId.value !== 'all') {
    formData.append('ledger_id', activeLedgerId.value)
  }
  
  try {
    const res = await axios.post('/api/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    showToast(res.data.message, 'success')
    fetchData()
  } catch (error) {
    showToast("匯入失敗：" + (error.response?.data?.detail || error.message), 'error')
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

// Filter Logic (Modified for Ledger)
// ... keeping existing computed props ...

const monthlyExpense = computed(() => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  return transactions.value
    .filter(item => item.type === 'expense' && item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0)
})

const monthlyIncome = computed(() => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  return transactions.value
    .filter(item => item.type === 'income' && item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0)
})

const monthlyBalance = computed(() => {
  return monthlyIncome.value - monthlyExpense.value
})

// --- Family Functions (REMOVED) ---
// ... family logic removed ...

const acceptInviteCode = async () => {
  if (!currentUser.value || !joinCode.value) return
  // This is now "Accept Ledger Invite"
  try {
    const res = await axios.post(
      `/api/invite/accept`,
      { code: joinCode.value }
    )
    joinMessage.value = res.data.message
    await fetchLedgers() // Refresh ledgers list
    await fetchAvailableUsers()  // ✅ NEW
    if (res.data.ledger_id) {
        selectLedger(res.data.ledger_id)
    }
    setTimeout(() => {
      showJoinModal.value = false
      joinCode.value = ''
      joinMessage.value = ''
    }, 2000)
  } catch (err) {
    joinMessage.value = err.response?.data?.detail || '邀請碼無效'
  }
}

const activeLedger = computed(() => {
  if (!activeLedgerId.value || activeLedgerId.value === 'all') return null
  return ledgers.value.find(l => l.id === activeLedgerId.value) || null
})

// ✅ NEW: 用戶篩選
const availableUsers = ref([])  // 可選擇的用戶列表

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
    const res = await axios.post('/api/auth/reset-password', {
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

// --- Refresh User (from API) ---
const refreshUser = async () => {
  if (!currentUser.value?.id) return
  try {
    const res = await axios.get(`/api/users/${currentUser.value.id}`)
    if (res.data) {
      currentUser.value = { ...currentUser.value, ...res.data }
      localStorage.setItem('user', JSON.stringify(currentUser.value))
    }
  } catch (err) {
    console.error('Failed to refresh user:', err)
  }
}

// --- Rename Family (Legacy - kept for template compatibility) ---
const handleRenameFamily = async () => {
  // This feature has been deprecated but the modal still exists in template
  // Just close the modal if someone triggers it
  renameFamilyMessage.value = '此功能已移除'
  setTimeout(() => {
    showRenameFamilyModal.value = false
    renameFamilyMessage.value = ''
  }, 1500)
}

// --- Rename User ---
const openRenameUserModal = () => {
  newDisplayName.value = currentUser.value.display_name
  renameUserMessage.value = ''
  showRenameUserModal.value = true
}

const handleRenameUser = async () => {
  renameUserMessage.value = ''
  
  if (!newDisplayName.value.trim()) {
    renameUserMessage.value = '❌ ' + (t('enter_valid_name') || '請輸入有效名稱')
    return
  }
  
  renameUserLoading.value = true
  
  try {
    const res = await axios.put('/api/users/profile', {
      display_name: newDisplayName.value.trim()
    })
    
    // Update local state
    currentUser.value.display_name = res.data.display_name
    localStorage.setItem('user', JSON.stringify(currentUser.value))
    
    renameUserMessage.value = '✅ ' + (t('update_success') || '更新成功')
    setTimeout(() => {
      showRenameUserModal.value = false
      renameUserMessage.value = ''
    }, 1500)
  } catch (err) {
    renameUserMessage.value = '❌ ' + (err.response?.data?.detail || t('op_failed'))
  } finally {
    renameUserLoading.value = false
  }
}

// --- Ledger Functions ---
const fetchLedgers = async () => {
  try {
    const res = await axios.get('/api/ledgers')
    ledgers.value = res.data.map(l => ({ id: l.id, name: l.name, members: l.members, owner_id: l.owner_id }))
  } catch (err) {
    console.error(err)
  }
}

// ✅ NEW: 獲取可選擇的用戶列表
const fetchAvailableUsers = async () => {
  try {
    // 如果是管理員，從交易中提取所有用戶
    if (currentUser.value?.role === 'admin') {
      const res = await axios.get('/api/family/members')
      availableUsers.value = res.data
    } else {
      // 一般用戶只能看到自己
      availableUsers.value = [currentUser.value]
    }
  } catch (err) {
    console.error(err)
    // Fallback: 至少顯示當前用戶
    if (currentUser.value) {
      availableUsers.value = [currentUser.value]
    }
  }
}

const createLedger = async () => {
  if (!newLedgerName.value.trim()) return
  
  createLedgerLoading.value = true
  try {
    const res = await axios.post('/api/ledgers', {
      name: newLedgerName.value.trim(),
      type: 'shared' // Always shared now? Or personal? Actually shared capability is default.
    })
    showCreateLedgerModal.value = false
    newLedgerName.value = ''
    newLedgerType.value = 'personal'
    await fetchLedgers()
    
    // Auto-select the new ledger if it's the first one or user explicitly created it
    if (res.data && res.data.id) {
       selectLedger(res.data.id)
    }
    
    showToast(t('create_success') || '帳本已建立', 'success')
  } catch (err) {
    showToast(err.response?.data?.detail || t('op_failed'), 'error')
  } finally {
    createLedgerLoading.value = false
  }
}

const selectLedger = (ledgerId) => {
  activeLedgerId.value = ledgerId
  localStorage.setItem('active_ledger_id', ledgerId)
  fetchData()
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
    await axios.post('/api/users/change-password', {
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

// --- Delete Account Logic (GitHub-style with password + email code) ---
const showDeleteAccountModal = ref(false)
const deleteConfirmUsername = ref('')
const deletePassword = ref('')
const deleteVerificationCode = ref('')
const deleteLoading = ref(false)
const deleteSendingCode = ref(false)
const deleteMessage = ref('')
const deleteCodeSent = ref(false)

const sendDeleteCode = async () => {
  deleteMessage.value = ''
  
  if (!deletePassword.value) {
    deleteMessage.value = '❌ ' + t('enter_password')
    return
  }
  
  deleteSendingCode.value = true
  
  try {
    await axios.post('/api/users/send-delete-code', {
      password: deletePassword.value
    })
    deleteMessage.value = '✅ ' + t('code_sent')
    deleteCodeSent.value = true
  } catch (err) {
    deleteMessage.value = '❌ ' + (err.response?.data?.detail || t('op_failed'))
  } finally {
    deleteSendingCode.value = false
  }
}

const handleDeleteAccount = async () => {
  deleteMessage.value = ''
  
  if (deleteConfirmUsername.value !== currentUser.value?.username) {
    deleteMessage.value = '❌ ' + t('username_mismatch')
    return
  }
  
  if (!deletePassword.value) {
    deleteMessage.value = '❌ ' + t('enter_password')
    return
  }
  
  if (!deleteVerificationCode.value) {
    deleteMessage.value = '❌ ' + t('enter_verification_code')
    return
  }
  
  deleteLoading.value = true
  
  try {
    await axios.delete('/api/users/me', {
      data: {
        password: deletePassword.value,
        delete_code: deleteVerificationCode.value
      }
    })
    deleteMessage.value = '✅ ' + t('account_deleted')
    setTimeout(() => {
      handleLogout()
    }, 1500)
  } catch (err) {
    deleteMessage.value = '❌ ' + (err.response?.data?.detail || t('op_failed'))
  } finally {
    deleteLoading.value = false
  }
}

const resetDeleteModal = () => {
  showDeleteAccountModal.value = false
  deleteConfirmUsername.value = ''
  deletePassword.value = ''
  deleteVerificationCode.value = ''
  deleteMessage.value = ''
  deleteCodeSent.value = false
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
    // if (currentUser.value?.family_id) { fetchFamilyMembers() } -> Removed

    // Sync user state periodically (keep alive / sync name changes)
    setInterval(async () => {
      if (currentUser.value && isLoggedIn.value) {
        try {
          const res = await axios.get(`/api/users/${currentUser.value.id}`)
          if (res.data) {
              currentUser.value = { ...currentUser.value, ...res.data }
              localStorage.setItem('user', JSON.stringify(currentUser.value))
          }
        } catch (err) {
          // Silent fail
        }
      }
    }, 30000)
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
  <div v-if="currentPage === 'main'" class="app-background">
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">載入中...</span>
    </div>
    
    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast-notification" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>

    <div class="container">
      <div class="app-header">
        <div class="header-left">
          <h1 class="app-title">💰 {{ t('app_title') }}</h1>
          <span v-if="currentUser" class="user-info">
            👋 {{ currentUser.display_name }}
            <button v-if="currentUser.username !== 'admin'" @click="openRenameUserModal" class="btn-edit-user" :title="t('edit_name')">✏️</button>
            <span v-if="currentUser.role === 'admin'" class="admin-badge">{{ t('admin') }}</span>
            <span v-else-if="currentUser.role === 'family_admin'" class="admin-badge family-admin-badge">{{ t('family_admin') }}</span>
          </span>
          
          <!-- Ledger Switcher -->
          <div class="ledger-switcher">
            <span class="ledger-icon">📚</span>
            <select v-if="ledgers.length > 0" v-model="activeLedgerId" @change="selectLedger(activeLedgerId)" class="ledger-select">
              <option value="all">{{ t('all_ledgers') }}</option>
              <option v-for="ledger in ledgers" :key="ledger.id" :value="ledger.id">
                {{ ledger.name }}
              </option>
            </select>
            <button v-if="activeLedgerId !== 'all'" @click="showLedgerSettingsModal = true" class="btn-settings" :title="t('ledger_settings')">⚙️</button>
            <button @click="showCreateLedgerModal = true" class="btn-add-ledger" :title="t('new_ledger')">+</button>
          </div>
          
          <!-- ✅ NEW: User Filter Selector -->
          <div v-if="currentUser?.role === 'admin' && availableUsers.length > 1" class="user-filter">
            <span class="filter-icon">👥</span>
            <select v-model="selectedUserIds" @change="refreshData" multiple class="user-select">
              <option value="" disabled>{{ t('select_users') || '選擇用戶' }}</option>
              <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                {{ user.display_name }}
              </option>
            </select>
            <button v-if="selectedUserIds.length > 0" @click="selectedUserIds = []; refreshData()" class="btn-clear-filter" :title="t('clear_filter') || '清除篩選'">✖</button>
          </div>
        </div>
        <div class="header-actions">
          <LanguageSelector />
          <button @click="toggleTheme" class="btn-theme" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">{{ isDarkMode ? '☀️' : '🌙' }}</button>
          <button v-if="currentUser" @click="showChangePasswordModal = true" class="btn-theme" :title="t('change_password')">🔑</button>
          
          <button v-if="currentUser" @click="showJoinModal = true" class="btn-join">🔗 {{ t('join_ledger') }}</button>
          <button v-if="currentUser?.role === 'admin'" @click="showUserManager = true" class="btn-manage">👥 {{ t('manage') }}</button>
          <button v-if="currentUser && currentUser.username !== 'admin'" @click="showDeleteAccountModal = true" class="btn-delete-account" :title="t('delete_account') || '刪除帳號'">🗑️</button>
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
          <button @click="showInviteModal = false" class="btn-modal-close">{{ t('close') }}</button>
        </div>
      </div>

      <!-- 加入成員 Modal -->
    <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
      <div class="modal-card">
        <h3>🔗 {{ t('join_ledger') }}</h3>
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

    <!-- 刪除帳號 Modal (GitHub-style with password + email code) -->
    <div v-if="showDeleteAccountModal" class="modal-overlay" @click.self="resetDeleteModal">
      <div class="modal-card delete-modal">
        <h3>⚠️ {{ t('delete_account_title') }}</h3>
        <p class="delete-warning">{{ t('delete_warning') }}</p>
        
        <!-- Step 1: Username -->
        <p class="delete-confirm-hint">{{ t('type_username_confirm') }} <strong>{{ currentUser?.username }}</strong></p>
        <input 
          v-model="deleteConfirmUsername" 
          type="text" 
          :placeholder="currentUser?.username"
          class="modal-input delete-input" 
          :disabled="deleteLoading"
        />
        
        <!-- Step 2: Password + Send Code -->
        <div class="delete-password-row">
          <input 
            v-model="deletePassword" 
            type="password" 
            :placeholder="t('enter_password')"
            class="modal-input delete-input" 
            :disabled="deleteLoading || deleteSendingCode"
          />
          <button 
            @click="sendDeleteCode" 
            class="btn-send-code"
            :disabled="deleteSendingCode || !deletePassword || deleteCodeSent"
          >
            {{ deleteSendingCode ? t('sending_code') : (deleteCodeSent ? '✓' : t('send_verification_code')) }}
          </button>
        </div>
        
        <!-- Step 3: Verification Code (only after code sent) -->
        <input 
          v-if="deleteCodeSent"
          v-model="deleteVerificationCode" 
          type="text" 
          :placeholder="t('enter_verification_code')"
          class="modal-input delete-input" 
          :disabled="deleteLoading"
          maxlength="6"
        />
        
        <p v-if="deleteMessage" :class="deleteMessage.includes('✅') ? 'success-msg' : 'error-msg'">{{ deleteMessage }}</p>
        
        <div class="modal-actions">
          <button 
            @click="handleDeleteAccount" 
            class="btn-danger" 
            :disabled="deleteLoading || deleteConfirmUsername !== currentUser?.username || !deletePassword || !deleteVerificationCode"
          >
            {{ deleteLoading ? '...' : t('confirm_delete_account') }}
          </button>
          <button @click="resetDeleteModal" class="btn-cancel">{{ t('cancel') }}</button>
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
    
    <!-- 更改使用者名稱 Modal -->
    <div v-if="showRenameUserModal" class="modal-overlay" @click.self="showRenameUserModal = false">
      <div class="modal-card">
        <h3>✏️ {{ t('edit_name') || '修改顯示名稱' }}</h3>
        <input 
          v-model="newDisplayName" 
          type="text" 
          :placeholder="t('enter_valid_name') || '輸入新的名稱'"
          class="modal-input" 
          :disabled="renameUserLoading"
          maxlength="20"
        />
        <p v-if="renameUserMessage" :class="renameUserMessage.includes('✅') ? 'success-msg' : 'error-msg'">{{ renameUserMessage }}</p>
        <div class="modal-actions">
          <button @click="handleRenameUser" class="btn-confirm" :disabled="renameUserLoading || !newDisplayName.trim()">
            {{ renameUserLoading ? '...' : t('save') }}
          </button>
          <button @click="showRenameUserModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- 更改家庭名稱 Modal -->
    <div v-if="showRenameFamilyModal" class="modal-overlay" @click.self="showRenameFamilyModal = false">
      <div class="modal-card">
        <h3>✏️ {{ t('rename_family') || '更改家庭名稱' }}</h3>
        <input 
          v-model="newFamilyName" 
          type="text" 
          :placeholder="t('enter_family_name') || '輸入新的家庭名稱'"
          class="modal-input" 
          :disabled="renameFamilyLoading"
          maxlength="50"
        />
        <p v-if="renameFamilyMessage" :class="renameFamilyMessage.includes('✅') ? 'success-msg' : 'error-msg'">{{ renameFamilyMessage }}</p>
        <div class="modal-actions">
          <button @click="handleRenameFamily" class="btn-confirm" :disabled="renameFamilyLoading || !newFamilyName.trim()">
            {{ renameFamilyLoading ? '...' : t('save') }}
          </button>
          <button @click="showRenameFamilyModal = false" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- 新增帳本 Modal -->
    <div v-if="showCreateLedgerModal" class="modal-overlay" @click.self="showCreateLedgerModal = false">
      <div class="modal-card">
        <h3>📚 {{ t('new_ledger') }}</h3>
        <input 
          v-model="newLedgerName" 
          type="text" 
          :placeholder="t('ledger_name') || '帳本名稱'"
          class="modal-input" 
          :disabled="createLedgerLoading"
          maxlength="50"
        />
        
        <div class="modal-actions">
          <button @click="createLedger" class="btn-confirm" :disabled="createLedgerLoading || !newLedgerName.trim()">
            {{ createLedgerLoading ? '...' : t('save') }}
          </button>
          <button @click="showCreateLedgerModal = false; newLedgerName = ''" class="btn-cancel">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

      <!-- Ledger Settings Modal -->
      <LedgerSettingsModal 
         v-if="showLedgerSettingsModal && activeLedger && activeLedger.id"
         :ledger="activeLedger" 
         :currentUser="currentUser"
         @close="showLedgerSettingsModal = false"
         @updated="fetchLedgers"
         @deleted="showLedgerSettingsModal = false; fetchLedgers();" 
         @switched="showLedgerSettingsModal = false;"
      />



      <!-- Empty State / Onboarding -->
      <div v-if="ledgers.length === 0" class="empty-state-container">
        <div class="empty-state-content">
          <div class="empty-icon">👋</div>
          <h2>{{ t('welcome_title') || '歡迎使用！' }}</h2>
          <p>{{ t('welcome_desc') || '請先建立您的第一個帳本開始記帳' }}</p>
          <button @click="showCreateLedgerModal = true" class="btn-primary-large">
             + {{ t('new_ledger') || '建立帳本' }}
          </button>
        </div>
      </div>

      <!-- Main Dashboard Content -->
      <div v-else>
        <!-- Assets Dashboard (New Phase 2) -->
        <AssetsDashboard 
          v-if="currentUser" 
          :currentUser="currentUser" 
          ref="assetsDashboardRef"
        />

        <!-- Stats Panel -->
        <StatsPanel 
          :stats="stats"
          :trendData="trendData"
          :budgetLimit="budgetLimit"
          :monthlyExpense="monthlyExpense"
          :totalAmount="totalAmount"
          :categories="categories"
          :transactions="transactions"
          :isDarkMode="isDarkMode"
          @update-budget="saveBudget"
          @import="handleImport"
          @export="exportExcel"
          @download-sample="downloadSample"
          @show-toast="showToast"
        />

        <!-- Category Budget Panel -->
        <CategoryBudgetPanel
          v-if="currentUser"
          :currentUser="currentUser"
          :categories="categories"
          @show-toast="showToast"
        />

        <!-- Recurring Transactions Manager -->
        <RecurringManager
          v-if="currentUser"
          :currentUser="currentUser"
          :categories="categories"
          :paymentMethods="paymentMethods"
          @show-toast="showToast"
          @refresh-data="fetchData"
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
          :paymentMethods="paymentMethods"
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
          :filterDate="calendarSelectedDate"
          @edit="startEdit"
          @delete="removeTransaction"
          @duplicate="duplicateTransaction"
        >
          <template #calendar>
            <CalendarView 
              v-if="showCalendar" 
              :trendData="trendData" 
              :locale="currentLocale" 
              :selectedDate="calendarSelectedDate"
              @date-selected="handleDateSelect" 
              @month-change="handleMonthChange"
            />
          </template>
        </TransactionList>
      </div>
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

/* Edit User Button */
.btn-edit-user { background: transparent; border: none; cursor: pointer; font-size: 0.8rem; padding: 2px 4px; border-radius: 4px; transition: all 0.2s; margin-left: 5px; opacity: 0.7; }
.btn-edit-user:hover { opacity: 1; transform: scale(1.1); background: rgba(0,0,0,0.1); }

/* Ledger Switcher */
.ledger-switcher { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 6px 10px; border-radius: 20px; margin-top: 8px; }
.ledger-icon { font-size: 1rem; }
.ledger-select { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 6px 10px; font-size: 0.85rem; cursor: pointer; min-width: 100px; }
.ledger-select:focus { outline: none; border-color: #667eea; }
.btn-add-ledger { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-add-ledger:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); }

/* Delete Account Button */
.btn-delete-account { background: #fee2e2; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.1rem; transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
.btn-delete-account:hover { background: #fecaca; transform: scale(1.1); }

/* Danger Button & Modal */
.btn-danger { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: all 0.3s; }
.btn-danger:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4); }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.delete-modal { border: 2px solid #fecaca; }
.delete-warning { color: #dc2626; font-weight: 600; background: #fef2f2; padding: 12px; border-radius: 8px; margin: 15px 0; }
.delete-confirm-hint { color: #666; margin-bottom: 10px; }
.delete-input { border-color: #fecaca !important; }
.delete-password-row { display: flex; gap: 10px; align-items: stretch; margin-bottom: 10px; }
.delete-password-row input { flex: 1; margin-bottom: 0; }
.btn-send-code { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s; white-space: nowrap; }
.btn-send-code:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3); }
.btn-send-code:disabled { opacity: 0.5; cursor: not-allowed; background: #ccc; }

/* Edit Family Button */
.btn-edit-family { background: transparent; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 6px; margin-left: 8px; border-radius: 4px; transition: all 0.2s; }
.btn-edit-family:hover { background: rgba(0,0,0,0.1); transform: scale(1.1); }

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
.family-admin-badge { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; }
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

/* Monthly Stats Mini Display */
.monthly-stats-mini {
  display: flex;
  gap: 12px;
  margin: 12px 0;
  padding: 12px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
}
.monthly-stats-mini .stat-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255,255,255,0.3);
}
.monthly-stats-mini .stat-label {
  display: block;
  font-size: 0.7rem;
  color: rgba(0,0,0,0.6);
  margin-bottom: 4px;
}
.monthly-stats-mini .stat-value {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
}
.monthly-stats-mini .stat-item.income .stat-value { color: #00b894; }
.monthly-stats-mini .stat-item.expense .stat-value { color: #d63031; }
.monthly-stats-mini .stat-item.balance.positive .stat-value { color: #00b894; }
.monthly-stats-mini .stat-item.balance.negative .stat-value { color: #d63031; }

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
:global(.dark) .date-range input { background: #2d3748; color: #e0e0e0; }

/* Toast Styles */
.toast-notification {
  position: fixed;
  top: 80px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  z-index: 99999;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.95;
}
.toast-notification.success { background: #2ecc71; }
.toast-notification.error { background: #e74c3c; }
.toast-notification.info { background: #3498db; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }

/* Ledger Type Select */
.ledger-type-select { display: flex; gap: 15px; margin: 15px 0; justify-content: center; }
.type-option { display: flex; align-items: center; gap: 5px; cursor: pointer; border: 1px solid #ddd; padding: 8px 12px; border-radius: 20px; transition: all 0.2s; }
.type-option:hover { background: #f0f0f0; }
.type-option input:checked + span { font-weight: bold; color: #667eea; }
.type-option:has(input:checked) { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }

/* Empty State */
.empty-state-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; text-align: center; }
.empty-state-content { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 500px; width: 100%; }
.empty-icon { font-size: 4rem; margin-bottom: 20px; }
.empty-state-content h2 { margin-bottom: 10px; color: #2c3e50; }
.empty-state-content p { color: #666; margin-bottom: 30px; }
.btn-primary-large { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 1.2rem; cursor: pointer; transition: all 0.3s; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
.btn-primary-large:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }

/* Dark Mode Empty State */
:global(.dark) .empty-state-content { background: #2d3748; color: #f5f5f5; }
:global(.dark) .empty-state-content h2 { color: #f5f5f5; }
:global(.dark) .empty-state-content p { color: #cbd5e0; }

.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-20px); }
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
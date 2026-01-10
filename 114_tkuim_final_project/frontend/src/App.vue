<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue'
import BarChart from './components/BarChart.vue'
import LoginPage from './components/LoginPage.vue'
import RegisterPage from './components/RegisterPage.vue'

// --- 頁面狀態 ---
const currentPage = ref('login') // 'login', 'register', 'main'
const isLoggedIn = ref(false)
const currentUser = ref(null)

const checkLoginStatus = () => {
  isLoggedIn.value = localStorage.getItem('isLoggedIn') === 'true'
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    currentUser.value = JSON.parse(savedUser)
    currentPage.value = 'main'
  }
}

const handleLoginSuccess = (user) => {
  isLoggedIn.value = true
  currentUser.value = user
  currentPage.value = 'main'
  fetchData()
}

const handleLogout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('user')
  isLoggedIn.value = false
  currentUser.value = null
  currentPage.value = 'login'
}

// --- 深色模式 ---
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

// 初始化主題
applyTheme()

// --- 變數 ---
const transactions = ref([])
const stats = ref({})
const trendData = ref({})
const budgetLimit = ref(0)


// 搜尋與篩選
const keyword = ref('')
const startDate = ref('')
const endDate = ref('')

// 編輯相關
const isEditing = ref(false)
const editId = ref(null)

// 預算設定
const showBudgetInput = ref(false)
const newBudget = ref(0)

// 檔案上傳 ref
const fileInput = ref(null) 

// 表單
const form = ref({
  title: '', amount: '', category: 'Food',
  date: new Date().toISOString().split('T')[0],
  type: 'expense', payment_method: 'Cash'
})

const accountBalances = ref([]) // 帳戶餘額

// --- 邀請碼相關 ---
const showInviteModal = ref(false)
const inviteCode = ref('')
const inviteExpires = ref('')
const inviteLoading = ref(false)
const showJoinModal = ref(false)
const joinCode = ref('')
const joinMessage = ref('')

const generateInviteCode = async () => {
  if (!currentUser.value) return
  inviteLoading.value = true
  try {
    const res = await axios.post(`http://127.0.0.1:8000/api/invite/generate?user_id=${currentUser.value.id}`)
    inviteCode.value = res.data.code
    inviteExpires.value = res.data.expires_at
    showInviteModal.value = true
    // 開始輪詢檢查是否已加入家庭
    startFamilyPolling()
  } catch (err) {
    alert('產生邀請碼失敗')
  } finally {
    inviteLoading.value = false
  }
}

// 輪詢檢查家庭狀態
let pollingInterval = null
const startFamilyPolling = () => {
  pollingInterval = setInterval(async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/users/${currentUser.value.id}`)
      if (res.data.family_id) {
        // 已加入家庭！更新本地狀態
        currentUser.value.family_id = res.data.family_id
        localStorage.setItem('user', JSON.stringify(currentUser.value))
        showInviteModal.value = false
        stopFamilyPolling()
        alert('🎉 已成功加入家庭！')
        fetchFamilyMembers()
      }
    } catch (err) {
      console.log('檢查狀態失敗')
    }
  }, 3000) // 每 3 秒檢查一次
}

const stopFamilyPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
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
    // 重新載入家庭成員
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

// --- 家庭帳本切換 (管理員) ---
const familyMembers = ref([])
const familyName = ref('')
const selectedUserId = ref('') // 空字串 = 查看全部

const fetchFamilyMembers = async () => {
  if (!currentUser.value?.family_id) return
  try {
    const res = await axios.get(`http://127.0.0.1:8000/api/family/members/${currentUser.value.family_id}`)
    familyMembers.value = res.data.members
    familyName.value = res.data.family_name
  } catch (err) {
    console.log('尚未加入家庭或無成員')
  }
}

// 使用者離開家庭
const leaveFamily = async () => {
  if (!confirm('確定要離開這個家庭嗎？')) return
  try {
    await axios.post(`http://127.0.0.1:8000/api/family/leave?user_id=${currentUser.value.id}`)
    alert('已離開家庭')
    // 更新本地狀態
    currentUser.value.family_id = null
    localStorage.setItem('user', JSON.stringify(currentUser.value))
    familyMembers.value = []
    familyName.value = ''
  } catch (err) {
    alert(err.response?.data?.detail || '離開失敗')
  }
}

// 管理員移除成員
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

// --- API ---
const fetchData = async () => {
  try {
    let url = `http://127.0.0.1:8000/api/transactions?keyword=${keyword.value}`
    if (startDate.value) url += `&start_date=${startDate.value}`
    if (endDate.value) url += `&end_date=${endDate.value}`
    // 管理員可以查看特定成員的帳本
    if (selectedUserId.value) url += `&user_id=${selectedUserId.value}`
    
    const listRes = await axios.get(url)
    transactions.value = listRes.data 

    const statsRes = await axios.get('http://127.0.0.1:8000/api/dashboard/stats')
    stats.value = statsRes.data
    const trendRes = await axios.get('http://127.0.0.1:8000/api/dashboard/trend')
    trendData.value = trendRes.data
    
    const budgetRes = await axios.get('http://127.0.0.1:8000/api/budget')
    budgetLimit.value = budgetRes.data.limit
    const accountRes = await axios.get('http://127.0.0.1:8000/api/dashboard/accounts')
    accountBalances.value = accountRes.data
  } catch (error) { console.error(error) }
}

const handleSubmit = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入完整資訊")
  const payload = { ...form.value, amount: Number(form.value.amount) }
  try {
    if (isEditing.value) {
      await axios.put(`http://127.0.0.1:8000/api/transactions/${editId.value}`, payload)
      cancelEdit()
    } else {
      await axios.post('http://127.0.0.1:8000/api/transactions', payload)
      resetForm()
    }
    fetchData()
  } catch (error) { alert("操作失敗") }
}

const removeTransaction = async (id) => {
  if(!confirm("確定要刪除嗎？")) return;
  await axios.delete(`http://127.0.0.1:8000/api/transactions/${id}`)
  fetchData()
}

const saveBudget = async () => {
  try {
    await axios.post('http://127.0.0.1:8000/api/budget', { limit: Number(newBudget.value) })
    budgetLimit.value = Number(newBudget.value)
    showBudgetInput.value = false
    alert("預算設定成功！")
  } catch (error) { alert("設定失敗") }
}
const toggleBudgetEdit = () => {
  newBudget.value = budgetLimit.value
  showBudgetInput.value = !showBudgetInput.value
}

const startEdit = (item) => {
  isEditing.value = true
  editId.value = item.id
  form.value = { ...item }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const cancelEdit = () => { isEditing.value = false; editId.value = null; resetForm() }
const resetForm = () => {
  form.value = {
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense', payment_method: 'Cash'
  }
}

// 匯出
const exportExcel = () => { window.open('http://127.0.0.1:8000/api/export', '_blank') }

// 觸發檔案選擇框
const triggerFileInput = () => {
  fileInput.value.click()
}

// 執行匯入
const handleImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await axios.post('http://127.0.0.1:8000/api/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    alert(res.data.message)
    fetchData() // 匯入後重新抓資料
  } catch (error) {
    console.error(error)
    alert("匯入失敗：" + (error.response?.data?.detail || error.message))
  }
  // 清空 input 讓同一檔案可以再選一次
  event.target.value = ''
}

watch([keyword, startDate, endDate, selectedUserId], () => { fetchData() })

const totalAmount = computed(() => {
  return transactions.value.reduce((sum, item) => {
    if (item.type === 'income') return sum + item.amount
    if (item.type === 'expense') return sum - item.amount
    return sum
  }, 0)
})

const monthlyExpense = computed(() => {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  return transactions.value
    .filter(item => item.type === 'expense' && item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0)
})

const budgetPercent = computed(() => {
  if (budgetLimit.value === 0) return 0
  const p = (monthlyExpense.value / budgetLimit.value) * 100
  return Math.min(p, 100)
})

onMounted(() => {
  checkLoginStatus()
  if (isLoggedIn.value) {
    fetchData()
    // 載入家庭成員列表 (有加入家庭的話)
    if (currentUser.value?.family_id) {
      fetchFamilyMembers()
    }
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
  
  <!-- 主頁面 -->
  <div v-else class="app-background">
    <div class="container">
      <div class="app-header">
        <div class="header-left">
          <h1 class="app-title">💰 PyMoney 記帳本</h1>
          <span v-if="currentUser" class="user-info">
            👋 {{ currentUser.display_name }}
            <span v-if="currentUser.role === 'admin'" class="admin-badge">管理員</span>
          </span>
        </div>
        <div class="header-actions">
          <!-- 深色模式切換 -->
          <button @click="toggleTheme" class="btn-theme">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <!-- 一般成員：產生邀請碼 -->
          <button v-if="currentUser?.role === 'user'" @click="generateInviteCode" class="btn-invite" :disabled="inviteLoading">
            {{ inviteLoading ? '產生中...' : '🔗 產生邀請碼' }}
          </button>
          <!-- 管理員：輸入邀請碼 -->
          <button v-if="currentUser?.role === 'admin'" @click="showJoinModal = true" class="btn-join">
            ➕ 加入成員
          </button>
          <button @click="handleLogout" class="btn-logout">🚪 登出</button>
        </div>
      </div>

      <!-- 邀請碼 Modal (一般成員) -->
      <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
        <div class="modal-card">
          <h2>🔗 你的邀請碼</h2>
          <div class="invite-code-display">{{ inviteCode }}</div>
          <p class="invite-hint">請將此邀請碼告訴家庭管理員</p>
          <p class="invite-expires">⏰ 有效期限 10 分鐘（等待管理員輸入...）</p>
          <button @click="showInviteModal = false; stopFamilyPolling()" class="btn-modal-close">關閉</button>
        </div>
      </div>

      <!-- 輸入邀請碼 Modal (管理員) -->
      <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
        <div class="modal-card">
          <h2>➕ 加入家庭成員</h2>
          <input v-model="joinCode" type="text" placeholder="輸入成員的邀請碼" class="invite-input" />
          <p v-if="joinMessage" :class="joinMessage.includes('已將') ? 'success-msg' : 'error-msg'">{{ joinMessage }}</p>
          <div class="modal-actions">
            <button @click="acceptInviteCode" class="btn-confirm">確認加入</button>
            <button @click="showJoinModal = false" class="btn-cancel">取消</button>
          </div>
        </div>
      </div>

      <!-- 一般使用者：家庭狀態卡片 -->
      <div v-if="currentUser?.role === 'user' && currentUser?.family_id" class="family-card user">
        <div class="family-info">
          <span class="family-icon">🏠</span>
          <div class="family-text">
            <span class="family-label">已加入家庭</span>
            <span class="family-name">{{ familyName || '家庭帳本' }}</span>
          </div>
        </div>
        <button @click="leaveFamily" class="btn-leave">🚪 退出</button>
      </div>

      <!-- 管理員帳本選擇器 + 成員管理 -->
      <div v-if="currentUser?.role === 'admin' && familyMembers.length > 0" class="family-card admin">
        <div class="family-card-header">
          <div class="family-info">
            <span class="family-icon">👨‍👩‍👧</span>
            <div class="family-text">
              <span class="family-label">家庭管理</span>
              <span class="family-name">{{ familyName || '我的家庭' }}</span>
            </div>
          </div>
        </div>
        <div class="family-selector-row">
          <select v-model="selectedUserId" class="family-select">
            <option value="">📊 查看全部成員帳目</option>
            <option v-for="member in familyMembers" :key="member.id" :value="member.id">
              {{ member.display_name }}
            </option>
          </select>
        </div>
        <div class="family-members-list">
          <div v-for="member in familyMembers" :key="member.id" class="member-chip">
            <span class="member-avatar">{{ member.display_name.charAt(0) }}</span>
            <span class="member-name">{{ member.display_name }}</span>
            <span v-if="member.role === 'admin'" class="member-badge">👑</span>
            <button 
              v-if="member.id !== currentUser.id" 
              @click="removeMember(member.id, member.display_name)" 
              class="member-remove"
            >×</button>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card budget-card full-width-card">
          <div class="budget-header">
            <h3>📅 本月預算 ({{ new Date().getMonth() + 1 }}月)</h3>
            <button @click="toggleBudgetEdit" class="btn-sm">⚙️ 設定</button>
          </div>
          <div v-if="showBudgetInput" class="budget-input-area">
            <input v-model="newBudget" type="number" placeholder="輸入預算金額" />
            <button @click="saveBudget" class="btn-confirm">儲存</button>
          </div>
          <div v-else class="budget-display">
            <div class="budget-info">
              <span>已花費: <b>${{ monthlyExpense }}</b></span>
              <span>預算: ${{ budgetLimit }}</span>
            </div>
            <div class="progress-container">
              <div class="progress-bar" :style="{ width: budgetPercent + '%', backgroundColor: monthlyExpense > budgetLimit ? '#ff7675' : '#74b9ff' }"></div>
            </div>
            <p v-if="monthlyExpense > budgetLimit" class="warning-text">⚠️ 已經超支了！請節制一點！</p>
            <p v-else class="safe-text">✨ 還有 ${{ budgetLimit - monthlyExpense }} 可以花</p>
          </div>
        </div>

        <div class="card balance-card">
          <h3>目前淨資產</h3>
          <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">${{ totalAmount }}</h2>
          
          <div class="button-group">
             <input type="file" ref="fileInput" @change="handleImport" accept=".xlsx,.xls,.csv" style="display: none" />
            
            <button @click="triggerFileInput" class="btn-outline">📥 匯入資料</button>
            <button @click="exportExcel" class="btn-outline">📤 匯出 Excel</button>
          </div>
        </div>

        <div class="card chart-card">
          <Chart :stats="stats" />
        </div>
        
        <div class="card bar-chart-card full-width-card">
          <BarChart :trendData="trendData" />
        </div>
      </div>

      <div class="card form-card" :class="{ 'edit-mode': isEditing }">
        <div class="form-header">
          <h3>{{ isEditing ? '✏️ 修改紀錄' : '📝 新增一筆' }}</h3>
          <button v-if="isEditing" @click="cancelEdit" class="btn-sm">取消</button>
        </div>
        
        <div class="form-body">
          <div class="form-row">
            <div class="input-group">
              <label>類型</label>
              <select v-model="form.type">
                <option value="expense">支出 💸</option>
                <option value="income">收入 💰</option>
                <option value="transfer">轉帳 🔄</option>
              </select>
            </div>
            <div class="input-group">
              <label>日期</label>
              <input v-model="form.date" type="date" required />
            </div>
            <div class="input-group">
              <label>支付/帳戶</label>
              <select v-model="form.payment_method">
                <option value="Cash">現金</option>
                <option value="Credit Card">信用卡</option>
                <option value="Bank">銀行帳戶</option>
                <option value="LinePay">LinePay</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group flex-2">
              <label>項目說明</label>
              <input v-model="form.title" placeholder="例如: 提款、午餐" required />
            </div>
            <div class="input-group">
              <label>金額</label>
              <input v-model="form.amount" type="number" placeholder="$" required />
            </div>
          </div>
          <div class="form-row" v-if="form.type !== 'transfer'">
            <div class="input-group flex-full">
              <label>分類</label>
              <select v-model="form.category">
                <option value="Food">🍔 食物</option>
                <option value="Transport">🚌 交通</option>
                <option value="Entertainment">🎬 娛樂</option>
                <option value="Rent">🏠 房租</option>
                <option value="Salary">💼 薪水</option>
                <option value="Other">✨ 其他</option>
              </select>
            </div>
          </div>
          <button @click="handleSubmit" class="btn-submit" :class="{ 'btn-update': isEditing }">
            {{ isEditing ? '完成修改' : '確認新增' }}
          </button>
        </div>
      </div>

      <div class="list-section">
        <div class="filter-bar">
          <div class="search-box">
            <input v-model="keyword" type="text" placeholder="🔍 關鍵字..." />
          </div>
          <div class="date-range">
            <input v-model="startDate" type="date" />
            <span>至</span>
            <input v-model="endDate" type="date" />
          </div>
        </div>
        <div v-if="transactions.length === 0" class="empty-state">無資料...</div>
        <div v-else class="transaction-list">
          <div v-for="item in transactions" :key="item.id" class="list-item">
            <div class="item-left">
              <div class="date-badge">
                <span class="day">{{ item.date.split('-')[2] }}</span>
                <span class="month">{{ item.date.split('-')[1] }}月</span>
              </div>
              <div class="item-info">
                <div class="item-title">{{ item.title }}</div>
                <div class="tags">
                  <span class="tag type-tag" :class="item.type">
                    {{ item.type === 'transfer' ? '轉帳' : item.category }}
                  </span>
                  <span class="tag method">{{ item.payment_method }}</span>
                </div>
              </div>
            </div>
            <div class="item-right">
              <span class="amount" :class="item.type">
                {{ item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '') }} ${{ item.amount }}
              </span>
              <div class="actions">
                <button @click="startEdit(item)" class="btn-icon">✎</button> 
                <button @click="removeTransaction(item.id)" class="btn-icon del">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reset */
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", Roboto, Arial, sans-serif; }

/* Theme Toggle Button */
.btn-theme { background: #e0e0e0; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
.btn-theme:hover { transform: scale(1.1); }

/* Light Mode (Default) */
.app-background { min-height: 100vh; background-color: #f4f5f7; padding: 20px; transition: background-color 0.3s; }
.container { max-width: 800px; margin: 0 auto; }
.app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; flex-direction: column; gap: 5px; }
.app-title { text-align: left; color: #333; font-size: 1.8rem; margin: 0; }
.user-info { color: #666; font-size: 0.9rem; }
.admin-badge { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-left: 8px; }
.btn-logout { background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-logout:hover { background: #c0392b; transform: translateY(-2px); }

/* Header Actions */
.header-actions { display: flex; gap: 10px; align-items: center; }
.btn-invite { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-invite:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4); }
.btn-join { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-join:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; border-radius: 16px; padding: 30px; max-width: 400px; width: 90%; text-align: center; animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-card h2 { margin: 0 0 20px 0; color: #2c3e50; }
.invite-code-display { font-size: 2.5rem; font-weight: bold; color: #11998e; letter-spacing: 8px; padding: 20px; background: #f8f9fa; border-radius: 12px; margin-bottom: 15px; font-family: monospace; }
.invite-hint { color: #666; font-size: 0.9rem; margin: 10px 0; }
.invite-expires { color: #e67e22; font-size: 0.85rem; }
.invite-input { width: 100%; padding: 15px; font-size: 1.2rem; text-align: center; letter-spacing: 5px; border: 2px solid #e0e0e0; border-radius: 10px; margin-bottom: 15px; text-transform: uppercase; }
.invite-input:focus { border-color: #667eea; outline: none; }
.modal-actions { display: flex; gap: 10px; justify-content: center; }
.btn-modal-close { background: #e0e0e0; color: #333; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.btn-confirm { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.btn-cancel { background: #e0e0e0; color: #333; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.success-msg { color: #27ae60; font-weight: bold; }
.error-msg { color: #e74c3c; }

/* Account Book Selector */
.account-selector-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.account-selector-card label { color: white; font-weight: bold; font-size: 1rem; white-space: nowrap; }
.account-select { flex: 1; padding: 10px 15px; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; background: white; color: #333; }
.account-select:focus { outline: 2px solid white; }

/* ========== Unified Family Card (Warm Colors) ========== */
.family-card { 
  border-radius: 16px; 
  padding: 20px; 
  margin-bottom: 15px; 
  display: flex; 
  flex-direction: column;
  gap: 15px;
}

/* User Card - Warm Peach */
.family-card.user { 
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); 
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

/* Admin Card - Soft Lavender */
.family-card.admin { 
  background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%); 
}

.family-card-header { margin-bottom: 5px; }
.family-info { display: flex; align-items: center; gap: 12px; }
.family-icon { font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); }
.family-text { display: flex; flex-direction: column; }
.family-label { color: rgba(0,0,0,0.6); font-size: 0.8rem; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
.family-name { color: #2d3436; font-weight: bold; font-size: 1.1rem; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }

.btn-leave { background: rgba(255,255,255,0.6); color: #2d3436; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.3s; backdrop-filter: blur(4px); text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
.btn-leave:hover { background: rgba(255,255,255,0.9); color: #d63031; }

/* Family Selector */
.family-selector-row { margin-bottom: 10px; }
.family-select { width: 100%; padding: 12px 15px; border: none; border-radius: 12px; font-size: 1rem; cursor: pointer; background: rgba(255,255,255,0.7); color: #2d3436; backdrop-filter: blur(4px); text-shadow: 0 1px 1px rgba(255,255,255,0.5); }
.family-select:focus { outline: 2px solid rgba(255,255,255,0.8); }

/* Member Chips */
.family-members-list { display: flex; flex-wrap: wrap; gap: 8px; }
.member-chip { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.7); padding: 6px 12px; border-radius: 20px; backdrop-filter: blur(4px); }
.member-avatar { width: 26px; height: 26px; background: linear-gradient(135deg, #fd79a8 0%, #a29bfe 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.member-name { color: #2d3436; font-size: 0.9rem; text-shadow: 0 1px 1px rgba(255,255,255,0.5); }
.member-badge { font-size: 0.8rem; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
.member-remove { background: transparent; color: #636e72; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.member-remove:hover { background: #ff7675; color: white; }

.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #e0e0e0; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
.full-width-card { grid-column: span 2; } 

/* Budget Card */
.budget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.budget-header h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; }
.budget-input-area { display: flex; gap: 10px; }
.btn-confirm { background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.budget-info { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px; color: #555; }
.progress-container { width: 100%; height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden; position: relative; }
.progress-bar { height: 100%; transition: width 0.5s, background-color 0.5s; }
.warning-text { color: #ff7675; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }
.safe-text { color: #2ecc71; font-weight: bold; margin-top: 8px; font-size: 0.9rem; text-align: right; }

/* Balance Card */
.balance-card { background: #34495e; color: white; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;}
.balance-card h2 { font-size: 2.2rem; margin: 10px 0; }
.income-text { color: #2ecc71; } .expense-text { color: #ff7675; }

.button-group { display: flex; gap: 10px; margin-top: 10px; }
.btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.5); color: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; }
.btn-outline:hover { background: rgba(255,255,255,0.1); }

/* Form */
.form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.form-row { display: flex; gap: 10px; margin-bottom: 10px; }
.input-group { display: flex; flex-direction: column; flex: 1; }
.input-group.flex-2 { flex: 2; } 
.input-group.flex-full { width: 100%; }
.input-group label { font-size: 0.85rem; color: #666; font-weight: bold; margin-bottom: 5px; }
input, select { padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 1rem; width: 100%; }
input:focus, select:focus { border-color: #3498db; outline: none; }
.btn-submit { background: #34495e; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 5px; }
.btn-update { background: #f39c12; }
.btn-sm { background: #ddd; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; }

/* List */
.filter-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; }
.date-range { display: flex; align-items: center; gap: 5px; background: white; padding: 5px; border-radius: 6px; border: 2px solid #ddd; }
.date-range input { border: none; padding: 5px; width: 130px; font-size: 0.9rem; }
.list-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #34495e; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.item-left { display: flex; align-items: center; gap: 15px; }
.date-badge { text-align: center; background: #eee; padding: 5px 10px; border-radius: 6px; min-width: 50px; }
.date-badge .day { display: block; font-size: 1.1rem; font-weight: bold; }
.date-badge .month { font-size: 0.75rem; color: #666; }
.item-title { font-weight: bold; font-size: 1.1rem; color: #2c3e50; }
.tags { display: flex; gap: 5px; margin-top: 4px; }
.tag { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: #e0e0e0; color: #555; }
.tag.method { background: #dff9fb; color: #22a6b3; }
.type-tag.transfer { background: #dfe6e9; color: #2d3436; font-weight: bold; }
.amount { font-weight: bold; font-size: 1.2rem; }
.amount.expense { color: #c0392b; }
.amount.income { color: #27ae60; }
.amount.transfer { color: #7f8c8d; } 
.actions { display: flex; gap: 5px; }
.btn-icon { background: transparent; border: 1px solid #ddd; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon.del { color: red; border-color: #ffcccc; }

@media (max-width: 600px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .full-width-card { grid-column: span 1; }
  .filter-bar { flex-direction: column; }
  .form-row { flex-direction: column; }
}

/* ========== Dark Mode Overrides ========== */
:global(.dark) .app-background { background-color: #1a1a2e; }
:global(.dark) .app-title { color: #e0e0e0; }
:global(.dark) .user-info { color: #a0a0a0; }
:global(.dark) .card { background: #16213e; border-color: #2d3748; }
:global(.dark) .card h3 { color: #e0e0e0; }
:global(.dark) .budget-info { color: #a0a0a0; }
:global(.dark) .progress-container { background: #2d3748; }
:global(.dark) .warning-text { color: #ff7675; }
:global(.dark) .safe-text { color: #00b894; }

/* Dark Family Cards */
:global(.dark) .family-card.user { background: linear-gradient(135deg, #4a3f35 0%, #6d4c41 100%); }
:global(.dark) .family-card.admin { background: linear-gradient(135deg, #3d3a50 0%, #2c3e50 100%); }
:global(.dark) .family-label { color: rgba(255,255,255,0.7); text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
:global(.dark) .family-name { color: #f5f5f5; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
:global(.dark) .family-select { background: rgba(0,0,0,0.3); color: #f5f5f5; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
:global(.dark) .member-chip { background: rgba(0,0,0,0.3); }
:global(.dark) .member-name { color: #f5f5f5; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
:global(.dark) .btn-leave { background: rgba(0,0,0,0.3); color: #f5f5f5; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

:global(.dark) .modal-card { background: #16213e; }
:global(.dark) .modal-card h2 { color: #e0e0e0; }
:global(.dark) .invite-code-display { background: #2d3748; color: #00b894; }
:global(.dark) .invite-hint { color: #a0a0a0; }
:global(.dark) .invite-input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
:global(.dark) .account-select { background: #16213e; color: #e0e0e0; }
:global(.dark) input, :global(.dark) select { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
:global(.dark) input::placeholder { color: #718096; }
:global(.dark) .tx-item { border-color: #2d3748; }
:global(.dark) .tx-title { color: #e0e0e0; }
:global(.dark) .tx-meta { color: #718096; }
:global(.dark) .btn-icon { border-color: #4a5568; color: #a0a0a0; }
:global(.dark) .btn-theme { background: #2d3748; }
</style>
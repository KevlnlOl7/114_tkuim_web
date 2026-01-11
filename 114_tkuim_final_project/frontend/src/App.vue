<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Chart from './components/Chart.vue'
import BarChart from './components/BarChart.vue'
import CalendarView from './components/CalendarView.vue'
import CategoryManager from './components/CategoryManager.vue'
import LoginPage from './components/LoginPage.vue'
import RegisterPage from './components/RegisterPage.vue'
import UserManager from './components/UserManager.vue'

// --- Locals ---
const currentMonthLabel = computed(() => {
  return new Date().toLocaleString(currentLocale.value, { month: 'long' })
})

const t_category = (catName) => {
  if (!catName) return ''
  const key = catName.toLowerCase()
  const map = messages[currentLocale.value]
  return map[key] || catName
}

const defaultCurrency = ref(localStorage.getItem('default_currency') || 'TWD')
const setDefaultCurrency = () => {
    // Save current selection as default
    defaultCurrency.value = form.value.currency
    localStorage.setItem('default_currency', form.value.currency)
    alert(t('default_set_hint').replace('{currency}', form.value.currency))
}

onMounted(() => {
  checkLoginStatus()
  if (isLoggedIn.value) {
    fetchData()
    fetchCategories()
  }
  // Load default currency
  if (defaultCurrency.value) {
      form.value.currency = defaultCurrency.value
  }
})
const currentPage = ref('login') // 'login', 'register', 'main'
const isLoggedIn = ref(false)
const currentUser = ref(null)
const showUserManager = ref(false)
const showCalendar = ref(false)
const showCategoryManager = ref(false)
const categories = ref([])

// 重設密碼 Modal (從 Email 連結)
const showResetPasswordModal = ref(false)
const pendingResetToken = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const resetMessage = ref('')
const resetLoading = ref(false)

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
const isLoading = ref(false)


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
  type: 'expense', payment_method: 'Cash',
  target_account: '',
  note: '',
  currency: 'TWD', foreign_amount: '', exchange_rate: 1
})



const currencyOptions = computed(() => [
  { code: 'TWD', name: t('c_twd') },
  { code: 'USD', name: t('c_usd') },
  { code: 'JPY', name: t('c_jpy') },
  { code: 'EUR', name: t('c_eur') },
  { code: 'KRW', name: t('c_krw') },
  { code: 'CNY', name: t('c_cny') },
  { code: 'AUD', name: t('c_aud') },
  { code: 'CAD', name: t('c_cad') },
  { code: 'GBP', name: t('c_gbp') },
  { code: 'HKD', name: t('c_hkd') },
  { code: 'SGD', name: t('c_sgd') },
  { code: 'THB', name: t('c_thb') },
  { code: 'VND', name: t('c_vnd') },
  { code: 'PHP', name: t('c_php') },
  { code: 'MYR', name: t('c_myr') },
  { code: 'IDR', name: t('c_idr') },
])

const rateUpdatedAt = ref('')

watch(() => form.value.currency, async (newVal) => {
  if (newVal === 'TWD') {
    form.value.exchange_rate = 1
    form.value.foreign_amount = ''
    rateUpdatedAt.value = ''
    return
  }
  try {
    const res = await axios.get(`http://127.0.0.1:8000/api/rates/${newVal}`)
    form.value.exchange_rate = Number(res.data.rate.toFixed(6))
    // Convert UTC to Local Time (Force Taipei)
    const utc = res.data.updated_at
    if (utc) {
      const d = new Date(utc + (utc.includes('UTC') ? '' : ' UTC'))
      rateUpdatedAt.value = d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) + ' (' + t('taipei_time') + ')'
    } else {
      rateUpdatedAt.value = ''
    }
    if (form.value.foreign_amount) {
      form.value.amount = Math.round(form.value.foreign_amount * form.value.exchange_rate)
    }
  } catch (e) { console.error(e) }
})

watch(() => [form.value.foreign_amount, form.value.exchange_rate], ([fa, rate]) => {
  if (form.value.currency !== 'TWD' && fa && rate) {
    form.value.amount = Math.round(fa * rate)
  }
})

const availableCategories = computed(() => {
  return categories.value.filter(c => c.type === form.value.type)
})

const accountBalances = ref([]) // 帳戶餘額

const currentLocale = ref('zh-TW')
const messages = {
  'zh-TW': {
     item_desc: '項目說明', amount: '金額', date: '日期', category: '分類',
     note: '備註', type: '類型', account: '支付/帳戶',
     from_account: '轉出帳戶', to_account: '轉入帳戶',
     rate: '匯率', to_twd: '折合台幣', updated_at: '更新',
     submit: '確認新增', update: '完成修改', manage: '管理',
     expense: '支出', income: '收入', transfer: '轉帳',
     search: '關鍵字', empty: '無資料',
     budget_title: '本月預算', net_assets: '目前淨資產',
     expense_analysis: '支出類別分析', trend_chart: '收支趨勢圖',
     add_transaction: '新增一筆', keyword_search: '🔍 關鍵字...',
     save: '儲存', settings: '設定', spend: '已花費',
     budget: '預算', remaining: '還有', over: '已經超支了！請節制一點！',
     import_data: '📥 匯入資料', export_excel: '📤 匯出 Excel',
     day_before_yesterday: '前天', yesterday: '昨天', today: '今天',
     cash: '現金', credit_card: '信用卡', bank: '銀行帳戶', linepay: 'LinePay',
     to_date: '至', default_currency: '設為預設',
     food: '飲食', transport: '交通', entertainment: '娛樂', shopping: '購物',
     others: '其他', salary: '薪水', investment: '投資',
     default_set_hint: '預設幣別已設定為 {currency}',
     c_twd: '新台幣', c_usd: '美元', c_jpy: '日圓', c_eur: '歐元', c_krw: '韓元', c_cny: '人民幣',
     c_aud: '澳幣', c_cad: '加幣', c_gbp: '英鎊', c_hkd: '港幣', c_sgd: '新加坡幣', c_thb: '泰銖',
     c_vnd: '越南盾', c_php: '菲披索', c_myr: '馬幣', c_idr: '印尼盾',
     optional: '選填', select_option: '請選擇', no_chart_data: '還沒有支出資料喔！',
     taipei_time: '台北時間'
  },
  'en-US': {
     item_desc: 'Title', amount: 'Amount', date: 'Date', category: 'Category',
     note: 'Note', type: 'Type', account: 'Account',
     from_account: 'From Account', to_account: 'To Account',
     rate: 'Rate', to_twd: 'in TWD', updated_at: 'Updated',
     submit: 'Add', update: 'Update', manage: 'Manage',
     expense: 'Expense', income: 'Income', transfer: 'Transfer',
     search: 'Search...', empty: 'No Data',
     budget_title: 'Monthly Budget', net_assets: 'Net Assets',
     expense_analysis: 'Expense Analysis', trend_chart: 'Trend Chart',
     add_transaction: 'Add Transaction', keyword_search: '🔍 Search...',
     save: 'Save', settings: 'Settings', spend: 'Spent',
     budget: 'Budget', remaining: 'Remaining', over: 'Over Budget!',
     import_data: '📥 Import Data', export_excel: '📤 Export Excel',
     day_before_yesterday: 'Day Before Yest.', yesterday: 'Yesterday', today: 'Today',
     cash: 'Cash', credit_card: 'Credit Card', bank: 'Bank', linepay: 'LinePay',
     to_date: 'to', default_currency: 'Set Default',
     food: 'Food', transport: 'Transport', entertainment: 'Entertainment', shopping: 'Shopping',
     others: 'Others', salary: 'Salary', investment: 'Investment',
     default_set_hint: 'Default currency set to {currency}',
     c_twd: 'Taiwan Dollar', c_usd: 'US Dollar', c_jpy: 'J. Yen', c_eur: 'Euro', c_krw: 'Won', c_cny: 'Yuan',
     c_aud: 'Aus Dollar', c_cad: 'Can Dollar', c_gbp: 'Pound', c_hkd: 'HK Dollar', c_sgd: 'SG Dollar', c_thb: 'Baht',
     c_vnd: 'Dong', c_php: 'Peso', c_myr: 'Ringgit', c_idr: 'Rupiah',
     optional: 'Optional', select_option: 'Select', no_chart_data: 'No expense data yet!',
     taipei_time: 'Taipei Time'
  },
  'vi': {
     item_desc: 'Tiêu đề', amount: 'Số tiền', date: 'Ngày', category: 'Danh mục',
     note: 'Ghi chú', type: 'Loại', account: 'Tài khoản',
     from_account: 'Từ TK', to_account: 'Đến TK',
     rate: 'Tỷ giá', to_twd: 'Sang TWD', updated_at: 'Cập nhật',
     submit: 'Thêm', update: 'Cập nhật', manage: 'Quản lý',
     expense: 'Chi tiêu', income: 'Thu nhập', transfer: 'Chuyển khoản',
     search: 'Tìm kiếm', empty: 'Không có dữ liệu',
     budget_title: 'Ngân sách tháng', net_assets: 'Tài sản ròng',
     expense_analysis: 'Phân tích chi tiêu', trend_chart: 'Xu hướng',
     add_transaction: 'Thêm giao dịch', keyword_search: '🔍 Tìm kiếm...',
     save: 'Lưu', settings: 'Cài đặt', spend: 'Đã chi',
     budget: 'Ngân sách', remaining: 'Còn lại', over: 'Đã vượt quá!',
     import_data: '📥 Nhập dữ liệu', export_excel: '📤 Xuất Excel',
     day_before_yesterday: 'Hôm kia', yesterday: 'Hôm qua', today: 'Hôm nay',
     cash: 'Tiền mặt', credit_card: 'Thẻ tín dụng', bank: 'Ngân hàng', linepay: 'LinePay',
     to_date: 'đến', default_currency: 'Đặt mặc định',
     food: 'Ăn uống', transport: 'Đi lại', entertainment: 'Giải trí', shopping: 'Mua sắm',
     others: 'Khác', salary: 'Lương', investment: 'Đầu tư',
     default_set_hint: 'Tiền tệ mặc định là {currency}',
     c_twd: 'Đài tệ', c_usd: 'Đô la Mỹ', c_jpy: 'Yên Nhật', c_eur: 'Euro', c_krw: 'Won', c_cny: 'Nhân dân tệ',
     c_aud: 'Đô Úc', c_cad: 'Đô Canada', c_gbp: 'Bảng Anh', c_hkd: 'Đô HK', c_sgd: 'Đô Sing', c_thb: 'Baht',
     c_vnd: 'Đồng', c_php: 'Peso', c_myr: 'Ringgit', c_idr: 'Rupiah',
     optional: 'Tùy chọn', select_option: 'Chọn', no_chart_data: 'Chưa có dữ liệu chi tiêu!',
     taipei_time: 'Giờ Đài Bắc'
  },
  'id': {
     item_desc: 'Judul', amount: 'Jumlah', date: 'Tanggal', category: 'Kategori',
     note: 'Catatan', type: 'Jenis', account: 'Akun',
     from_account: 'Dari Akun', to_account: 'Ke Akun',
     rate: 'Kurs', to_twd: 'Ke TWD', updated_at: 'Diperbarui',
     submit: 'Tambah', update: 'Ubah', manage: 'Kelola',
     expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer',
     search: 'Cari', empty: 'Tidak ada data',
     budget_title: 'Anggaran Bulanan', net_assets: 'Aset Bersih',
     expense_analysis: 'Analisis Pengeluaran', trend_chart: 'Tren',
     add_transaction: 'Tambah Transaksi', keyword_search: '🔍 Cari...',
     save: 'Simpan', settings: 'Pengaturan', spend: 'Terpakai',
     budget: 'Anggaran', remaining: 'Sisa', over: 'Melebihi Anggaran!',
     import_data: '📥 Impor Data', export_excel: '📤 Ekspor Excel',
     day_before_yesterday: 'Kemarin lusa', yesterday: 'Kemarin', today: 'Hari ini',
     cash: 'Tunai', credit_card: 'Kartu Kredit', bank: 'Bank', linepay: 'LinePay',
     to_date: 'sampai', default_currency: 'Set Default',
     food: 'Makanan', transport: 'Transportasi', entertainment: 'Hiburan', shopping: 'Belanja',
     others: 'Lainnya', salary: 'Gaji', investment: 'Investasi',
     default_set_hint: 'Mata uang default {currency}',
     c_twd: 'NB Taiwan', c_usd: 'Dolar AS', c_jpy: 'Yen', c_eur: 'Euro', c_krw: 'Won', c_cny: 'Yuan',
     c_aud: 'Dolar Aus', c_cad: 'Dolar Can', c_gbp: 'Pound', c_hkd: 'Dolar HK', c_sgd: 'Dolar SG', c_thb: 'Baht',
     c_vnd: 'Dong', c_php: 'Peso', c_myr: 'Ringgit', c_idr: 'Rupiah',
     optional: 'Opsional', select_option: 'Pilih', no_chart_data: 'Belum ada data pengeluaran!',
     taipei_time: '台北時間'
  },
  'ja': {
     item_desc: '項目名', amount: '金額', date: '日付', category: 'カテゴリ',
     note: 'メモ', type: '種類', account: '口座',
     from_account: '出金口座', to_account: '入金口座',
     rate: 'レート', to_twd: 'TWD換算', updated_at: '更新',
     submit: '追加', update: '更新', manage: '管理',
     expense: '支出', income: '収入', transfer: '振替',
     search: '検索', empty: 'データなし',
     budget_title: '今月の予算', net_assets: '純資産',
     expense_analysis: '支出分析', trend_chart: '収支推移',
     add_transaction: '取引を追加', keyword_search: '🔍 キーワード...',
     save: '保存', settings: '設定', spend: '支出済',
     budget: '予算', remaining: '残り', over: '予算超過です！',
     import_data: '📥 インポート', export_excel: '📤 輸出 Excel',
     day_before_yesterday: '一昨日', yesterday: '昨日', today: '今日',
     cash: '現金', credit_card: 'クレカ', bank: '銀行', linepay: 'LinePay',
     to_date: '〜', default_currency: 'デフォルトに設定',
     food: '食事', transport: '交通', entertainment: '娯楽', shopping: '買い物',
     others: 'その他', salary: '給料', investment: '投資',
     default_set_hint: 'デフォルト通貨: {currency}',
     c_twd: '台湾ドル', c_usd: '米ドル', c_jpy: '日本円', c_eur: 'ユーロ', c_krw: '韓国ウォン', c_cny: '人民元',
     c_aud: '豪ドル', c_cad: '加ドル', c_gbp: 'ポンド', c_hkd: '香港ドル', c_sgd: 'SGドル', c_thb: 'バーツ',
     c_vnd: 'ドン', c_php: 'ペソ', c_myr: 'リンギット', c_idr: 'ルピア',
     optional: '任意', select_option: '選択してください', no_chart_data: '支出データはまだありません！',
     taipei_time: '台北時間'
  },
  'ko': {
     item_desc: '항목', amount: '금액', date: '날짜', category: '카테고리',
     note: '메모', type: '유형', account: '계좌',
     from_account: '출금 계좌', to_account: '입금 계좌',
     rate: '환율', to_twd: 'TWD 환산', updated_at: '업데이트',
     submit: '추가', update: '수정', manage: '관리',
     expense: '지출', income: '수입', transfer: '이체',
     search: '검색', empty: '데이터 없음',
     budget_title: '이번 달 예산', net_assets: '순자산',
     expense_analysis: '지출 분석', trend_chart: '수지 추이',
     add_transaction: '거래 추가', keyword_search: '🔍 검색...',
     save: '저장', settings: '설정', spend: '지출',
     budget: '예산', remaining: '잔액', over: '예산 초과!',
     import_data: '📥 데이터 가져오기', export_excel: '📤 엑셀 내보내기',
     day_before_yesterday: '그저께', yesterday: '어제', today: '오늘',
     cash: '현금', credit_card: '신용카드', bank: '은행', linepay: 'LinePay',
     to_date: '~', default_currency: '기본값 설정',
     food: '식비', transport: '교통', entertainment: '오락', shopping: '쇼핑',
     others: '기타', salary: '급여', investment: '투자',
     default_set_hint: '기본 통화: {currency}',
     c_twd: '대만 달러', c_usd: '미국 달러', c_jpy: '엔화', c_eur: '유로', c_krw: '원화', c_cny: '위안화',
     c_aud: '호주 달러', c_cad: '캐나다 달러', c_gbp: '파운드', c_hkd: '홍콩 달러', c_sgd: '싱가포르 달러', c_thb: '바트',
     c_vnd: '동', c_php: '페소', c_myr: '링깃', c_idr: '루피아',
     optional: '선택', select_option: '선택', no_chart_data: '지출 데이터가 없습니다!',
     taipei_time: '타이베이 시간'
  },
  'tl': {
     item_desc: 'Pamagat', amount: 'Halaga', date: 'Petsa', category: 'Kategorya',
     note: 'Tala', type: 'Uri', account: 'Account',
     from_account: 'Mula sa', to_account: 'Papunta sa',
     rate: 'Rate', to_twd: 'sa TWD', updated_at: 'Na-update',
     submit: 'Idagdag', update: 'I-update', manage: 'Pamahalaan',
     expense: 'Gastos', income: 'Kita', transfer: 'Paglipat',
     search: 'Paghahanap', empty: 'Walang Data',
     budget_title: 'Buwanang Badyet', net_assets: 'Net Assets',
     expense_analysis: 'Pagsusuri', trend_chart: 'Trend',
     add_transaction: 'Magdagdag', keyword_search: '🔍 Hanapin...',
     save: 'I-save', settings: 'Mga Setting', spend: 'Nagastos',
     budget: 'Badyet', remaining: 'Natitira', over: 'Lampas sa Badyet!',
     import_data: '📥 Mag-import', export_excel: '📤 I-export Excel',
     day_before_yesterday: 'Noong makalawa', yesterday: 'Kahapon', today: 'Ngayon',
     cash: 'Cash', credit_card: 'Credit Card', bank: 'Banko', linepay: 'LinePay',
     to_date: 'sa', default_currency: 'Itakda ang Default',
     food: 'Pagkain', transport: 'Transportasyon', entertainment: 'Libangan', shopping: 'Pamimili',
     others: 'Iba pa', salary: 'Sahod', investment: 'Pamumuhunan',
     default_set_hint: 'Default na pera: {currency}',
     c_twd: 'Taiwan Dollar', c_usd: 'US Dollar', c_jpy: 'Yen', c_eur: 'Euro', c_krw: 'Won', c_cny: 'Yuan',
     c_aud: 'Aus Dollar', c_cad: 'Can Dollar', c_gbp: 'Pound', c_hkd: 'HK Dollar', c_sgd: 'SG Dollar', c_thb: 'Baht',
     c_vnd: 'Dong', c_php: 'Peso', c_myr: 'Ringgit', c_idr: 'Rupiah',
     optional: 'Opsyonal', select_option: 'Piliin', no_chart_data: 'Wala pang datos ng gastusin!',
     taipei_time: 'Taipei Oras'
  },
}
const formatDateBadge = (dateStr) => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString(currentLocale.value, { month: 'short' })
}

const t = (key) => messages[currentLocale.value][key] || key

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
  isLoading.value = true
  try {
    let url = `http://127.0.0.1:8000/api/transactions?keyword=${keyword.value}`
    if (startDate.value) url += `&start_date=${startDate.value}`
    if (endDate.value) url += `&end_date=${endDate.value}`
    // 管理員可以查看特定成員的帳本
    if (selectedUserId.value) url += `&user_id=${selectedUserId.value}`
    
    const listRes = await axios.get(url)
    transactions.value = listRes.data 

    let statsUrl = 'http://127.0.0.1:8000/api/dashboard/stats'
    if (startDate.value || endDate.value) {
      statsUrl += '?'
      if (startDate.value) statsUrl += `start_date=${startDate.value}&`
      if (endDate.value) statsUrl += `end_date=${endDate.value}`
    }
    const statsRes = await axios.get(statsUrl)
    stats.value = statsRes.data
    const trendRes = await axios.get('http://127.0.0.1:8000/api/dashboard/trend')
    trendData.value = trendRes.data
    
    const budgetRes = await axios.get('http://127.0.0.1:8000/api/budget')
    budgetLimit.value = budgetRes.data.limit
    const accountRes = await axios.get('http://127.0.0.1:8000/api/dashboard/accounts')
    accountBalances.value = accountRes.data
    
    await fetchCategories()
  } catch (error) { 
    console.error(error) 
  } finally {
    isLoading.value = false
  }
}

const fetchCategories = async () => {
  try {
    let url = 'http://127.0.0.1:8000/api/categories'
    // if (currentUser.value) url += `?user_id=${currentUser.value.id}` // Consider if we need to filter or if backend handles it
    // Actually backend expects user_id param to show USER specific + Default.
    // But currentUser might be null if strictly following flow, but fetchData is called after login.
    if (currentUser.value) url += `?user_id=${currentUser.value.id}`
    const res = await axios.get(url)
    categories.value = res.data
  } catch (err) { console.error(err) }
}

const handleSubmit = async () => {
  if (!form.value.title || !form.value.amount) return alert("請輸入完整資訊")
  
  // Transfer Validation
  if (form.value.type === 'transfer') {
    if (!form.value.target_account) return alert("請選擇轉入帳戶")
    if (form.value.payment_method === form.value.target_account) return alert("轉出與轉入帳戶不能相同")
  }

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

const duplicateTransaction = (item) => {
  form.value = {
    ...item,
    id: null, // Clear ID to ensure it's a new entry
    date: new Date().toISOString().split('T')[0] // Default to today
  }
  isEditing.value = false // Ensure we are in "Add" mode
  editId.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}



const handleDateSelect = (date) => {
  startDate.value = date
  endDate.value = date
  showCalendar.value = false
  fetchData() // Refresh list
}

const startEdit = (item) => {
  isEditing.value = true
  editId.value = item.id
  form.value = { ...item }
  if(!form.value.currency) form.value.currency = 'TWD'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const cancelEdit = () => { isEditing.value = false; editId.value = null; resetForm() }
const resetForm = () => {
  form.value = {
    title: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense', payment_method: 'Cash',
    target_account: '',
    note: '',
    currency: 'TWD', foreign_amount: '', exchange_rate: 1
  }
}

const setDate = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  // Fix timezone issue: using local time string construction
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  form.value.date = `${year}-${month}-${day}`
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
  // 檢查是否有重設密碼的 token
  const urlParams = new URLSearchParams(window.location.search)
  const resetToken = urlParams.get('reset_token')
  if (resetToken) {
    showResetPasswordModal.value = true
    pendingResetToken.value = resetToken
    // 清除 URL 參數
    window.history.replaceState({}, '', window.location.pathname)
    return
  }
  
  checkLoginStatus()
  if (isLoggedIn.value) {
    fetchData()
    // 載入家庭成員列表 (有加入家庭的話)
    if (currentUser.value?.family_id) {
      fetchFamilyMembers()
    }
  }
})

// 處理從 Email 連結重設密碼
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

watch(currentLocale, (val) => {
  localStorage.setItem('user_locale', val)
  document.documentElement.lang = val
}, { immediate: true })

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
  
  <!-- 重設密碼 Modal (從 Email 連結打開) -->
  <div v-if="showResetPasswordModal" class="reset-modal-overlay">
    <div class="reset-modal-card">
      <h2>🔐 重設密碼</h2>
      <p class="reset-hint">請輸入您的新密碼</p>
      
      <input 
        v-model="newPassword" 
        type="password" 
        placeholder="新密碼" 
        class="reset-input"
        :disabled="resetLoading"
      />
      <input 
        v-model="confirmNewPassword" 
        type="password" 
        placeholder="確認新密碼" 
        class="reset-input"
        :disabled="resetLoading"
      />
      
      <p v-if="resetMessage" :class="resetMessage.includes('✅') ? 'success-msg' : 'error-msg'">
        {{ resetMessage }}
      </p>
      
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
          <h1 class="app-title">💰 PyMoney 記帳本</h1>
          <span v-if="currentUser" class="user-info">
            👋 {{ currentUser.display_name }}
            <span v-if="currentUser.role === 'admin'" class="admin-badge">管理員</span>
          </span>
        </div>
        <div class="header-actions">
          <select v-model="currentLocale" class="lang-select">
            <option value="zh-TW">🇹🇼 中文</option>
            <option value="en-US">🇺🇸 English</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="ko">🇰🇷 한국어</option>
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="id">🇮🇩 Bahasa Ind</option>
            <option value="tl">🇵🇭 Filipino</option>
          </select>
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
          <!-- 管理員：使用者管理 -->
          <button v-if="currentUser?.role === 'admin'" @click="showUserManager = true" class="btn-manage">
            👥 管理
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

      <!-- 使用者管理 Modal -->
      <div v-if="showUserManager" class="modal-overlay" @click.self="showUserManager = false">
        <UserManager @close="showUserManager = false" />
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
            <h3>📅 {{ t('budget_title') }} ({{ currentMonthLabel }})</h3>
            <button @click="toggleBudgetEdit" class="btn-sm">⚙️ {{ t('settings') }}</button>
          </div>
          <div v-if="showBudgetInput" class="budget-input-area">
            <input v-model="newBudget" type="number" :placeholder="t('budget')" />
            <button @click="saveBudget" class="btn-confirm">{{ t('save') }}</button>
          </div>
          <div v-else class="budget-display">
            <div class="budget-info">
              <span>{{ t('spend') }}: <b>${{ monthlyExpense }}</b></span>
              <span>{{ t('budget') }}: ${{ budgetLimit }}</span>
            </div>
            <div class="progress-container">
              <div class="progress-bar" :style="{ width: budgetPercent + '%', backgroundColor: monthlyExpense > budgetLimit ? '#ff7675' : '#74b9ff' }"></div>
            </div>
            <p v-if="monthlyExpense > budgetLimit" class="warning-text">⚠️ {{ t('over') }}</p>
            <p v-else class="safe-text">✨ {{ t('remaining') }} ${{ budgetLimit - monthlyExpense }}</p>
          </div>
        </div>

        <div class="card balance-card">
          <h3>{{ t('net_assets') }}</h3>
          <h2 :class="totalAmount >= 0 ? 'income-text' : 'expense-text'">${{ totalAmount }}</h2>
          
          <div class="button-group">
             <input type="file" ref="fileInput" @change="handleImport" accept=".xlsx,.xls,.csv" style="display: none" />
            
            <button @click="triggerFileInput" class="btn-outline">{{ t('import_data') }}</button>
            <button @click="exportExcel" class="btn-outline">{{ t('export_excel') }}</button>
          </div>
        </div>

        <div class="card chart-card">
          <h3>{{ t('expense_analysis') }}</h3>
          <Chart :stats="stats" :categories="categories" :emptyText="t('no_chart_data')" />
        </div>
        
        <div class="card bar-chart-card full-width-card">
          <h3>{{ t('trend_chart') }}</h3>
          <BarChart :trendData="trendData" :expenseLabel="t('expense')" :incomeLabel="t('income')" />
        </div>
      </div>

      <div class="card form-card" :class="{ 'edit-mode': isEditing }">
        <div class="form-header">
          <h3>{{ isEditing ? '✏️ ' + t('update') : '📝 ' + t('add_transaction') }}</h3>
          <button v-if="isEditing" @click="cancelEdit" class="btn-sm">取消</button>
        </div>
        
        <div class="form-body">
          <div class="form-row">
            <div class="input-group">
              <label>{{ t('type') }}</label>
              <select v-model="form.type">
                <option value="expense">{{ t('expense') }} 💸</option>
                <option value="income">{{ t('income') }} 💰</option>
                <option value="transfer">{{ t('transfer') }} 🔄</option>
              </select>
            </div>
            <div class="input-group">
              <div class="date-label-row">
                <label>{{ t('date') }}</label>
                <div class="date-shortcuts">
                  <span @click="setDate(-2)" class="date-chip">{{ t('day_before_yesterday') }}</span>
                  <span @click="setDate(-1)" class="date-chip">{{ t('yesterday') }}</span>
                  <span @click="setDate(0)" class="date-chip">{{ t('today') }}</span>
                </div>
              </div>
              <input v-model="form.date" type="date" :lang="currentLocale" required />
            </div>
            <div class="input-group">
              <label>{{ form.type === 'transfer' ? t('from_account') : t('account') }}</label>
              <select v-model="form.payment_method">
                <option value="Cash">{{ t('cash') }}</option>
                <option value="Credit Card">{{ t('credit_card') }}</option>
                <option value="Bank">{{ t('bank') }}</option>
                <option value="LinePay">{{ t('linepay') }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group">
              <label>{{ t('item_desc') }}</label>
              <input v-model="form.title" placeholder="..." required />
            </div>
            <div class="input-group">
              <label>{{ t('amount') }}</label>
              <div style="display: flex; gap: 5px; align-items: center;">
                <select v-model="form.currency" style="width: 140px;">
                  <option v-for="c in currencyOptions" :key="c.code" :value="c.code">
                    {{ c.code }} {{ c.name }}
                  </option>
                </select>
                <button @click="setDefaultCurrency" class="btn-icon-sm" title="設為預設">⭐</button>
                <input v-if="form.currency === 'TWD'" v-model="form.amount" type="number" placeholder="NT$" required style="flex:1;" />
                <input v-else v-model="form.foreign_amount" type="number" :placeholder="form.currency" required style="flex:1;" />
              </div>
            </div>
          </div>

          <div class="form-row" v-if="form.currency !== 'TWD'">
            <div class="input-group">
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                  <label>{{ t('rate') }} (1 {{form.currency}} ≈ ? TWD)</label>
                  <span v-if="rateUpdatedAt" style="font-size:0.7rem; color:#888; margin-bottom:4px;">{{ t('updated_at') }}: {{rateUpdatedAt}}</span>
                </div>
                <input v-model="form.exchange_rate" type="number" step="0.0001" placeholder="Exchange Rate" />
            </div>
            <div class="input-group">
                <label>{{ t('to_twd') }}</label>
                <input :value="Math.round(form.foreign_amount * form.exchange_rate) || 0" disabled style="background:#f0f0f0;" />
            </div>
          </div>
          <div class="form-row" v-if="form.type !== 'transfer'">
            <div class="input-group flex-full">
              <div class="category-label-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <label style="margin:0;">{{ t('category') }}</label>
                <button type="button" @click="showCategoryManager = true" style="background:none; border:none; color:#667eea; cursor:pointer; font-size:0.85rem;">⚙️ {{ t('manage') }}</button>
              </div>
              <select v-model="form.category">
                <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
                  {{ cat.icon }} {{ t_category(cat.name) }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row" v-if="form.type === 'transfer'">
            <div class="input-group flex-full">
              <label>{{ t('to_account') }}</label>
              <select v-model="form.target_account" required>
                <option value="" disabled>-</option>
                <option value="Cash">{{ t('cash') }}</option>
                <option value="Credit Card">{{ t('credit_card') }}</option>
                <option value="Bank">{{ t('bank') }}</option>
                <option value="LinePay">{{ t('linepay') }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="input-group flex-full">
              <label>📝 {{ t('note') }}</label>
              <textarea v-model="form.note" placeholder="..." rows="2" class="note-textarea"></textarea>
            </div>
          </div>
          <button @click="handleSubmit" class="btn-submit" :class="{ 'btn-update': isEditing }">
             {{ isEditing ? (form.type === 'expense' ? '💸 ' : (form.type === 'income' ? '💰 ' : '🔄 ')) + t('update') : (form.type === 'expense' ? '💸 ' : (form.type === 'income' ? '💰 ' : '🔄 ')) + t('submit') }}
          </button>
        </div>
      </div>

      <div class="list-section">
        <div class="filter-bar">
          <button @click="showCalendar = !showCalendar" class="btn-icon calendar-btn" :class="{ active: showCalendar }">📅</button>
          <div class="search-box">
            <input v-model="keyword" type="text" :placeholder="t('keyword_search')" />
          </div>
          <div class="date-range">
            <input v-model="startDate" type="date" :lang="currentLocale" />
            <span>{{ t('to_date') }}</span>
            <input v-model="endDate" type="date" :lang="currentLocale" />
          </div>
        </div>
        
        <CalendarView v-if="showCalendar" :trendData="trendData" :locale="currentLocale" @date-selected="handleDateSelect" />

        <div v-if="transactions.length === 0" class="empty-state">無資料...</div>
        <div v-else class="transaction-list">
          <div v-for="item in transactions" :key="item.id" class="list-item">
            <div class="item-left">
              <div class="date-badge">
                <span class="day">{{ item.date.split('-')[2] }}</span>
                <span class="month">{{ formatDateBadge(item.date) }}</span>
              </div>
              <div class="item-info">
                <div class="item-title">{{ item.title }}</div>
                <div class="tags">
                  <span class="tag type-tag" :class="item.type">
                    {{ item.type === 'transfer' ? t('transfer') : t_category(item.category) }}
                  </span>
                  <span class="tag method">{{ t(item.payment_method.toLowerCase()) || item.payment_method }}</span>
                </div>
                <div v-if="item.note" class="item-note">📝 {{ item.note }}</div>
              </div>
            </div>
            <div class="item-right">
              <span class="amount" :class="item.type" style="display:flex; flex-direction:column; align-items:flex-end;">
                <span v-if="item.currency && item.currency !== 'TWD'" style="font-size: 0.75rem; color: #888;">
                    {{ item.currency }} {{ item.foreign_amount }}
                </span>
                <span>{{ item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '') }} ${{ item.amount }}</span>
              </span>
              <div class="actions">
                <button @click="duplicateTransaction(item)" class="btn-icon copy" title="複製">📋</button>
                <button @click="startEdit(item)" class="btn-icon">✎</button> 
                <button @click="removeTransaction(item.id)" class="btn-icon del">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <CategoryManager 
      :show="showCategoryManager" 
      :categories="categories" 
      :currentUser="currentUser"
      @close="showCategoryManager = false" 
      @updated="fetchCategories" 
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
.loading-overlay { 
  position: fixed; 
  top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(255,255,255,0.85); 
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center; 
  z-index: 9999;
  backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  margin-top: 15px;
  color: #667eea;
  font-size: 1rem;
  font-weight: 500;
}

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
.btn-manage { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s; }
.btn-manage:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: white; border-radius: 16px; padding: 30px; max-width: 400px; width: 90%; text-align: center; animation: slideUp 0.3s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-card h2 { margin: 0 0 20px 0; color: #2c3e50; }
.invite-code-display { font-size: 2.5rem; font-weight: bold; color: #11998e; letter-spacing: 8px; padding: 20px; background: #f8f9fa; border-radius: 12px; margin-bottom: 15px; font-family: monospace; }
.invite-hint { color: #666; font-size: 0.9rem; margin: 10px 0; }
.invite-hint { color: #666; font-size: 0.9rem; margin: 10px 0; }
.invite-expires { color: #e67e22; font-size: 0.85rem; }

/* Language Selector */
.lang-select {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background-color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px;
  padding-right: 25px;
  margin-right: 10px;
}
.lang-select:hover { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
html.dark-mode .lang-select { background-color: #2d3748; border-color: #4a5568; color: #fff; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); }
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
.btn-icon-sm { background: transparent; border: none; font-size: 1rem; cursor: pointer; padding: 2px 5px; transition: transform 0.2s; flex-shrink: 0; }
.btn-icon-sm:hover { transform: scale(1.2); }

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
.filter-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center; }
.calendar-btn { background: white; border: 2px solid #ddd; width: 40px; height: 40px; border-radius: 8px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.calendar-btn.active { background: #667eea; color: white; border-color: #667eea; }
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
.btn-icon.copy { color: #3498db; border-color: #d6eaf8; }

/* Note Field */
.note-textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; resize: vertical; min-height: 50px; }
.note-textarea:focus { border-color: #667eea; outline: none; }
.item-note { font-size: 0.8rem; color: #636e72; margin-top: 5px; font-style: italic; }

/* Date Shortcuts */
.date-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.date-label-row label { margin-bottom: 0; }
.date-shortcuts { display: flex; gap: 5px; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; mask-image: linear-gradient(to right, black 85%, transparent 100%); }
.date-shortcuts::-webkit-scrollbar { display: none; }
.date-chip { 
  font-size: 0.75rem; 
  padding: 1px 6px; 
  background: #e0e0e0; 
  border-radius: 12px; 
  cursor: pointer; 
  color: #555; 
  transition: all 0.2s;
  line-height: 1.2;
}
.date-chip:hover { background: #b2bec3; color: white; }
:global(.dark) .date-chip { background: #2d3748; color: #a0a0a0; }
:global(.dark) .date-chip:hover { background: #4a5568; color: white; }

/* Responsive adjustments */
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
</style>
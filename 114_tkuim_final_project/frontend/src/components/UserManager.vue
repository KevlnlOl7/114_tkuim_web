<template>
  <div class="user-manager">
    <div class="manager-header">
      <h2>👥 使用者管理</h2>
      <button @click="$emit('close')" class="btn-close">✕</button>
    </div>
    
    <div class="user-list">
      <div v-for="user in users" :key="user.id" class="user-card">
        <div class="user-info">
          <div class="user-avatar">{{ user.display_name.charAt(0) }}</div>
          <div class="user-details">
            <span class="user-name">{{ user.display_name }}</span>
            <span class="user-meta">@{{ user.username }}</span>
            <span v-if="user.role === 'admin'" class="role-badge admin">管理員</span>
            <span v-else class="role-badge user">成員</span>
          </div>
        </div>
        <div class="user-actions">
          <button 
            v-if="user.username !== 'admin'" 
            @click="confirmDelete(user)" 
            class="btn-action delete"
          >🗑️ 刪除</button>
        </div>
      </div>
    </div>

    <!-- 重設密碼 Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
      <div class="modal-card">
        <h3>🔑 重設密碼</h3>
        <p class="modal-hint">為 <strong>{{ selectedUser?.display_name }}</strong> 設定新密碼</p>
        <input 
          v-model="newPassword" 
          type="password" 
          placeholder="輸入新密碼" 
          class="modal-input"
        />
        <div class="modal-actions">
          <button @click="resetPassword" class="btn-confirm" :disabled="!newPassword">確認重設</button>
          <button @click="showResetModal = false" class="btn-cancel">取消</button>
        </div>
        <p v-if="resetMessage" :class="resetMessage.includes('成功') ? 'success-msg' : 'error-msg'">
          {{ resetMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['close'])

const users = ref([])
const showResetModal = ref(false)
const selectedUser = ref(null)
const newPassword = ref('')
const resetMessage = ref('')

const fetchUsers = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8000/api/users')
    users.value = res.data
  } catch (err) {
    console.error('載入使用者失敗', err)
  }
}

const openResetModal = (user) => {
  selectedUser.value = user
  newPassword.value = ''
  resetMessage.value = ''
  showResetModal.value = true
}

const resetPassword = async () => {
  if (!newPassword.value || !selectedUser.value) return
  try {
    await axios.post(`http://127.0.0.1:8000/api/users/${selectedUser.value.id}/reset-password`, {
      new_password: newPassword.value
    })
    resetMessage.value = '✅ 密碼重設成功！'
    setTimeout(() => {
      showResetModal.value = false
      resetMessage.value = ''
    }, 1500)
  } catch (err) {
    resetMessage.value = err.response?.data?.detail || '重設失敗'
  }
}

const confirmDelete = async (user) => {
  if (!confirm(`確定要刪除使用者「${user.display_name}」嗎？此操作無法復原！`)) return
  try {
    await axios.delete(`http://127.0.0.1:8000/api/users/${user.id}`)
    alert('已刪除使用者')
    fetchUsers()
  } catch (err) {
    alert(err.response?.data?.detail || '刪除失敗')
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-manager {
  background: white;
  border-radius: 16px;
  padding: 25px;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.manager-header h2 {
  margin: 0;
  color: #2d3436;
}

.btn-close {
  background: #f0f0f0;
  border: none;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}
.btn-close:hover { background: #e74c3c; color: white; }

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  transition: all 0.3s;
}
.user-card:hover { transform: translateX(5px); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.2rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: bold;
  color: #2d3436;
}

.user-meta {
  font-size: 0.8rem;
  color: #636e72;
}

.role-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  width: fit-content;
}
.role-badge.admin { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.role-badge.user { background: #e0e0e0; color: #636e72; }

.user-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}
.btn-action.reset { background: #74b9ff; color: white; }
.btn-action.reset:hover { background: #0984e3; }
.btn-action.delete { background: #ff7675; color: white; }
.btn-action.delete:hover { background: #d63031; }

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-card h3 { margin: 0 0 10px 0; color: #2d3436; }
.modal-hint { color: #636e72; margin-bottom: 20px; }

.modal-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  margin-bottom: 15px;
}
.modal-input:focus { border-color: #667eea; outline: none; }

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
}
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel {
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
}

.success-msg { color: #00b894; margin-top: 10px; }
.error-msg { color: #d63031; margin-top: 10px; }

/* Dark Mode */
:global(.dark) .user-manager { background: #16213e; }
:global(.dark) .manager-header h2 { color: #e0e0e0; }
:global(.dark) .manager-header { border-color: #2d3748; }
:global(.dark) .user-card { background: linear-gradient(135deg, #2d3748 0%, #1a1a2e 100%); }
:global(.dark) .user-name { color: #e0e0e0; }
:global(.dark) .user-meta { color: #a0a0a0; }
:global(.dark) .modal-card { background: #16213e; }
:global(.dark) .modal-card h3 { color: #e0e0e0; }
:global(.dark) .modal-hint { color: #a0a0a0; }
:global(.dark) .modal-input { background: #2d3748; color: #e0e0e0; border-color: #4a5568; }
</style>

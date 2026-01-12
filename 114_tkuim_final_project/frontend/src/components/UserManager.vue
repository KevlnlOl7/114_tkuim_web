<template>
  <div class="user-manager">
    <div class="manager-header">
      <h2>👥 {{ t('user_mgmt') }}</h2>
      <button @click="$emit('close')" class="btn-close">✕</button>
    </div>
    
    <div class="user-list">
      <div v-for="user in users" :key="user.id" class="user-card">
        <div class="user-info">
          <div class="user-avatar">{{ user.display_name.charAt(0) }}</div>
          <div class="user-details">
            <span class="user-name">{{ user.display_name }}</span>
            <span class="user-meta">@{{ user.username }}</span>
            <span v-if="user.role === 'admin'" class="role-badge admin">{{ t('admin') }}</span>
            <span v-else class="role-badge user">{{ t('user') }}</span>
          </div>
        </div>
        <div class="user-actions">
          <!-- Button for members already in the admin's family -->
          <button 
            v-if="user.username !== 'admin' && String(user.family_id) === String(currentUser?.family_id)" 
            @click="handleRemove(user)" 
            class="btn-action remove-family"
            :disabled="isLoading"
          >
            🚪 {{ t('remove_from_family') }}
          </button>

          <!-- Button for users not in any family -->
          <button 
            v-if="user.username !== 'admin' && !user.family_id" 
            @click="handleAdd(user)" 
            class="btn-action add-family"
            :disabled="isLoading"
          >
            ➕ {{ t('add_to_family') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { t } from '../i18n'

const props = defineProps({
  currentUser: { type: Object, default: null }
})
const emit = defineEmits(['close', 'refresh-user', 'remove-member', 'add-member'])

const users = ref([])
const isLoading = ref(false)

const fetchUsers = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8000/api/users')
    users.value = res.data
  } catch (err) {
    console.error(t('load_users_failed'), err)
  }
}

const handleRemove = async (user) => {
  if (!confirm(t('confirm_remove_member', { name: user.display_name }))) return
  isLoading.value = true
  try {
    await axios.post(`http://127.0.0.1:8000/api/family/remove-member?admin_id=${props.currentUser.id}&member_id=${user.id}`)
    alert(t('member_removed', { name: user.display_name }))
    await fetchUsers()
    emit('refresh-user')
  } catch (err) {
    alert(err.response?.data?.detail || t('remove_failed'))
  } finally {
    isLoading.value = false
  }
}

const handleAdd = async (user) => {
  if (!confirm(t('add_to_family_hint'))) return
  isLoading.value = true
  try {
    const res = await axios.post(`http://127.0.0.1:8000/api/family/add-member?admin_id=${props.currentUser.id}&member_id=${user.id}`)
    alert(res.data.message)
    await fetchUsers()
    emit('refresh-user')
  } catch (err) {
    alert(err.response?.data?.detail || t('add_failed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-manager {
  background: white; border-radius: 16px; padding: 25px;
  max-width: 500px; width: 95%; margin: 0 auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}
.manager-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;
}
.manager-header h2 { margin: 0; color: #2d3436; font-size: 1.5rem; }
.btn-close {
  background: #f0f0f0; border: none; width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
}
.btn-close:hover { background: #e74c3c; color: white; }
.user-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
.user-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px; transition: all 0.3s; gap: 10px;
}
.user-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: white; }
.user-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.user-avatar {
  width: 36px; height: 36px; min-width: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-weight: bold;
}
.user-details { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.user-name { font-weight: bold; color: #2d3436; }
.user-meta { font-size: 0.75rem; color: #636e72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; }
.role-badge.admin { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.role-badge.user { background: #e0e0e0; color: #636e72; }
.user-actions { display: flex; gap: 6px; flex-shrink: 0; }
.btn-action { padding: 8px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.3s; font-weight: 600; }
.btn-action.remove-family { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.btn-action.remove-family:hover { background: #dc2626; color: white; }
.btn-action.add-family { background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
.btn-action.add-family:hover { background: #059669; color: white; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

:global(.dark) .user-manager { background: #16213e; }
:global(.dark) .manager-header h2 { color: #e0e0e0; }
:global(.dark) .user-card { background: linear-gradient(135deg, #2d3748 0%, #1a1a2e 100%); }
:global(.dark) .user-name { color: #e0e0e0; }
</style>

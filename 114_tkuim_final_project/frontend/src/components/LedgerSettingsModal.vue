<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { t } from '../i18n.js'

const props = defineProps({
  ledger: { type: Object, required: true },
  currentUser: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updated', 'deleted'])

const activeTab = ref('general')
const isLoading = ref(false)
const ledgerName = ref(props.ledger?.name || '')
const members = ref([])
const inviteCode = ref('')
const copyFeedback = ref(false)

const isOwner = computed(() => props.ledger?.owner_id === props.currentUser?.id)

// --- API Functions (defined BEFORE watch to avoid hoisting issues) ---
const fetchMembers = async () => {
  if (!props.ledger?.id) return
  try {
    const res = await axios.get(`/api/ledgers/${props.ledger.id}/members`)
    members.value = res.data.members || []
    inviteCode.value = res.data.invite_code || ''
  } catch (err) {
    console.error(err)
  }
}

const updateLedger = async () => {
    if (!ledgerName.value.trim()) return
    isLoading.value = true
    try {
         emit('updated')
         await axios.put(`/api/ledgers/${props.ledger.id}`, { name: ledgerName.value })
         emit('close')
    } catch (err) {
        alert(t('op_failed'))
    } finally {
        isLoading.value = false
    }
}

const generateInvite = async () => {
    isLoading.value = true
    try {
        const res = await axios.post(`/api/ledgers/${props.ledger.id}/invite`)
        inviteCode.value = res.data.code
        await fetchMembers()
    } catch (err) {
        alert(t('op_failed'))
    } finally {
        isLoading.value = false
    }
}

const copyInviteCode = () => {
    if (!inviteCode.value) return
    navigator.clipboard.writeText(inviteCode.value)
    copyFeedback.value = true
    setTimeout(() => copyFeedback.value = false, 2000)
}

const removeMember = async (memberId, memberName) => {
    if(!confirm(t('remove_member_confirm').replace('{name}', memberName))) return
    try {
        await axios.post(`/api/ledgers/${props.ledger.id}/remove_member?member_id=${memberId}`)
        fetchMembers()
    } catch (err) {
        alert(t('op_failed'))
    }
}

const leaveLedger = async () => {
    if(!confirm(t('leave_ledger_confirm'))) return
    try {
        await axios.post(`/api/ledgers/${props.ledger.id}/leave`)
        emit('deleted')
        emit('close')
    } catch (err) {
        alert(t('op_failed'))
    }
}

const deleteLedger = async () => {
    if(!confirm(t('delete_ledger_confirm'))) return
    try {
        await axios.delete(`/api/ledgers/${props.ledger.id}`)
        emit('deleted')
        emit('close')
    } catch (err) {
        alert(t('op_failed'))
    }
}

// Watch for ledger prop changes (defined AFTER fetchMembers)
watch(() => props.ledger, (newVal) => {
    if (newVal?.id) {
        ledgerName.value = newVal.name || ''
        fetchMembers()
    }
}, { deep: true })

onMounted(() => {
    if (props.ledger?.id) {
        fetchMembers()
    }
})
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card-premium">
      
      <!-- Header -->
      <div class="modal-header">
        <h3>{{ t('ledger_settings') }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <!-- Tabs (Pill Style) -->
      <div class="pill-tabs">
        <button 
          :class="['pill-btn', { active: activeTab === 'general' }]" 
          @click="activeTab = 'general'"
        >
          {{ t('general') }}
        </button>
        <button 
          :class="['pill-btn', { active: activeTab === 'members' }]" 
          @click="activeTab = 'members'"
        >
          {{ t('members') }}
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content-body">
        
        <!-- General Tab -->
        <div v-if="activeTab === 'general'">
            <div class="input-group">
                <label>{{ t('ledger_name') }}</label>
                <input 
                  v-model="ledgerName" 
                  type="text" 
                  class="premium-input" 
                  :placeholder="t('ledger_name_ph')"
                />
            </div>
            
            <button class="btn-primary-gradient" @click="updateLedger" :disabled="isLoading">
                {{ t('save_changes') }}
            </button>

            <!-- Danger Zone -->
            <div class="danger-block">
                <h4>⚠️ {{ t('danger_zone') }}</h4>
                <div v-if="isOwner">
                    <button class="btn-danger-soft" @click="deleteLedger">
                        {{ t('delete_ledger') }}
                    </button>
                </div>
                <div v-else>
                    <button class="btn-danger-soft" @click="leaveLedger">
                        {{ t('leave_ledger') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Members Tab -->
        <div v-if="activeTab === 'members'">
            <!-- Invite -->
            <div class="invite-box">
                <p class="invite-label">{{ t('invite_member') }}</p>
                <div v-if="inviteCode" class="code-row" @click="copyInviteCode">
                    <span class="code-text">{{ inviteCode }}</span>
                    <span class="copy-hint" v-if="copyFeedback">✅</span>
                    <span class="copy-hint" v-else>📋</span>
                </div>
                <button v-else class="btn-secondary-soft" @click="generateInvite" :disabled="isLoading">
                    {{ t('gen_invite_code') }}
                </button>
            </div>

            <!-- List -->
            <div class="members-list">
                <div v-for="m in members" :key="m.id" class="member-row">
                    <div class="member-left">
                        <div class="avatar">{{ m.display_name ? m.display_name[0] : '?' }}</div>
                        <span class="name">
                            {{ m.display_name }}
                            <span v-if="m.id === props.ledger?.owner_id" class="owner-tag">👑</span>
                        </span>
                    </div>
                    <button 
                        v-if="isOwner && m.id !== currentUser.id" 
                        class="btn-icon-remove"
                        @click="removeMember(m.id, m.display_name)"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Core Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.modal-card-premium {
  background: white;
  border-radius: 24px;
  padding: 30px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #2d3436;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #b2bec3;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover { color: #2d3436; }

/* Tabs */
.pill-tabs {
  display: flex;
  background: #f1f2f6;
  padding: 5px;
  border-radius: 16px;
  gap: 5px;
}

.pill-btn {
  flex: 1;
  border: none;
  background: none;
  padding: 10px;
  border-radius: 12px;
  font-weight: 600;
  color: #636e72;
  cursor: pointer;
  transition: all 0.3s;
}

.pill-btn.active {
  background: white;
  color: #6c5ce7;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Form Elements */
.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #636e72;
  font-weight: 500;
  font-size: 0.95rem;
}

.premium-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #dfe6e9;
  border-radius: 14px;
  font-size: 1rem;
  transition: all 0.3s;
  outline: none;
}

.premium-input:focus {
  border-color: #a29bfe;
  box-shadow: 0 0 0 3px rgba(162, 155, 254, 0.2);
}

.btn-primary-gradient {
  width: 100%;
  margin-top: 15px;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  color: white;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(108, 92, 231, 0.4);
}

.btn-primary-gradient:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Danger Zone */
.danger-block {
  margin-top: 25px;
  border-top: 2px dashed #ffeaa7;
  padding-top: 20px;
}

.danger-block h4 {
  margin: 0 0 15px 0;
  font-size: 0.9rem;
  color: #d63031;
}

.btn-danger-soft {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #fff5f5;
  color: #d63031;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger-soft:hover {
  background: #ffe3e3;
}

/* Invite & Members */
.invite-box {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 15px;
  text-align: center;
  margin-bottom: 20px;
}

.invite-label {
  margin: 0 0 10px 0;
  color: #636e72;
  font-size: 0.9rem;
}

.code-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.code-row:hover {
  border-color: #6c5ce7;
  background: #fdfdff;
}

.code-text {
  font-family: monospace;
  font-size: 1.2rem;
  font-weight: bold;
  color: #2d3436;
  letter-spacing: 2px;
}

.btn-secondary-soft {
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  background: #e1e4e8;
  color: #2d3436;
  font-weight: bold;
  cursor: pointer;
}

.btn-secondary-soft:hover { background: #d1d5db; }

.members-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 250px;
  overflow-y: auto;
}

.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f1f2f6;
}

.member-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
}

.name {
  font-weight: 500;
  color: #2d3436;
}

.owner-tag {
  font-size: 0.8rem;
  margin-left: 5px;
}

.btn-icon-remove {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
}

.btn-icon-remove:hover {
  background: #ef4444;
  color: white;
}

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* Dark Mode Support */
:global(.dark) .modal-card-premium {
  background: #1e272e;
}
:global(.dark) .modal-header h3 { color: #f5f6fa; }
:global(.dark) .pill-tabs { background: #2f3640; }
:global(.dark) .pill-btn { color: #a4b0be; }
:global(.dark) .pill-btn.active { background: #353b48; color: #a29bfe; }
:global(.dark) .premium-input { background: #2f3640; border-color: #353b48; color: white; }
:global(.dark) .invite-box { background: #2f3640; }
:global(.dark) .code-row { background: #353b48; border-color: #485460; }
:global(.dark) .member-row { border-color: #353b48; }
:global(.dark) .name { color: #f5f6fa; }

</style>

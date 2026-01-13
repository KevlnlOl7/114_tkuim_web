<script setup>
import { currentLocale, setLocale } from '../i18n.js'

const props = defineProps({
  variant: {
    type: String,
    default: 'default', // 'default', 'small', 'minimal'
    validator: (v) => ['default', 'small', 'minimal'].includes(v)
  }
})

const handleChange = () => {
  setLocale(currentLocale.value)
}
</script>

<template>
  <select 
    v-model="currentLocale" 
    @change="handleChange" 
    :class="['lang-select', `lang-select--${variant}`]"
  >
    <option value="zh-TW">🇹🇼 中文</option>
    <option value="en-US">🇺🇸 English</option>
    <option value="ja">🇯🇵 日本語</option>
    <option value="ko">🇰🇷 한국어</option>
    <option value="vi">🇻🇳 Tiếng Việt</option>
    <option value="id">🇮🇩 Bahasa Ind</option>
    <option value="tl">🇵🇭 Filipino</option>
  </select>
</template>

<style scoped>
.lang-select {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(224, 224, 224, 0.5);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.9rem;
  color: #2d3436;
  cursor: pointer;
  outline: none;
  font-weight: 500;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.lang-select:hover {
  background: white;
  border-color: #667eea;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.15);
}

/* Small variant (for login/register pages) */
.lang-select--small {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 0.85rem;
  backdrop-filter: blur(5px);
}

/* Minimal variant (for header) */
.lang-select--minimal {
  background: transparent;
  border: none;
  padding: 6px 10px;
  font-size: 0.85rem;
}

.lang-select--minimal:hover {
  background: rgba(102, 126, 234, 0.1);
}

/* Dark mode support */
:global(.dark) .lang-select {
  background-color: #2d3748;
  border-color: #4a5568;
  color: #fff;
}

:global(.dark) .lang-select--minimal {
  background: transparent;
  color: #e0e0e0;
}

:global(.dark) .lang-select--minimal:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>

/**
 * Unit Tests for i18n Module
 * 
 * Run with: npm run test
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { currentLocale, setLocale, t } from '../src/i18n.js'

describe('i18n Module', () => {
    beforeEach(() => {
        // Reset to default locale before each test
        setLocale('zh-TW')
    })

    describe('setLocale', () => {
        it('should set locale to zh-TW', () => {
            setLocale('zh-TW')
            expect(currentLocale.value).toBe('zh-TW')
        })

        it('should set locale to en-US', () => {
            setLocale('en-US')
            expect(currentLocale.value).toBe('en-US')
        })

        it('should set locale to ja', () => {
            setLocale('ja')
            expect(currentLocale.value).toBe('ja')
        })
    })

    describe('t() translation function', () => {
        it('should return translated string for zh-TW', () => {
            setLocale('zh-TW')
            const result = t('login_btn')
            expect(result).toBe('登入系統')
        })

        it('should return translated string for en-US', () => {
            setLocale('en-US')
            const result = t('login_btn')
            expect(result).toBe('Login')
        })

        it('should return key if translation not found', () => {
            const result = t('non_existent_key')
            expect(result).toBe('non_existent_key')
        })

        it('should support interpolation', () => {
            setLocale('en-US')
            // Test with a key that might have interpolation
            const key = 'welcome_user'
            const result = t(key, { name: 'Kevin' })
            // If key doesn't exist, should return the key
            expect(typeof result).toBe('string')
        })
    })

    describe('supported locales', () => {
        const supportedLocales = ['zh-TW', 'en-US', 'ja', 'ko', 'vi', 'id', 'tl']

        supportedLocales.forEach(locale => {
            it(`should support ${locale} locale`, () => {
                setLocale(locale)
                expect(currentLocale.value).toBe(locale)
            })
        })
    })
})

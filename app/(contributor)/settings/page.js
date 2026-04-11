'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Bell, Shield, Palette, Github, Mail, Globe, Save, Loader2 } from 'lucide-react'
import { account } from '@/lib/appwrite'
import Topbar from '@/components/layout/Topbar'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [githubHandle, setGithubHandle] = useState('')
  
  // Settings state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [mentorshipNotifications, setMentorshipNotifications] = useState(true)
  const [profileVisibility, setProfileVisibility] = useState('public')

  // Load user data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const currentUser = await account.get()
        if (mounted) {
          setUser(currentUser)
          setDisplayName(currentUser.name || '')
          
          // Get GitHub handle
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('mergeship_handle')
            if (stored) {
              setGithubHandle(stored)
            } else {
              const ids = await account.listIdentities()
              const gh = (ids?.identities || []).find((i) => i.provider === 'github')
              if (gh?.providerUid) {
                const r = await fetch(`https://api.github.com/user/${gh.providerUid}`)
                if (r.ok) {
                  const u = await r.json()
                  setGithubHandle(u.login)
                  localStorage.setItem('mergeship_handle', u.login)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update Appwrite user name
      if (displayName && displayName !== user?.name) {
        await account.updateName(displayName)
      }
      
      // Save preferences to localStorage (MVP - would be Appwrite in production)
      if (typeof window !== 'undefined') {
        localStorage.setItem('mergeship_settings', JSON.stringify({
          bio,
          emailNotifications,
          mentorshipNotifications,
          profileVisibility,
          updatedAt: new Date().toISOString()
        }))
      }
      
      // Show success (you can add a toast here)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mergeship_settings')
      if (saved) {
        try {
          const settings = JSON.parse(saved)
          setBio(settings.bio || '')
          setEmailNotifications(settings.emailNotifications !== false)
          setMentorshipNotifications(settings.mentorshipNotifications !== false)
          setProfileVisibility(settings.profileVisibility || 'public')
        } catch (e) {
          console.error('Failed to parse settings:', e)
        }
      }
    }
  }, [])

  if (loading) {
    return (
      <>
        <Topbar title="Settings" subtitle="Loading..." />
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#A78BFA]" />
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Manage your account preferences"
      />

      <div className="max-w-4xl mx-auto px-6 md:px-12 py-10">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[13px] text-[#A0A0C0] hover:text-[#F8F8FF] transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="h-5 w-5 text-[#A78BFA]" />
              <h2 className="text-lg font-bold text-[#F8F8FF]">Profile Settings</h2>
            </div>
            
            <div className="space-y-4">
              {/* GitHub Handle (Read-only) */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-2">
                  GitHub Handle
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0D0D15] border border-white/5 rounded-lg">
                  <Github className="h-4 w-4 text-[#8B7E9F]" />
                  <span className="text-[14px] text-[#F8F8FF]">@{githubHandle || 'Loading...'}</span>
                </div>
                <p className="text-[11px] text-[#606080] mt-1">Connected via GitHub OAuth</p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-3 bg-[#0D0D15] border border-white/5 rounded-lg text-[14px] text-[#F8F8FF] placeholder-[#606080] focus:outline-none focus:border-[#A78BFA] transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0D0D15] border border-white/5 rounded-lg text-[14px] text-[#F8F8FF] placeholder-[#606080] focus:outline-none focus:border-[#A78BFA] transition-colors resize-none"
                />
                <p className="text-[11px] text-[#606080] mt-1">{bio.length}/500 characters</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-2">
                  Email
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0D0D15] border border-white/5 rounded-lg">
                  <Mail className="h-4 w-4 text-[#8B7E9F]" />
                  <span className="text-[14px] text-[#F8F8FF]">{user?.email || 'Not available'}</span>
                </div>
                <p className="text-[11px] text-[#606080] mt-1">Managed by your GitHub account</p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5 text-[#A78BFA]" />
              <h2 className="text-lg font-bold text-[#F8F8FF]">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-[#0D0D15] border border-white/5 rounded-lg">
                <div>
                  <div className="text-[14px] font-medium text-[#F8F8FF]">Email Notifications</div>
                  <div className="text-[12px] text-[#8B7E9F] mt-1">Receive updates via email</div>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    emailNotifications ? 'bg-[#A78BFA]' : 'bg-[#2A2136]'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    emailNotifications ? 'transform translate-x-6' : ''
                  }`} />
                </button>
              </div>

              {/* Mentorship Notifications */}
              <div className="flex items-center justify-between p-4 bg-[#0D0D15] border border-white/5 rounded-lg">
                <div>
                  <div className="text-[14px] font-medium text-[#F8F8FF]">Mentorship Notifications</div>
                  <div className="text-[12px] text-[#8B7E9F] mt-1">Get notified about mentorship requests</div>
                </div>
                <button
                  onClick={() => setMentorshipNotifications(!mentorshipNotifications)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    mentorshipNotifications ? 'bg-[#A78BFA]' : 'bg-[#2A2136]'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    mentorshipNotifications ? 'transform translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-[#A78BFA]" />
              <h2 className="text-lg font-bold text-[#F8F8FF]">Privacy & Security</h2>
            </div>
            
            <div className="space-y-4">
              {/* Profile Visibility */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-2">
                  Profile Visibility
                </label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0D0D15] border border-white/5 rounded-lg text-[14px] text-[#F8F8FF] focus:outline-none focus:border-[#A78BFA] transition-colors"
                >
                  <option value="public">Public - Visible to everyone</option>
                  <option value="contributors">Contributors Only - Visible to logged-in users</option>
                  <option value="private">Private - Only you can see your profile</option>
                </select>
              </div>

              {/* Connected Accounts */}
              <div>
                <label className="block text-[12px] font-medium text-[#8B7E9F] mb-3">
                  Connected Accounts
                </label>
                <div className="flex items-center justify-between p-4 bg-[#0D0D15] border border-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-[#F8F8FF]" />
                    <div>
                      <div className="text-[14px] font-medium text-[#F8F8FF]">GitHub</div>
                      <div className="text-[12px] text-[#8B7E9F]">@{githubHandle}</div>
                    </div>
                  </div>
                  <div className="text-[11px] px-3 py-1 rounded-full bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20">
                    Connected
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-5 w-5 text-[#A78BFA]" />
              <h2 className="text-lg font-bold text-[#F8F8FF]">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#0D0D15] border border-white/5 rounded-lg">
                <div className="text-[14px] font-medium text-[#F8F8FF] mb-2">Theme</div>
                <div className="text-[12px] text-[#8B7E9F]">
                  Dark mode is currently enabled by default. Light mode coming soon!
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 text-[14px] font-medium text-[#A0A0C0] hover:text-[#F8F8FF] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white text-[14px] font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

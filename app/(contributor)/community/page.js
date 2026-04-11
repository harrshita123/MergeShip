'use client'

import { Lock, Code2, Terminal, Flame, Trophy, Github, Users, Shield } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'

export default function CommunityPage() {
  return (
    <>
      <Topbar
        title="Community Hub"
        subtitle="Connect with guilds, find mentors, and level up together"
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mentorship Banner (LOCKED) */}
            <div className="relative rounded-2xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
              />
              <div className="relative bg-[#1E1826] border-2 border-[#EF4444]/30 p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-[#EF4444]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center">
                      <Shield className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      1-on-1 Core Mentorship
                    </h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] text-[10px] font-black uppercase tracking-widest border border-[#EF4444]/40">
                      REQUIRES LEVEL 5
                    </div>
                  </div>
                </div>

                <p className="text-[14px] text-[#8B7E9F] mb-4 leading-relaxed">
                  Get paired with experienced maintainers for personalized guidance, code reviews, and career advice. Unlock exclusive networking opportunities.
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-[#8B7E9F]">Your Progress to Level 5</span>
                    <span className="font-bold text-[#A78BFA]">12,450 / 25,000 XP</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all relative"
                      style={{
                        width: '49.8%',
                        background: 'linear-gradient(90deg, #A78BFA 0%, #8B5CF6 100%)',
                      }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 animate-pulse" />
                    </div>
                  </div>
                </div>

                <button className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-[13px] font-bold hover:bg-white/20 transition-colors">
                  Preview Mentor Hub
                </button>
              </div>
            </div>

            {/* Recommended Guilds */}
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Recommended Guilds
              </h2>
              <div className="space-y-4">
                <GuildCard
                  icon={Code2}
                  name="React Performance"
                  color="#38BDF8"
                  online={142}
                  description="Master optimization techniques, profiling tools, and best practices for building lightning-fast React applications."
                  members={['https://github.com/gaearon.png', 'https://github.com/sophiebits.png', 'https://github.com/acdlite.png']}
                />
                <GuildCard
                  icon={Terminal}
                  name="Rust Systems"
                  color="#FB923C"
                  online={89}
                  description="Dive deep into systems programming, memory safety, and concurrent computing with the Rust community."
                  members={['https://github.com/steveklabnik.png', 'https://github.com/nikomatsakis.png']}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Guild Challenge */}
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FACC15]/20 border border-[#FACC15]/40 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-[#FACC15]" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FACC15]">
                    Weekly Challenge
                  </div>
                </div>
              </div>

              <h3 className="text-[15px] font-bold mb-3">
                Squash 3 Easy Dependency Bugs
              </h3>

              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-[#8B7E9F]">Progress</span>
                  <span className="font-bold text-[#FACC15]">1 / 3</span>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1 h-2 bg-[#FACC15] rounded-full" />
                  <div className="flex-1 h-2 bg-white/5 rounded-full" />
                  <div className="flex-1 h-2 bg-white/5 rounded-full" />
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
                  Rewards
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Trophy className="h-3 w-3 text-[#FACC15]" />
                    <span className="text-[#F8F8FF]">+500 XP</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <Trophy className="h-3 w-3 text-[#A78BFA]" />
                    <span className="text-[#F8F8FF]">Pioneer Badge</span>
                  </div>
                </div>
              </div>

              <button className="w-full px-4 py-2 rounded-lg bg-[#FACC15] text-black text-[13px] font-bold hover:bg-[#FCD34D] transition-colors">
                Find Matching Issues
              </button>
            </div>

            {/* Your Graph */}
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Github className="h-4 w-4 text-[#A78BFA]" />
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
                  Your Graph
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[11px] text-[#8B7E9F] mb-1">Followers</div>
                  <div className="text-[20px] font-bold text-[#A78BFA]">42</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[11px] text-[#8B7E9F] mb-1">Following</div>
                  <div className="text-[20px] font-bold text-[#F8F8FF]">128</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-[11px] text-[#8B7E9F] mb-1">Guilds Joined</div>
                  <div className="text-[20px] font-bold text-[#FACC15]">2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function GuildCard({ icon: Icon, name, color, online, description, members }) {
  return (
    <div className="bg-[#1E1826] border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all group cursor-pointer">
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}
        >
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-[17px] font-bold mb-1 group-hover:text-[#A78BFA] transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#4ADE80] status-online" />
              <span className="text-[11px] font-bold text-[#4ADE80]">{online} ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-[#8B7E9F] leading-relaxed mb-4">
        {description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {members.map((avatar, idx) => (
            <img
              key={idx}
              src={`${avatar}?size=64`}
              alt="Member"
              className="w-8 h-8 rounded-full border-2 border-[#1E1826]"
              onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
            />
          ))}
        </div>
        <button className="px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[12px] font-bold hover:bg-white/20 transition-colors">
          Join Guild
        </button>
      </div>
    </div>
  )
}

// Static fallback achievements used when server data is unavailable.
// Ids and XP rewards match the server action shape for a clean merge.

export const STATIC_ACHIEVEMENTS = [
  { id: 'first_contribution', title: 'First Steps',           emoji: '🎯', description: 'Merge your first PR',            xpReward: 100, unlocked: true,  progress: 1,  target: 1  },
  { id: 'bug_hunter',         title: 'Bug Hunter',            emoji: '🐛', description: 'Close 5 issues',                 xpReward: 200, unlocked: true,  progress: 5,  target: 5  },
  { id: 'streak_master',      title: 'Streak Master',         emoji: '🔥', description: 'Maintain a 7-day streak',        xpReward: 150, unlocked: true,  progress: 7,  target: 7  },
  { id: 'quick_draw',         title: 'Quick Draw',            emoji: '⚡', description: 'Merge 10 pull requests',         xpReward: 300, unlocked: false, progress: 4,  target: 10 },
  { id: 'mentor',             title: 'Mentor',                emoji: '🎓', description: 'Earn 5 followers',               xpReward: 400, unlocked: false, progress: 1,  target: 5  },
  { id: 'docs_master',        title: 'Documentation Master',  emoji: '📚', description: 'Ship 10 docs contributions',     xpReward: 250, unlocked: false, progress: 3,  target: 10 },
  { id: 'polyglot',           title: 'Polyglot',              emoji: '🌐', description: 'Ship in 5 languages',            xpReward: 350, unlocked: false, progress: 2,  target: 5  },
  { id: 'community_leader',   title: 'Community Leader',      emoji: '👑', description: 'Reach 100 followers',            xpReward: 1000, unlocked: false, progress: 0, target: 100 },
]

export const RARITY_GRADIENTS = {
  Legendary: 'linear-gradient(135deg, #FBBF24 0%, #EF4444 100%)',
  Epic:      'linear-gradient(135deg, #A78BFA 0%, #6D28D9 100%)',
  Rare:      'linear-gradient(135deg, #67E8F9 0%, #1D4ED8 100%)',
  Common:    'linear-gradient(135deg, #A0A0C0 0%, #4B5563 100%)',
}

export const RARITY_COLORS = {
  Legendary: '#FBBF24',
  Epic:      '#A78BFA',
  Rare:      '#67E8F9',
  Common:    '#A0A0C0',
}

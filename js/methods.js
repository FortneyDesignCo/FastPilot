// All known intermittent fasting methods
const FASTING_METHODS = [
  {
    id: '16-8',
    name: '16:8',
    subtitle: 'Leangains',
    fastHours: 16,
    eatHours: 8,
    description: 'The most popular IF method. Fast for 16 hours, eat within an 8-hour window. Ideal for beginners and sustainable long-term.',
    category: 'daily',
    difficulty: 'Beginner',
    icon: '\u2615'
  },
  {
    id: '18-6',
    name: '18:6',
    subtitle: 'Standard',
    fastHours: 18,
    eatHours: 6,
    description: 'A moderate step up from 16:8. Fast for 18 hours with a 6-hour eating window. Good balance of benefits and sustainability.',
    category: 'daily',
    difficulty: 'Beginner',
    icon: '\u26A1'
  },
  {
    id: '14-10',
    name: '14:10',
    subtitle: 'Gentle Start',
    fastHours: 14,
    eatHours: 10,
    description: 'The gentlest daily fasting protocol. Fast for 14 hours with a 10-hour eating window. Perfect for those new to fasting.',
    category: 'daily',
    difficulty: 'Beginner',
    icon: '\uD83C\uDF31'
  },
  {
    id: '12-12',
    name: '12:12',
    subtitle: 'Circadian',
    fastHours: 12,
    eatHours: 12,
    description: 'Aligned with your circadian rhythm. Fast overnight for 12 hours. The easiest protocol and a great starting point.',
    category: 'daily',
    difficulty: 'Beginner',
    icon: '\uD83C\uDF19'
  },
  {
    id: '20-4',
    name: '20:4',
    subtitle: 'Warrior Diet',
    fastHours: 20,
    eatHours: 4,
    description: 'Inspired by ancient warrior eating patterns. Fast for 20 hours, eat within a 4-hour window. Small snacks of raw fruits/veggies allowed during the fast.',
    category: 'daily',
    difficulty: 'Intermediate',
    icon: '\uD83D\uDEE1\uFE0F'
  },
  {
    id: '23-1',
    name: 'OMAD',
    subtitle: 'One Meal A Day',
    fastHours: 23,
    eatHours: 1,
    description: 'Eat one large meal per day within a 1-hour window. Maximizes fasting benefits but requires careful nutrition planning.',
    category: 'daily',
    difficulty: 'Advanced',
    icon: '\uD83C\uDF7D\uFE0F'
  },
  {
    id: '5-2',
    name: '5:2 Diet',
    subtitle: 'Modified Fasting',
    fastHours: 24,
    eatHours: 0,
    description: 'Eat normally 5 days per week. On 2 non-consecutive days, limit calories to 500-600. Not a complete fast but highly effective.',
    category: 'weekly',
    difficulty: 'Intermediate',
    icon: '\uD83D\uDCC5',
    isCalorieRestricted: true,
    restrictedCalories: 500
  },
  {
    id: 'eat-stop-eat',
    name: 'Eat-Stop-Eat',
    subtitle: '24h Fasts',
    fastHours: 24,
    eatHours: 0,
    description: 'Perform one or two 24-hour fasts per week. For example, fast from dinner one day to dinner the next day. Created by Brad Pilon.',
    category: 'weekly',
    difficulty: 'Intermediate',
    icon: '\u23F8\uFE0F'
  },
  {
    id: 'adf',
    name: 'ADF',
    subtitle: 'Alternate Day Fasting',
    fastHours: 36,
    eatHours: 12,
    description: 'Alternate between fasting days (zero or minimal calories) and regular eating days. One of the most studied IF methods.',
    category: 'weekly',
    difficulty: 'Advanced',
    icon: '\uD83D\uDD04'
  },
  {
    id: '36-hour',
    name: '36-Hour Fast',
    subtitle: 'Extended',
    fastHours: 36,
    eatHours: 0,
    description: 'A 36-hour water fast, typically from dinner one day through the entire next day to breakfast the following morning.',
    category: 'extended',
    difficulty: 'Advanced',
    icon: '\uD83D\uDD25'
  },
  {
    id: '48-hour',
    name: '48-Hour Fast',
    subtitle: 'Deep Fast',
    fastHours: 48,
    eatHours: 0,
    description: 'A two-day water fast. Significant autophagy and cellular repair benefits. Should not be done more than once or twice a month.',
    category: 'extended',
    difficulty: 'Advanced',
    icon: '\uD83E\uDDCA'
  },
  {
    id: '72-hour',
    name: '72-Hour Fast',
    subtitle: 'Reset Fast',
    fastHours: 72,
    eatHours: 0,
    description: 'A three-day water fast for deep cellular regeneration and immune system reset. Consult a doctor before attempting. Maximum once per month.',
    category: 'extended',
    difficulty: 'Expert',
    icon: '\uD83E\uDDEC'
  },
  {
    id: 'circadian',
    name: 'Circadian',
    subtitle: 'Rhythm Fasting',
    fastHours: 13,
    eatHours: 11,
    description: 'Eat in alignment with your body\'s circadian clock. Finish eating by sunset, fast until sunrise. Focus is on timing, not just duration.',
    category: 'daily',
    difficulty: 'Beginner',
    icon: '\u2600\uFE0F'
  },
  {
    id: 'custom',
    name: 'Custom',
    subtitle: 'Your Protocol',
    fastHours: 16,
    eatHours: 8,
    description: 'Create your own fasting protocol. Set your own fasting and eating windows to match your lifestyle.',
    category: 'daily',
    difficulty: 'Any',
    icon: '\u2699\uFE0F',
    isCustom: true
  }
];

function getMethodById(id) {
  return FASTING_METHODS.find(m => m.id === id) || FASTING_METHODS[0];
}

function getMethodCategories() {
  return {
    daily: { label: 'Daily Protocols', methods: FASTING_METHODS.filter(m => m.category === 'daily') },
    weekly: { label: 'Weekly Protocols', methods: FASTING_METHODS.filter(m => m.category === 'weekly') },
    extended: { label: 'Extended Fasts', methods: FASTING_METHODS.filter(m => m.category === 'extended') }
  };
}

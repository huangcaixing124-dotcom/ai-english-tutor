// 场景配置
export const SCENARIOS = {
  free: {
    id: 'free',
    label: 'Free Talk',
    labelCn: '自由对话',
    prompt: 'Have a natural, free-flowing conversation. Talk about any topic the user brings up.',
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    labelCn: '餐厅点餐',
    prompt: 'Role-play a restaurant scenario. You are a waiter/server. Take the user\'s order, answer questions about the menu, and make recommendations. Use common restaurant phrases.',
  },
  interview: {
    id: 'interview',
    label: 'Job Interview',
    labelCn: '求职面试',
    prompt: 'Role-play a job interview. You are the interviewer. Ask common interview questions, give feedback on the user\'s answers, and help them practice professional English.',
  },
  travel: {
    id: 'travel',
    label: 'Travel',
    labelCn: '旅行出行',
    prompt: 'Role-play a travel scenario. You are a helpful travel assistant or local. Help the user with airport check-in, hotel booking, asking for directions, ordering transportation, etc.',
  },
  shopping: {
    id: 'shopping',
    label: 'Shopping',
    labelCn: '购物逛街',
    prompt: 'Role-play a shopping scenario. You are a shop assistant. Help the user browse products, ask about sizes/colors/prices, and complete a purchase.',
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel',
    labelCn: '酒店入住',
    prompt: 'Role-play a hotel scenario. You are a hotel receptionist. Help the user check in, answer questions about amenities, handle requests, and practice hotel-related English.',
  },
};

export type ScenarioId = keyof typeof SCENARIOS;

// 难度等级
export const DIFFICULTIES = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    labelCn: '初级',
    prompt: 'Use simple vocabulary and short sentences. Speak slowly and clearly. Provide more Chinese translation support. Be very encouraging.',
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    labelCn: '中级',
    prompt: 'Use moderate vocabulary and natural sentence structures. Occasionally introduce new words. Provide balanced English practice.',
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced',
    labelCn: '高级',
    prompt: 'Use sophisticated vocabulary and complex sentences. Speak at a natural pace. Introduce idioms and nuanced expressions. Minimize Chinese support.',
  },
};

export type DifficultyId = keyof typeof DIFFICULTIES;
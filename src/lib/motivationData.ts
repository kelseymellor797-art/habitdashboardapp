export type QuoteCategory =
  | 'dance' | 'strength' | 'mindset' | 'consistency'
  | 'confidence' | 'growth' | 'self_love' | 'general';

export interface Quote {
  id: string;
  text: string;
  author?: string;
  category: QuoteCategory;
  isFavorite: boolean;
  isCustom: boolean;
  createdAt?: string;
}

const QUOTES_KEY = "wellness-quotes";

const DEFAULT_QUOTES: Quote[] = [
  // dance
  { id: "q-d1", text: "The body says what words cannot.", author: "Martha Graham", category: "dance", isFavorite: false, isCustom: false },
  { id: "q-d2", text: "To watch us dance is to hear our hearts speak.", author: "Indian proverb", category: "dance", isFavorite: false, isCustom: false },
  { id: "q-d3", text: "Dance is the hidden language of the soul.", category: "dance", isFavorite: false, isCustom: false },
  { id: "q-d4", text: "Every class is a chance to fall in love with movement again.", category: "dance", isFavorite: false, isCustom: false },
  { id: "q-d5", text: "Pole is not just a sport. It's a conversation between you and gravity.", category: "dance", isFavorite: false, isCustom: false },
  // strength
  { id: "q-s1", text: "Strength doesn't arrive. It accumulates.", category: "strength", isFavorite: false, isCustom: false },
  { id: "q-s2", text: "Every rep is a deposit in your future body.", category: "strength", isFavorite: false, isCustom: false },
  { id: "q-s3", text: "You are building something real.", category: "strength", isFavorite: false, isCustom: false },
  { id: "q-s4", text: "The grips get stronger. The falls get rarer. Keep going.", category: "strength", isFavorite: false, isCustom: false },
  { id: "q-s5", text: "Your body is learning. Give it time.", category: "strength", isFavorite: false, isCustom: false },
  // mindset
  { id: "q-m1", text: "Progress is not linear and that's completely okay.", category: "mindset", isFavorite: false, isCustom: false },
  { id: "q-m2", text: "You don't have to earn rest. Rest is part of the work.", category: "mindset", isFavorite: false, isCustom: false },
  { id: "q-m3", text: "A bad training day is still a training day.", category: "mindset", isFavorite: false, isCustom: false },
  { id: "q-m4", text: "Trust the process even when you can't see the results yet.", category: "mindset", isFavorite: false, isCustom: false },
  { id: "q-m5", text: "Comparison is the thief of your own unique journey.", category: "mindset", isFavorite: false, isCustom: false },
  // consistency
  { id: "q-c1", text: "Show up. Even on the days you don't want to. Especially then.", category: "consistency", isFavorite: false, isCustom: false },
  { id: "q-c2", text: "Slow progress is still progress.", category: "consistency", isFavorite: false, isCustom: false },
  { id: "q-c3", text: "Consistency counts even before visible results.", category: "consistency", isFavorite: false, isCustom: false },
  { id: "q-c4", text: "The most powerful thing you can do is keep showing up.", category: "consistency", isFavorite: false, isCustom: false },
  { id: "q-c5", text: "One more session. One more rep. One more try.", category: "consistency", isFavorite: false, isCustom: false },
  // confidence
  { id: "q-cf1", text: "You are more capable than you believe right now.", category: "confidence", isFavorite: false, isCustom: false },
  { id: "q-cf2", text: "Confidence is built in the doing, not the knowing.", category: "confidence", isFavorite: false, isCustom: false },
  { id: "q-cf3", text: "You belong in the studio. You belong on the pole.", category: "confidence", isFavorite: false, isCustom: false },
  { id: "q-cf4", text: "Nobody started out consistent. They just started.", category: "confidence", isFavorite: false, isCustom: false },
  { id: "q-cf5", text: "Fake the confidence until it becomes real. It always does.", category: "confidence", isFavorite: false, isCustom: false },
  // growth
  { id: "q-g1", text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson", category: "growth", isFavorite: false, isCustom: false },
  { id: "q-g2", text: "The goal is not perfection. The goal is evolution.", category: "growth", isFavorite: false, isCustom: false },
  { id: "q-g3", text: "You are allowed to be a beginner for as long as you need.", category: "growth", isFavorite: false, isCustom: false },
  { id: "q-g4", text: "What feels impossible today will feel easy in six months.", category: "growth", isFavorite: false, isCustom: false },
  { id: "q-g5", text: "Growth looks like failure before it looks like success.", category: "growth", isFavorite: false, isCustom: false },
  // self_love
  { id: "q-sl1", text: "Your body does hard things every day. Honor it.", category: "self_love", isFavorite: false, isCustom: false },
  { id: "q-sl2", text: "Rest is productive. Recovery is part of training.", category: "self_love", isFavorite: false, isCustom: false },
  { id: "q-sl3", text: "You deserve to take up space — on the pole, in the room, in your life.", category: "self_love", isFavorite: false, isCustom: false },
  { id: "q-sl4", text: "Be patient with yourself. You are a work in progress.", category: "self_love", isFavorite: false, isCustom: false },
  { id: "q-sl5", text: "Nourish the body that carries you through everything.", category: "self_love", isFavorite: false, isCustom: false },
  // general
  { id: "q-gen1", text: "Small daily improvements compound into extraordinary results.", category: "general", isFavorite: false, isCustom: false },
  { id: "q-gen2", text: "The version of you six months from now will thank you.", category: "general", isFavorite: false, isCustom: false },
  { id: "q-gen3", text: "You showed up. That already counts.", category: "general", isFavorite: false, isCustom: false },
  { id: "q-gen4", text: "Do it scared. Do it tired. Do it anyway.", category: "general", isFavorite: false, isCustom: false },
  { id: "q-gen5", text: "This is your story. Write it boldly.", category: "general", isFavorite: false, isCustom: false },
];

export function loadQuotes(): Quote[] {
  if (typeof window === "undefined") return DEFAULT_QUOTES;
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (raw === null) {
      localStorage.setItem(QUOTES_KEY, JSON.stringify(DEFAULT_QUOTES));
      return DEFAULT_QUOTES;
    }
    return JSON.parse(raw) as Quote[];
  } catch {
    return DEFAULT_QUOTES;
  }
}

export function saveQuotes(quotes: Quote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export function generateQuoteId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getDailyQuote(quotes: Quote[]): Quote {
  if (quotes.length === 0) return DEFAULT_QUOTES[0];
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return quotes[dayOfYear % quotes.length];
}

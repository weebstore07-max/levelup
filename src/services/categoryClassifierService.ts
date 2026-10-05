export type CourseCategory =
  | 'Programming'
  | 'Design'
  | '3D & Animation'
  | 'Video Editing'
  | 'AI & Data Science'
  | 'JEE'
  | 'NEET'
  | 'School'
  | 'CA & Commerce'
  | 'Business'
  | 'Languages'
  | 'Music'
  | 'Photography'
  | 'Other';

export interface ClassificationInput {
  title: string;
  description?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
}

export const CATEGORY_COLORS: Record<CourseCategory, { bg: string; text: string; hex: string; badge: string }> = {
  'Programming': { bg: 'bg-[#1572B6]', text: 'text-white', hex: '#1572B6', badge: 'bg-[#1572B6] text-white' },
  'Design': { bg: 'bg-[#E34F26]', text: 'text-white', hex: '#E34F26', badge: 'bg-[#E34F26] text-white' },
  '3D & Animation': { bg: 'bg-[#9333EA]', text: 'text-white', hex: '#9333EA', badge: 'bg-[#9333EA] text-white' },
  'Video Editing': { bg: 'bg-[#D93025]', text: 'text-white', hex: '#D93025', badge: 'bg-[#D93025] text-white' },
  'AI & Data Science': { bg: 'bg-[#1E8E3E]', text: 'text-white', hex: '#1E8E3E', badge: 'bg-[#1E8E3E] text-white' },
  'JEE': { bg: 'bg-[#D97706]', text: 'text-white', hex: '#D97706', badge: 'bg-[#D97706] text-white' },
  'NEET': { bg: 'bg-[#0284C7]', text: 'text-white', hex: '#0284C7', badge: 'bg-[#0284C7] text-white' },
  'School': { bg: 'bg-[#4F46E5]', text: 'text-white', hex: '#4F46E5', badge: 'bg-[#4F46E5] text-white' },
  'CA & Commerce': { bg: 'bg-[#059669]', text: 'text-white', hex: '#059669', badge: 'bg-[#059669] text-white' },
  'Business': { bg: 'bg-[#7C3AED]', text: 'text-white', hex: '#7C3AED', badge: 'bg-[#7C3AED] text-white' },
  'Languages': { bg: 'bg-[#DB2777]', text: 'text-white', hex: '#DB2777', badge: 'bg-[#DB2777] text-white' },
  'Music': { bg: 'bg-[#EA580C]', text: 'text-white', hex: '#EA580C', badge: 'bg-[#EA580C] text-white' },
  'Photography': { bg: 'bg-[#0891B2]', text: 'text-white', hex: '#0891B2', badge: 'bg-[#0891B2] text-white' },
  'Other': { bg: 'bg-[#6B7280]', text: 'text-white', hex: '#6B7280', badge: 'bg-[#6B7280] text-white' }
};

interface RuleDefinition {
  category: CourseCategory;
  strongKeywords: string[];
  keywords: string[];
}

const CATEGORY_RULES: RuleDefinition[] = [
  {
    category: 'JEE',
    strongKeywords: ['jee main', 'jee mains', 'jee advanced', 'iit jee', 'fiitjee', 'allen jee', 'jee physics', 'jee chemistry', 'jee maths', 'jee mathematics', 'nta jee', 'jee pyq', 'jee mock test', 'jee 2024', 'jee 2025', 'jee 2026'],
    keywords: ['jee', 'iit', 'kota physics', 'kota chemistry', 'resonance', 'physics wallah jee', 'unacademy jee', 'vedantu jee', 'pw jee']
  },
  {
    category: 'NEET',
    strongKeywords: ['neet ug', 'neet 2024', 'neet 2025', 'neet 2026', 'medical entrance', 'biology neet', 'physics neet', 'chemistry neet', 'ncert biology', 'neet pyq', 'neet mock test', 'pw neet', 'unacademy neet'],
    keywords: ['neet', 'botany', 'zoology', 'mbbs', 'aiims', 'vedantu neet', 'medical exam']
  },
  {
    category: 'CA & Commerce',
    strongKeywords: ['ca foundation', 'ca intermediate', 'ca inter', 'ca final', 'icai', 'financial accounting', 'cost accounting', 'corporate law', 'direct tax', 'indirect tax', 'costing', 'auditing', 'tally prime', 'company secretary', 'cs executive'],
    keywords: ['commerce', 'accountancy', 'accounting', 'taxation', 'gst', 'bookkeeping', 'tally', 'b.com', 'm.com', 'cma', 'financial management']
  },
  {
    category: 'School',
    strongKeywords: ['class 6', 'class 7', 'class 8', 'class 9', 'class 10', 'class 11', 'class 12', 'class vi', 'class vii', 'class viii', 'class ix', 'class x', 'class xi', 'class xii', 'cbse board', 'icse board', '10th board', '12th board', 'class 10th', 'class 12th', 'ncert solutions'],
    keywords: ['cbse', 'icse', 'state board', 'ncert', 'sst', 'social science', 'science class', 'maths class', 'school syllabus', 'board exam']
  },
  {
    category: 'AI & Data Science',
    strongKeywords: ['artificial intelligence', 'machine learning', 'deep learning', 'data science', 'neural network', 'neural networks', 'prompt engineering', 'chatgpt', 'openai', 'tensorflow', 'pytorch', 'keras', 'generative ai', 'genai', 'computer vision', 'natural language processing', 'langchain', 'huggingface', 'data analytics', 'scikit-learn'],
    keywords: ['ai', 'llm', 'pandas', 'numpy', 'scikit', 'nlp', 'power bi', 'tableau', 'big data', 'data analyst', 'statistics for data science']
  },
  {
    category: 'Programming',
    strongKeywords: ['web development', 'web dev', 'software engineering', 'data structures', 'dsa', 'javascript', 'typescript', 'reactjs', 'react.js', 'nextjs', 'next.js', 'nodejs', 'expressjs', 'python programming', 'python full course', 'html css', 'full stack', 'fullstack', 'frontend development', 'backend development', 'rest api', 'devops', 'docker', 'kubernetes', 'flutter', 'react native', 'android development', 'ios development', 'golang', 'rust programming', 'c++ programming', 'java programming'],
    keywords: ['programming', 'coding', 'html', 'css', 'javascript', 'js', 'typescript', 'ts', 'react', 'next', 'vue', 'angular', 'node', 'express', 'python', 'java', 'c++', 'cpp', 'c#', 'go', 'rust', 'php', 'ruby', 'sql', 'mysql', 'postgresql', 'mongodb', 'git', 'github', 'backend', 'frontend', 'api', 'dev', 'compiler', 'algorithm', 'tailwindcss', 'bootstrap', 'swift', 'kotlin']
  },
  {
    category: 'Design',
    strongKeywords: ['ui design', 'ux design', 'ui/ux', 'user interface', 'user experience', 'figma tutorial', 'graphic design', 'logo design', 'web design', 'adobe photoshop', 'adobe illustrator', 'adobe indesign', 'wireframing', 'prototyping', 'design system'],
    keywords: ['design', 'figma', 'photoshop', 'illustrator', 'indesign', 'typography', 'branding', 'canvas', 'canva', 'coreldraw', 'layout design', 'visual design', 'adobe xd']
  },
  {
    category: '3D & Animation',
    strongKeywords: ['blender 3d', '3d modeling', 'motion graphics', 'character animation', 'unreal engine', 'unity 3d', 'cinema 4d', 'after effects animation', 'character modeling', 'substance painter'],
    keywords: ['3d', 'animation', 'blender', 'maya', '3ds max', 'zbrush', 'vfx', 'cgi', 'rigging', 'rendering', 'c4d', '2d animation', 'houdini']
  },
  {
    category: 'Video Editing',
    strongKeywords: ['video editing', 'premiere pro', 'davinci resolve', 'final cut pro', 'capcut editing', 'color grading', 'video production', 'after effects editing', 'cinematic video editing'],
    keywords: ['video edit', 'premiere', 'davinci', 'final cut', 'capcut', 'vlogging', 'thumbnail editing', 'filmora', 'video transitions', 'b-roll']
  },
  {
    category: 'Business',
    strongKeywords: ['digital marketing', 'stock market', 'stock trading', 'options trading', 'personal finance', 'business strategy', 'entrepreneurship', 'search engine optimization', 'seo tutorial', 'e-commerce', 'dropshipping'],
    keywords: ['business', 'marketing', 'sales', 'startup', 'management', 'leadership', 'trading', 'investing', 'crypto', 'cryptocurrency', 'real estate', 'project management', 'agile', 'scrum']
  },
  {
    category: 'Languages',
    strongKeywords: ['spoken english', 'english speaking', 'learn spanish', 'learn french', 'learn german', 'learn japanese', 'learn korean', 'english grammar', 'ielts preparation', 'toefl preparation'],
    keywords: ['spanish', 'french', 'german', 'japanese', 'mandarin', 'korean', 'hindi grammar', 'vocabulary', 'ielts', 'toefl', 'grammar', 'pronunciation', 'linguistics', 'fluency']
  },
  {
    category: 'Music',
    strongKeywords: ['learn guitar', 'learn piano', 'vocal training', 'music theory', 'fl studio', 'ableton live', 'logic pro', 'audio engineering', 'music production', 'mixing and mastering', 'beat making'],
    keywords: ['music', 'guitar', 'piano', 'singing', 'drums', 'violin', 'fl studio', 'ableton', 'logic pro', 'beatmaking', 'songwriting', 'ukulele', 'chords', 'synthesizer']
  },
  {
    category: 'Photography',
    strongKeywords: ['portrait photography', 'street photography', 'landscape photography', 'photo editing', 'adobe lightroom', 'shutter speed', 'aperture', 'cinematography tutorial'],
    keywords: ['photography', 'camera', 'lighting', 'iso', 'cinematography', 'lightroom', 'photo composition', 'dslr', 'mirrorless', 'mobile photography', 'lens']
  }
];

/**
 * AI Classifier Function for YouTube Playlist Courses
 * Analyzes metadata (title, description, channel) to accurately detect single category
 */
export function classifyCourseCategory(input: ClassificationInput): CourseCategory {
  const titleText = (input.title || '').toLowerCase();
  const descText = (input.description || '').toLowerCase();
  const channelText = (input.channelTitle || '').toLowerCase();

  const scores: Record<CourseCategory, number> = {
    'Programming': 0,
    'Design': 0,
    '3D & Animation': 0,
    'Video Editing': 0,
    'AI & Data Science': 0,
    'JEE': 0,
    'NEET': 0,
    'School': 0,
    'CA & Commerce': 0,
    'Business': 0,
    'Languages': 0,
    'Music': 0,
    'Photography': 0,
    'Other': 0
  };

  CATEGORY_RULES.forEach((rule) => {
    let score = 0;

    // Check strong multi-word phrases (higher weight)
    rule.strongKeywords.forEach((phrase) => {
      if (titleText.includes(phrase)) {
        score += 15;
      } else if (channelText.includes(phrase)) {
        score += 10;
      } else if (descText.includes(phrase)) {
        score += 5;
      }
    });

    // Check single keywords / terms
    rule.keywords.forEach((term) => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(titleText)) {
        score += 8;
      } else if (regex.test(channelText)) {
        score += 5;
      } else if (regex.test(descText)) {
        score += 2;
      }
    });

    scores[rule.category] = score;
  });

  // Find category with highest score
  let maxCategory: CourseCategory = 'Other';
  let maxScore = 0;

  (Object.keys(scores) as CourseCategory[]).forEach((cat) => {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      maxCategory = cat;
    }
  });

  // Threshold check to avoid false positives
  if (maxScore < 4) {
    return 'Other';
  }

  return maxCategory;
}

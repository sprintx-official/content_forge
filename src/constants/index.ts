import type {
  ContentTypeOption,
  ToneOption,
  AudienceOption,
  LengthOption,
  ProcessingStage,
  WritingTip,
  ContentType,
  ImageSize,
  ImageStyle,
  CodeLanguage,
} from '../types'

// ---------------------------------------------------------------------------
// Content Types
// ---------------------------------------------------------------------------
export const CONTENT_TYPES: ContentTypeOption[] = [
  {
    id: 'article',
    name: 'Article',
    description:
      'Long-form journalistic or feature writing with structured sections, citations, and in-depth analysis.',
    icon: 'FileText',
    placeholder:
      'e.g. The impact of AI-generated media on public trust in journalism',
  },
  {
    id: 'blog',
    name: 'Blog Post',
    description:
      'Conversational, opinion-driven web content designed to engage readers and encourage discussion.',
    icon: 'PenTool',
    placeholder:
      'e.g. 5 storytelling techniques every aspiring journalist should master',
  },
  {
    id: 'social',
    name: 'Social Media',
    description:
      'Punchy, shareable micro-content optimized for platforms like Instagram, X (Twitter), and LinkedIn.',
    icon: 'Share2',
    placeholder:
      'e.g. Launch post for a student-run campus news podcast',
  },
  {
    id: 'press',
    name: 'Press Release',
    description:
      'Formal announcements following AP style and the inverted-pyramid structure for media distribution.',
    icon: 'Newspaper',
    placeholder:
      'e.g. University announces new digital media lab opening this semester',
  },
  {
    id: 'script',
    name: 'Script',
    description:
      'Broadcast-ready scripts for video, radio, podcasts, or presentations with timing cues and dialogue.',
    icon: 'Film',
    placeholder:
      'e.g. 2-minute explainer video on media literacy for college freshmen',
  },
  {
    id: 'ad-copy',
    name: 'Ad Copy',
    description:
      'Persuasive marketing and advertising copy with strong calls-to-action and brand-aligned messaging.',
    icon: 'Megaphone',
    placeholder:
      'e.g. Digital ad campaign for a non-profit climate awareness initiative',
  },
]

// ---------------------------------------------------------------------------
// Tones
// ---------------------------------------------------------------------------
export const TONES: ToneOption[] = [
  {
    id: 'professional',
    name: 'Professional',
    description:
      'Polished and authoritative language suited for corporate communications, white papers, and formal publications.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description:
      'Relaxed and conversational style that feels approachable, ideal for blogs, social posts, and lifestyle content.',
  },
  {
    id: 'persuasive',
    name: 'Persuasive',
    description:
      'Compelling and action-oriented writing designed to influence opinions or drive decisions.',
  },
  {
    id: 'informative',
    name: 'Informative',
    description:
      'Clear, fact-driven prose focused on educating the reader without bias or embellishment.',
  },
  {
    id: 'inspirational',
    name: 'Inspirational',
    description:
      'Uplifting and motivational language that resonates emotionally and encourages positive action.',
  },
]

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------
export const AUDIENCES: AudienceOption[] = [
  {
    id: 'general',
    name: 'General Public',
    description:
      'Broad audience with no assumed expertise. Uses accessible language and relatable examples.',
  },
  {
    id: 'students',
    name: 'Students',
    description:
      'College-age learners. Prioritizes clarity, contemporary references, and an engaging pace.',
  },
  {
    id: 'professionals',
    name: 'Professionals',
    description:
      'Industry practitioners and executives. Assumes domain knowledge and values conciseness.',
  },
  {
    id: 'youth',
    name: 'Youth (Gen Z)',
    description:
      'Teens and young adults. Leverages trending formats, inclusive language, and visual storytelling cues.',
  },
  {
    id: 'seniors',
    name: 'Seniors',
    description:
      'Older adults. Emphasizes readability, straightforward structure, and respectful tone.',
  },
]

// ---------------------------------------------------------------------------
// Content Lengths
// ---------------------------------------------------------------------------
export const LENGTHS: LengthOption[] = [
  {
    id: 'short',
    name: 'Short',
    wordRange: '150 - 250 words',
    words: 200,
  },
  {
    id: 'medium',
    name: 'Medium',
    wordRange: '400 - 600 words',
    words: 500,
  },
  {
    id: 'long',
    name: 'Long',
    wordRange: '800 - 1200 words',
    words: 1000,
  },
  {
    id: 'custom',
    name: 'Custom',
    wordRange: 'Set your own',
    words: 0,
  },
]

// ---------------------------------------------------------------------------
// Processing Pipeline Stages
// ---------------------------------------------------------------------------
export const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'analyzing',
    label: 'Analyzing',
    agent: 'Analyzer',
    status: 'pending',
    message: 'Analyzing your topic and requirements...',
  },
  {
    id: 'researching',
    label: 'Researching',
    agent: 'Researcher',
    status: 'pending',
    message: 'Gathering context and references...',
  },
  {
    id: 'drafting',
    label: 'Drafting',
    agent: 'Writer',
    status: 'pending',
    message: 'Drafting your content...',
  },
  {
    id: 'polishing',
    label: 'Polishing',
    agent: 'Editor',
    status: 'pending',
    message: 'Polishing and optimizing...',
  },
]

// ---------------------------------------------------------------------------
// Writing Tips (per Content Type)
// ---------------------------------------------------------------------------
export const WRITING_TIPS: Record<ContentType, WritingTip[]> = {
  article: [
    {
      title: 'Lead with the news',
      description:
        'Your opening paragraph should answer the most important of the 5 Ws (Who, What, When, Where, Why). Readers decide within seconds whether to continue -- give them the payoff immediately.',
      example:
        '"A new study from MIT reveals that 63% of Gen Z consumers distrust AI-generated news -- raising urgent questions for newsrooms adopting automation."',
    },
    {
      title: 'Use the inverted pyramid',
      description:
        'Place the most critical information at the top, followed by supporting details, then background context. This structure ensures your key message survives even if the reader drops off early.',
    },
    {
      title: 'Attribute every claim',
      description:
        'Credibility is everything in journalism. Every statistic, quote, or contested fact should be attributed to a named, verifiable source. Avoid vague attributions like "experts say."',
      example:
        'Instead of "Experts say screen time is harmful," write "Dr. Jean Twenge, a psychology professor at San Diego State University, found that teens who spend more than three hours daily on screens report higher rates of anxiety."',
    },
    {
      title: 'Vary sentence length for rhythm',
      description:
        'Mix short, punchy sentences with longer explanatory ones. A wall of uniformly long sentences exhausts the reader; all short sentences feel choppy. Rhythm keeps readers engaged.',
    },
    {
      title: 'Use active voice',
      description:
        'Active voice makes your writing direct and energetic. Reserve passive voice only when the actor is unknown or the action matters more than the subject.',
      example:
        'Passive: "The policy was approved by the board." Active: "The board approved the policy."',
    },
    {
      title: 'End with impact',
      description:
        'Your closing paragraph should leave the reader with something to think about -- a forward-looking statement, an unanswered question, or a call to reflection. Avoid simply summarizing what you already said.',
    },
  ],

  blog: [
    {
      title: 'Hook them in the first line',
      description:
        'Blog readers are scanners. Open with a bold statement, a surprising statistic, or a relatable question that makes them stop scrolling.',
      example:
        '"You have exactly 8 seconds before your reader bounces. Here is how to make every one of them count."',
    },
    {
      title: 'Write like you talk',
      description:
        'Blogs thrive on conversational tone. Read your draft aloud -- if it sounds like a textbook, rewrite it. Use contractions, ask rhetorical questions, and address the reader directly with "you."',
    },
    {
      title: 'Use subheadings as signposts',
      description:
        'Break your post into clearly labeled sections. A reader should be able to skim only your subheadings and understand the full arc of your argument.',
    },
    {
      title: 'Include one actionable takeaway per section',
      description:
        'Every section should leave the reader with something they can do, think about, or apply immediately. Theoretical content without application loses engagement fast.',
    },
    {
      title: 'Optimize for shareability',
      description:
        'Think about which sentence from your post someone would quote-tweet or screenshot. Craft at least one "quotable" line per post that encapsulates your main idea in a memorable way.',
    },
    {
      title: 'Close with a question or CTA',
      description:
        'End your blog by inviting the reader to comment, share, or take a specific next step. A blog post without a closing call-to-action is a conversation that ends mid-sentence.',
      example:
        '"What storytelling technique has made the biggest difference in your writing? Drop your answer in the comments -- I read every one."',
    },
  ],

  social: [
    {
      title: 'Front-load the value',
      description:
        'Social feeds are ruthless. Put the key insight, benefit, or hook in the very first line -- before the "see more" truncation point. If the first line does not earn the click, nothing else matters.',
    },
    {
      title: 'One post, one idea',
      description:
        'Resist the urge to cram multiple messages into a single post. A focused post with one clear takeaway will always outperform a scattered one trying to say everything at once.',
    },
    {
      title: 'Write for the platform, not for yourself',
      description:
        'Each platform has its own culture. LinkedIn rewards professional insights and storytelling. X (Twitter) rewards brevity and wit. Instagram rewards visual context. Tailor your language and structure accordingly.',
    },
    {
      title: 'Use line breaks generously',
      description:
        'Dense paragraphs are nearly unreadable on mobile screens. Use single-sentence lines, white space, and strategic line breaks to create a visual rhythm that pulls the eye downward.',
      example:
        '"Most students write for their professor.\n\nThe best communicators write for their audience.\n\nHere is the difference. (thread)"',
    },
    {
      title: 'End with engagement bait (the good kind)',
      description:
        'Ask a genuine question, invite opinions, or use a poll. Algorithmic reach on most platforms is directly tied to comment volume. Give people a low-friction reason to respond.',
    },
  ],

  press: [
    {
      title: 'Follow the standard structure',
      description:
        'A press release has a strict anatomy: headline, dateline, lead paragraph (5 Ws), body paragraphs with quotes and details, boilerplate "About" section, and media contact info. Deviating from this structure signals inexperience to journalists.',
    },
    {
      title: 'Write the headline like a news editor',
      description:
        'Your headline should read like a newspaper headline -- factual, specific, and free of marketing fluff. Journalists receive hundreds of releases daily; a clear headline is your only chance at getting read.',
      example:
        'Bad: "Exciting New Partnership to Transform Education!" Good: "StateU Partners with NPR to Launch Student Journalism Fellowship Program"',
    },
    {
      title: 'Include a strong quote',
      description:
        'Every press release needs at least one quote from a relevant spokesperson. The quote should add opinion, vision, or context that cannot be stated as a plain fact. Avoid quotes that merely restate the headline.',
      example:
        '"This fellowship will give students the kind of real-world deadline pressure that no classroom can replicate," said Dean Marquez.',
    },
    {
      title: 'Keep it to one page',
      description:
        'The ideal press release is 400-500 words. If your release exceeds one printed page, you are including too much detail. Give journalists the essential facts and let them follow up for more.',
    },
    {
      title: 'Use AP Style',
      description:
        'Press releases should follow Associated Press style for dates, numbers, titles, and punctuation. Using AP Style signals professionalism and makes it easier for journalists to pull quotes directly into their stories.',
    },
    {
      title: 'Make it easy to act on',
      description:
        'Always include a media contact with a real name, phone number, and email. If applicable, include links to high-resolution images, a press kit, or an embargoed fact sheet.',
    },
  ],

  script: [
    {
      title: 'Write for the ear, not the eye',
      description:
        'Scripts are meant to be spoken. Use short sentences, conversational phrasing, and natural contractions. Read every line aloud -- if you stumble, your talent will too.',
      example:
        'Written style: "The organization has been operational since 2018." Script style: "They have been at it since 2018."',
    },
    {
      title: 'Time your script accurately',
      description:
        'A general rule: about 150 words equals one minute of spoken content. For a 2-minute video, aim for roughly 300 words. Always read your script aloud with a timer before finalizing.',
    },
    {
      title: 'Use visual and audio cues',
      description:
        'A good script is not just dialogue -- it includes directions for visuals, sound effects, music beds, and transitions. Use formatting conventions like [SFX], [VO], [CUT TO], and [MUSIC UP] to communicate with your production team.',
    },
    {
      title: 'Front-load every segment',
      description:
        'Viewers and listeners decide quickly whether to keep watching or listening. State the payoff of each segment in its opening line, then expand. Never bury the lead in the middle of a scene.',
    },
    {
      title: 'Write in the present tense',
      description:
        'Scripts feel more immediate and engaging in present tense. "She walks into the newsroom" is more cinematic than "She walked into the newsroom." Present tense puts the audience in the moment.',
    },
    {
      title: 'Keep transitions smooth',
      description:
        'Every scene or segment should connect logically to the next. Use transitional phrases, recurring motifs, or audio bridges to prevent your script from feeling like a series of disconnected blocks.',
    },
  ],

  'ad-copy': [
    {
      title: 'Lead with the benefit, not the feature',
      description:
        'Audiences do not care what your product does -- they care what it does for them. Translate every feature into a tangible benefit that addresses a real pain point or desire.',
      example:
        'Feature: "Our app uses AI-powered scheduling." Benefit: "Never miss a deadline again -- your calendar manages itself."',
    },
    {
      title: 'Use the AIDA framework',
      description:
        'Structure your copy around Attention (hook), Interest (relevance), Desire (emotional appeal), and Action (CTA). This time-tested framework ensures your copy moves the reader from awareness to conversion.',
    },
    {
      title: 'Write multiple variations',
      description:
        'Professional copywriters never submit a single draft. Write at least 3-5 headline variations and 2-3 body copy options. A/B testing different angles is how you discover what actually resonates with your audience.',
    },
    {
      title: 'Make your CTA specific and urgent',
      description:
        'Vague CTAs like "Learn More" underperform specific ones. Tell the reader exactly what happens when they click, and give them a reason to act now.',
      example:
        'Weak: "Sign up today." Strong: "Start your free 14-day trial -- no credit card required."',
    },
    {
      title: 'Respect the character limits',
      description:
        'Every ad platform has strict character constraints. Google Ads headlines allow 30 characters; Meta primary text performs best under 125 characters. Know your platform limits before you start writing, not after.',
    },
    {
      title: 'Use social proof strategically',
      description:
        'Numbers, testimonials, and recognizable names build instant credibility. Even a simple data point can transform a generic claim into a persuasive one.',
      example:
        'Generic: "Students love our platform." With proof: "Trusted by 12,000+ students across 45 universities."',
    },
  ],
}

// ---------------------------------------------------------------------------
// Image Generation
// ---------------------------------------------------------------------------
export const IMAGE_SIZES: ImageSize[] = [
  { width: 1024, height: 1024, label: '1:1 Square' },
  { width: 1792, height: 1024, label: '16:9 Wide' },
  { width: 1024, height: 1792, label: '9:16 Tall' },
]

export const IMAGE_STYLES: { id: ImageStyle; name: string }[] = [
  { id: 'natural', name: 'Natural' },
  { id: 'vivid', name: 'Vivid' },
  { id: 'photographic', name: 'Photographic' },
  { id: 'digital-art', name: 'Digital Art' },
  { id: 'anime', name: 'Anime' },
]

// ---------------------------------------------------------------------------
// Code Generation
// ---------------------------------------------------------------------------
export const CODE_LANGUAGES: { id: CodeLanguage; name: string }[] = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'sql', name: 'SQL' },
  { id: 'bash', name: 'Bash' },
  { id: 'rust', name: 'Rust' },
  { id: 'go', name: 'Go' },
  { id: 'java', name: 'Java' },
  { id: 'other', name: 'Other' },
]

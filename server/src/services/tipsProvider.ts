interface WritingTip {
  title: string
  description: string
  example?: string
}

const WRITING_TIPS: Record<string, WritingTip[]> = {
  article: [
    {
      title: 'Lead with the news',
      description: 'Your opening paragraph should answer the most important of the 5 Ws (Who, What, When, Where, Why). Readers decide within seconds whether to continue -- give them the payoff immediately.',
      example: '"A new study from MIT reveals that 63% of Gen Z consumers distrust AI-generated news -- raising urgent questions for newsrooms adopting automation."',
    },
    {
      title: 'Use the inverted pyramid',
      description: 'Place the most critical information at the top, followed by supporting details, then background context. This structure ensures your key message survives even if the reader drops off early.',
    },
    {
      title: 'Attribute every claim',
      description: 'Credibility is everything in journalism. Every statistic, quote, or contested fact should be attributed to a named, verifiable source. Avoid vague attributions like "experts say."',
      example: 'Instead of "Experts say screen time is harmful," write "Dr. Jean Twenge, a psychology professor at San Diego State University, found that teens who spend more than three hours daily on screens report higher rates of anxiety."',
    },
    {
      title: 'Vary sentence length for rhythm',
      description: 'Mix short, punchy sentences with longer explanatory ones. A wall of uniformly long sentences exhausts the reader; all short sentences feel choppy. Rhythm keeps readers engaged.',
    },
    {
      title: 'Use active voice',
      description: 'Active voice makes your writing direct and energetic. Reserve passive voice only when the actor is unknown or the action matters more than the subject.',
      example: 'Passive: "The policy was approved by the board." Active: "The board approved the policy."',
    },
    {
      title: 'End with impact',
      description: 'Your closing paragraph should leave the reader with something to think about -- a forward-looking statement, an unanswered question, or a call to reflection. Avoid simply summarizing what you already said.',
    },
  ],
  blog: [
    {
      title: 'Hook them in the first line',
      description: 'Blog readers are scanners. Open with a bold statement, a surprising statistic, or a relatable question that makes them stop scrolling.',
      example: '"You have exactly 8 seconds before your reader bounces. Here is how to make every one of them count."',
    },
    {
      title: 'Write like you talk',
      description: 'Blogs thrive on conversational tone. Read your draft aloud -- if it sounds like a textbook, rewrite it. Use contractions, ask rhetorical questions, and address the reader directly with "you."',
    },
    {
      title: 'Use subheadings as signposts',
      description: 'Break your post into clearly labeled sections. A reader should be able to skim only your subheadings and understand the full arc of your argument.',
    },
    {
      title: 'Include one actionable takeaway per section',
      description: 'Every section should leave the reader with something they can do, think about, or apply immediately. Theoretical content without application loses engagement fast.',
    },
    {
      title: 'Optimize for shareability',
      description: 'Think about which sentence from your post someone would quote-tweet or screenshot. Craft at least one "quotable" line per post that encapsulates your main idea in a memorable way.',
    },
    {
      title: 'Close with a question or CTA',
      description: 'End your blog by inviting the reader to comment, share, or take a specific next step. A blog post without a closing call-to-action is a conversation that ends mid-sentence.',
      example: '"What storytelling technique has made the biggest difference in your writing? Drop your answer in the comments -- I read every one."',
    },
  ],
  social: [
    {
      title: 'Front-load the value',
      description: 'Social feeds are ruthless. Put the key insight, benefit, or hook in the very first line -- before the "see more" truncation point.',
    },
    {
      title: 'One post, one idea',
      description: 'Resist the urge to cram multiple messages into a single post. A focused post with one clear takeaway will always outperform a scattered one.',
    },
    {
      title: 'Write for the platform, not for yourself',
      description: 'Each platform has its own culture. LinkedIn rewards professional insights. X (Twitter) rewards brevity and wit. Instagram rewards visual context.',
    },
    {
      title: 'Use line breaks generously',
      description: 'Dense paragraphs are nearly unreadable on mobile screens. Use single-sentence lines, white space, and strategic line breaks.',
    },
    {
      title: 'End with engagement bait (the good kind)',
      description: 'Ask a genuine question, invite opinions, or use a poll. Algorithmic reach on most platforms is directly tied to comment volume.',
    },
  ],
  press: [
    {
      title: 'Follow the standard structure',
      description: 'A press release has a strict anatomy: headline, dateline, lead paragraph (5 Ws), body paragraphs with quotes and details, boilerplate, and media contact info.',
    },
    {
      title: 'Write the headline like a news editor',
      description: 'Your headline should read like a newspaper headline -- factual, specific, and free of marketing fluff.',
      example: 'Bad: "Exciting New Partnership to Transform Education!" Good: "StateU Partners with NPR to Launch Student Journalism Fellowship Program"',
    },
    {
      title: 'Include a strong quote',
      description: 'Every press release needs at least one quote from a relevant spokesperson that adds opinion, vision, or context.',
    },
    {
      title: 'Keep it to one page',
      description: 'The ideal press release is 400-500 words. Give journalists the essential facts and let them follow up for more.',
    },
    {
      title: 'Use AP Style',
      description: 'Press releases should follow Associated Press style for dates, numbers, titles, and punctuation.',
    },
    {
      title: 'Make it easy to act on',
      description: 'Always include a media contact with a real name, phone number, and email.',
    },
  ],
  script: [
    {
      title: 'Write for the ear, not the eye',
      description: 'Scripts are meant to be spoken. Use short sentences, conversational phrasing, and natural contractions.',
      example: 'Written: "The organization has been operational since 2018." Script: "They have been at it since 2018."',
    },
    {
      title: 'Time your script accurately',
      description: 'About 150 words equals one minute of spoken content. For a 2-minute video, aim for roughly 300 words.',
    },
    {
      title: 'Use visual and audio cues',
      description: 'Include directions for visuals, sound effects, music beds, and transitions using conventions like [SFX], [VO], [CUT TO].',
    },
    {
      title: 'Front-load every segment',
      description: 'State the payoff of each segment in its opening line, then expand. Never bury the lead.',
    },
    {
      title: 'Write in the present tense',
      description: 'Present tense feels more immediate and engaging. "She walks into the newsroom" is more cinematic than past tense.',
    },
    {
      title: 'Keep transitions smooth',
      description: 'Every scene should connect logically to the next. Use transitional phrases or audio bridges.',
    },
  ],
  'ad-copy': [
    {
      title: 'Lead with the benefit, not the feature',
      description: 'Translate every feature into a tangible benefit that addresses a real pain point or desire.',
      example: 'Feature: "AI-powered scheduling." Benefit: "Never miss a deadline again."',
    },
    {
      title: 'Use the AIDA framework',
      description: 'Structure your copy around Attention (hook), Interest (relevance), Desire (emotional appeal), and Action (CTA).',
    },
    {
      title: 'Write multiple variations',
      description: 'Write at least 3-5 headline variations and 2-3 body copy options. A/B testing reveals what resonates.',
    },
    {
      title: 'Make your CTA specific and urgent',
      description: 'Tell the reader exactly what happens when they click, and give them a reason to act now.',
      example: 'Weak: "Sign up today." Strong: "Start your free 14-day trial -- no credit card required."',
    },
    {
      title: 'Respect the character limits',
      description: 'Every ad platform has strict character constraints. Know your platform limits before writing.',
    },
    {
      title: 'Use social proof strategically',
      description: 'Numbers, testimonials, and recognizable names build instant credibility.',
      example: 'Generic: "Students love our platform." With proof: "Trusted by 12,000+ students across 45 universities."',
    },
  ],
}

export function getTips(contentType: string): WritingTip[] {
  const tips = WRITING_TIPS[contentType]
  if (!tips || tips.length === 0) return []

  // Fisher-Yates shuffle on a copy
  const shuffled = [...tips]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Return 3-5 tips
  const count = Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3))
  return shuffled.slice(0, count)
}

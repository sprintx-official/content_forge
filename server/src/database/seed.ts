import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { queryOne, execute } from './connection.js'

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString()

  // Seed admin user if none exists
  const adminExists = await queryOne(
    'SELECT id FROM users WHERE email = $1', ['admin@contentforge.com']
  )
  if (!adminExists) {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD
    if (!adminPassword) {
      console.warn('⚠️  ADMIN_INITIAL_PASSWORD not set. Skipping admin user creation.')
      console.warn('   Set ADMIN_INITIAL_PASSWORD in your .env file to create the initial admin user.')
    } else {
      if (adminPassword.length < 12) {
        console.warn('⚠️  ADMIN_INITIAL_PASSWORD should be at least 12 characters for security.')
      }
      const hash = bcrypt.hashSync(adminPassword, 10)
      await execute(
        'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), 'Admin', 'admin@contentforge.com', hash, 'admin', now]
      )
      console.log('✓ Seeded admin user: admin@contentforge.com')
    }
  }

  // Seed default agents if none exist
  const agentCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM agents')
  if (agentCount!.count === 0) {
    const agents = [
      {
        id: crypto.randomUUID(),
        name: 'Analyzer',
        description: 'Analyzes topics and requirements to create a content blueprint.',
        systemPrompt: 'You are a content analysis agent. Break down the topic, identify key angles, target audience needs, and create a structured outline.',
        icon: 'Brain',
      },
      {
        id: crypto.randomUUID(),
        name: 'Researcher',
        description: 'Gathers context, references, and supporting data for content creation.',
        systemPrompt: 'You are a research agent. Find relevant facts, statistics, quotes, and references to support the content outline.',
        icon: 'Search',
      },
      {
        id: crypto.randomUUID(),
        name: 'Writer',
        description: 'Drafts content based on the analysis and research provided.',
        systemPrompt: 'You are a writing agent. Create compelling, well-structured content following the outline and incorporating research findings.',
        icon: 'PenTool',
      },
      {
        id: crypto.randomUUID(),
        name: 'Editor',
        description: 'Polishes and optimizes content for clarity, tone, and engagement.',
        systemPrompt: 'You are an editing agent. Review content for grammar, clarity, tone consistency, and engagement. Optimize for the target audience.',
        icon: 'Sparkles',
      },
    ]

    for (const agent of agents) {
      await execute(
        'INSERT INTO agents (id, name, description, system_prompt, knowledge_base, icon, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [agent.id, agent.name, agent.description, agent.systemPrompt, '', agent.icon, now, now]
      )
    }

    // Seed default workflow
    const workflowId = crypto.randomUUID()
    await execute(
      'INSERT INTO workflows (id, name, description, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [workflowId, 'Standard Content Pipeline', 'A four-stage pipeline: analyze, research, draft, and polish your content.', 1, now, now]
    )

    const steps = [
      { agentId: agents[0].id, instructions: 'Analyze the topic and create a content blueprint', order: 0 },
      { agentId: agents[1].id, instructions: 'Gather context and supporting references', order: 1 },
      { agentId: agents[2].id, instructions: 'Draft the content based on analysis and research', order: 2 },
      { agentId: agents[3].id, instructions: 'Polish and optimize the final content', order: 3 },
    ]

    for (const step of steps) {
      await execute(
        'INSERT INTO workflow_steps (id, workflow_id, agent_id, instructions, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [crypto.randomUUID(), workflowId, step.agentId, step.instructions, step.order]
      )
    }

    console.log('Seeded default agents and workflow')
  }

  // Seed model pricing if none exists
  const pricingCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM model_pricing')
  if (pricingCount!.count === 0) {
    // Pricing: input, cachedInput, output (per 1M tokens)
    // Last updated: January 2026
    const pricing = [
      // ═══════════════════════════════════════════════════════════════════════
      // OpenAI - https://openai.com/api/pricing/
      // Caching: GPT-4o/O-series 50% discount, GPT-4.1 75% discount
      // ═══════════════════════════════════════════════════════════════════════
      { provider: 'openai', model_pattern: 'gpt-4o-mini', input: 0.15, cached: 0.075, output: 0.60 },
      { provider: 'openai', model_pattern: 'gpt-4o', input: 2.50, cached: 1.25, output: 10.00 },
      { provider: 'openai', model_pattern: 'gpt-4.1-nano', input: 0.10, cached: 0.025, output: 0.40 },
      { provider: 'openai', model_pattern: 'gpt-4.1-mini', input: 0.40, cached: 0.10, output: 1.60 },
      { provider: 'openai', model_pattern: 'gpt-4.1', input: 2.00, cached: 0.50, output: 8.00 },
      { provider: 'openai', model_pattern: 'o1-mini', input: 1.10, cached: 0.55, output: 4.40 },
      { provider: 'openai', model_pattern: 'o1', input: 15.00, cached: 7.50, output: 60.00 },
      { provider: 'openai', model_pattern: 'o3-mini', input: 1.10, cached: 0.55, output: 4.40 },
      { provider: 'openai', model_pattern: 'o3', input: 2.00, cached: 1.00, output: 8.00 },
      { provider: 'openai', model_pattern: 'o4-mini', input: 1.10, cached: 0.55, output: 4.40 },

      // ═══════════════════════════════════════════════════════════════════════
      // Anthropic - https://docs.anthropic.com/en/docs/about-claude/pricing
      // Caching: 90% discount (cache read = 0.1x base price)
      // ═══════════════════════════════════════════════════════════════════════
      { provider: 'anthropic', model_pattern: 'claude-3-5-haiku', input: 0.80, cached: 0.08, output: 4.00 },
      { provider: 'anthropic', model_pattern: 'claude-3-5-sonnet', input: 3.00, cached: 0.30, output: 15.00 },
      { provider: 'anthropic', model_pattern: 'claude-sonnet-4', input: 3.00, cached: 0.30, output: 15.00 },
      { provider: 'anthropic', model_pattern: 'claude-opus-4', input: 15.00, cached: 1.50, output: 75.00 },
      { provider: 'anthropic', model_pattern: 'claude-haiku-4.5', input: 1.00, cached: 0.10, output: 5.00 },
      { provider: 'anthropic', model_pattern: 'claude-sonnet-4.5', input: 3.00, cached: 0.30, output: 15.00 },
      { provider: 'anthropic', model_pattern: 'claude-opus-4.5', input: 5.00, cached: 0.50, output: 25.00 },

      // ═══════════════════════════════════════════════════════════════════════
      // xAI - https://docs.x.ai/docs/models
      // ═══════════════════════════════════════════════════════════════════════
      { provider: 'xai', model_pattern: 'grok-3-mini', input: 0.30, cached: 0.03, output: 0.50 },
      { provider: 'xai', model_pattern: 'grok-3', input: 3.00, cached: 0.30, output: 15.00 },
      { provider: 'xai', model_pattern: 'grok-4.1-fast', input: 0.20, cached: 0.02, output: 0.50 },
      { provider: 'xai', model_pattern: 'grok-4', input: 3.00, cached: 0.30, output: 15.00 },

      // ═══════════════════════════════════════════════════════════════════════
      // Google - https://ai.google.dev/gemini-api/docs/pricing
      // Caching: 75% discount (context caching)
      // ═══════════════════════════════════════════════════════════════════════
      { provider: 'google', model_pattern: 'gemini-2.0-flash-lite', input: 0.075, cached: 0.01875, output: 0.30 },
      { provider: 'google', model_pattern: 'gemini-2.0-flash', input: 0.10, cached: 0.025, output: 0.40 },
      { provider: 'google', model_pattern: 'gemini-2.5-flash-lite', input: 0.10, cached: 0.025, output: 0.40 },
      { provider: 'google', model_pattern: 'gemini-2.5-flash', input: 0.15, cached: 0.0375, output: 0.60 },
      { provider: 'google', model_pattern: 'gemini-2.5-pro', input: 1.25, cached: 0.3125, output: 10.00 },
      { provider: 'google', model_pattern: 'gemini-3-flash', input: 0.50, cached: 0.125, output: 3.00 },
      { provider: 'google', model_pattern: 'gemini-3-pro', input: 2.00, cached: 0.50, output: 12.00 },
    ]

    for (const p of pricing) {
      await execute(
        'INSERT INTO model_pricing (id, provider, model_pattern, input_price_per_million, cached_input_price_per_million, output_price_per_million, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [crypto.randomUUID(), p.provider, p.model_pattern, p.input, p.cached, p.output, now]
      )
    }

    console.log('Seeded model pricing data')
  }

  // Seed forge options if none exist
  const forgeOptionsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM forge_options')
  if (forgeOptionsCount!.count === 0) {
    const options = [
      // Content Types
      { category: 'content_type', value: 'article', label: 'Article', description: 'Long-form journalistic or feature writing with structured sections, citations, and in-depth analysis.', guidance: 'Article — Produce a long-form journalistic or feature article with structured sections, citations where appropriate, and a narrative arc. Include an engaging lead paragraph, well-organized body sections with subheadings, and a strong conclusion.', icon: 'FileText', placeholder: 'e.g. The impact of AI-generated media on public trust in journalism', sort_order: 0 },
      { category: 'content_type', value: 'blog-post', label: 'Blog Post', description: 'Conversational, opinion-driven web content designed to engage readers and encourage discussion.', guidance: 'Blog Post — Write conversational, opinion-driven web content. Use a personal voice, hook the reader early, include practical takeaways, and optimize for online readability (short paragraphs, subheadings, lists).', icon: 'PenTool', placeholder: 'e.g. 5 storytelling techniques every aspiring journalist should master', sort_order: 1 },
      { category: 'content_type', value: 'social-media', label: 'Social Media', description: 'Punchy, shareable micro-content optimized for platforms like Instagram, X (Twitter), and LinkedIn.', guidance: 'Social Media — Create punchy, shareable micro-content optimized for social platforms. Be concise, attention-grabbing, and include hashtag-worthy phrases. Front-load the most compelling point.', icon: 'Share2', placeholder: 'e.g. Launch post for a student-run campus news podcast', sort_order: 2 },
      { category: 'content_type', value: 'press-release', label: 'Press Release', description: 'Formal announcements following AP style and the inverted-pyramid structure for media distribution.', guidance: 'Press Release — Follow AP style and inverted-pyramid structure. Lead with the most newsworthy facts (who, what, when, where, why). Include a dateline, quotes from relevant stakeholders, and boilerplate information.', icon: 'Newspaper', placeholder: 'e.g. University announces new digital media lab opening this semester', sort_order: 3 },
      { category: 'content_type', value: 'script', label: 'Script', description: 'Broadcast-ready scripts for video, radio, podcasts, or presentations with timing cues and dialogue.', guidance: 'Script — Write a broadcast-ready script for video, radio, podcast, or presentation. Include speaker cues, timing notes where helpful, and natural-sounding dialogue. Write for the ear, not the eye.', icon: 'Film', placeholder: 'e.g. 2-minute explainer video on media literacy for college freshmen', sort_order: 4 },
      { category: 'content_type', value: 'ad-copy', label: 'Ad Copy', description: 'Persuasive marketing and advertising copy with strong calls-to-action and brand-aligned messaging.', guidance: 'Ad Copy — Create persuasive marketing and advertising copy. Lead with a strong headline, highlight benefits over features, use urgency and social proof, and end with a clear call to action.', icon: 'Megaphone', placeholder: 'e.g. Digital ad campaign for a non-profit climate awareness initiative', sort_order: 5 },

      // Tones
      { category: 'tone', value: 'professional', label: 'Professional', description: 'Polished and authoritative language suited for corporate communications, white papers, and formal publications.', guidance: 'Professional — Use formal, authoritative language. Maintain a polished, business-appropriate voice. Avoid slang, contractions, and overly casual expressions. Convey expertise and credibility.', icon: '', placeholder: '', sort_order: 0 },
      { category: 'tone', value: 'casual', label: 'Casual', description: 'Relaxed and conversational style that feels approachable, ideal for blogs, social posts, and lifestyle content.', guidance: 'Casual — Write in a friendly, conversational tone as if chatting with a friend. Use contractions, simple words, and a relaxed style. Feel approachable and warm.', icon: '', placeholder: '', sort_order: 1 },
      { category: 'tone', value: 'persuasive', label: 'Persuasive', description: 'Compelling and action-oriented writing designed to influence opinions or drive decisions.', guidance: 'Persuasive — Use compelling, action-oriented language designed to convince and motivate. Employ rhetorical techniques: strong arguments, emotional appeal, social proof, and clear calls to action.', icon: '', placeholder: '', sort_order: 2 },
      { category: 'tone', value: 'informative', label: 'Informative', description: 'Clear, fact-driven prose focused on educating the reader without bias or embellishment.', guidance: 'Informative — Prioritize clarity and accuracy. Present facts, data, and explanations in a neutral, objective voice. Focus on educating the reader without bias or opinion.', icon: '', placeholder: '', sort_order: 3 },
      { category: 'tone', value: 'inspirational', label: 'Inspirational', description: 'Uplifting and motivational language that resonates emotionally and encourages positive action.', guidance: 'Inspirational — Use uplifting, motivational language that energizes the reader. Tell stories, paint vivid pictures, and appeal to emotions. Encourage action and positive thinking.', icon: '', placeholder: '', sort_order: 4 },

      // Audiences
      { category: 'audience', value: 'general', label: 'General Public', description: 'Broad audience with no assumed expertise. Uses accessible language and relatable examples.', guidance: 'General Public — Write for everyday readers with no specialized knowledge. Use simple vocabulary (8th-grade reading level), relatable examples, and avoid jargon. If you must use a technical term, explain it immediately.', icon: '', placeholder: '', sort_order: 0 },
      { category: 'audience', value: 'students', label: 'Students', description: 'College-age learners. Prioritizes clarity, contemporary references, and an engaging pace.', guidance: 'Students — Write for learners (high school to college age). Be educational but engaging. Use examples, analogies, and clear explanations. Break complex concepts into digestible pieces. Make it interesting enough to hold attention.', icon: '', placeholder: '', sort_order: 1 },
      { category: 'audience', value: 'professionals', label: 'Professionals', description: 'Industry practitioners and executives. Assumes domain knowledge and values conciseness.', guidance: 'Professionals — Write for experienced adults in a work context. You can use industry-standard terminology without over-explaining. Be concise and respect their time. Focus on actionable insights and practical value.', icon: '', placeholder: '', sort_order: 2 },
      { category: 'audience', value: 'youth', label: 'Youth (Gen Z)', description: 'Teens and young adults. Leverages trending formats, inclusive language, and visual storytelling cues.', guidance: 'Youth / Gen Z — Write for a younger audience (16-25). Keep it authentic, snappy, and direct. Use contemporary references and a slightly informal voice. Avoid sounding corporate or preachy. Short paragraphs, punchy sentences.', icon: '', placeholder: '', sort_order: 3 },
      { category: 'audience', value: 'seniors', label: 'Seniors', description: 'Older adults. Emphasizes readability, straightforward structure, and respectful tone.', guidance: 'Seniors — Write for an older adult audience. Use clear, respectful language with a warm tone. Avoid trendy slang or obscure references. Prefer larger conceptual clarity over rapid-fire information. Be thorough and patient in explanations.', icon: '', placeholder: '', sort_order: 4 },
    ]

    for (const opt of options) {
      await execute(
        'INSERT INTO forge_options (id, category, value, label, description, guidance, icon, placeholder, sort_order, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11)',
        [crypto.randomUUID(), opt.category, opt.value, opt.label, opt.description, opt.guidance, opt.icon, opt.placeholder, opt.sort_order, now, now]
      )
    }

    console.log('Seeded forge options (content types, tones, audiences)')
  }
}

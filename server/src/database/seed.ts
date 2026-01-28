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
}

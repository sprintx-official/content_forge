import { exec, query } from './connection.js'

async function runMigrations(): Promise<void> {
  // Migration: Add model column to agents
  const agentCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'agents'`
  )
  const hasModel = agentCols.some((c) => c.column_name === 'model')
  if (!hasModel) {
    await exec("ALTER TABLE agents ADD COLUMN model TEXT NOT NULL DEFAULT ''")
  }

  // Migration: Add cached_input_price_per_million to model_pricing
  const pricingCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'model_pricing'`
  )
  const hasCachedPrice = pricingCols.some((c) => c.column_name === 'cached_input_price_per_million')
  if (!hasCachedPrice) {
    await exec("ALTER TABLE model_pricing ADD COLUMN cached_input_price_per_million REAL NOT NULL DEFAULT 0.0")
  }

  // Migration: Add step_type column to workflow_steps
  const stepCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'workflow_steps'`
  )
  if (!stepCols.some((c) => c.column_name === 'step_type')) {
    await exec("ALTER TABLE workflow_steps ADD COLUMN step_type TEXT NOT NULL DEFAULT 'text'")
  }
}

export async function initializeSchema(): Promise<void> {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL DEFAULT '',
      knowledge_base TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'Brain',
      model TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_files (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      r2_key TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT NOT NULL DEFAULT '{}',
      workflow_name TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL UNIQUE CHECK(provider IN ('openai', 'anthropic', 'xai', 'google')),
      api_key TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      history_id TEXT NOT NULL REFERENCES history(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0.0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model_pricing (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model_pattern TEXT NOT NULL,
      input_price_per_million REAL NOT NULL DEFAULT 0.0,
      cached_input_price_per_million REAL NOT NULL DEFAULT 0.0,
      output_price_per_million REAL NOT NULL DEFAULT 0.0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, model_pattern)
    );

    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      topic TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      output_text TEXT NOT NULL DEFAULT '',
      history_id TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_access (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workflow_id, user_id)
    );

    -- Indexes for frequently queried columns
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_agent_files_agent_id ON agent_files(agent_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_agent_id ON feedback(agent_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);
    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_token_usage_history_id ON token_usage(history_id);
    CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);
    CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id ON agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON agent_memory(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workflow_access_user_id ON workflow_access(user_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_access_workflow_id ON workflow_access(workflow_id);

    -- Chat conversations
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      last_message TEXT NOT NULL DEFAULT '',
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Chat messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL DEFAULT '',
      model TEXT,
      provider TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0.0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Generated images
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL DEFAULT '',
      revised_prompt TEXT,
      r2_key TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      width INTEGER NOT NULL DEFAULT 1024,
      height INTEGER NOT NULL DEFAULT 1024,
      style TEXT NOT NULL DEFAULT 'natural',
      provider TEXT NOT NULL DEFAULT 'openai',
      model TEXT NOT NULL DEFAULT 'dall-e-3',
      cost_usd REAL NOT NULL DEFAULT 0.0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for new tables
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
    CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
  `)

  await runMigrations()
}

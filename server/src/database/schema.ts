import { exec, query } from './connection.js'
import { migrateUnencryptedKeys } from '../services/apiKeyStore.js'

async function runMigrations(): Promise<void> {
  // Migration: Normalize all existing emails to lowercase
  await exec("UPDATE users SET email = LOWER(email) WHERE email != LOWER(email)")

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

  // Migration: Add scene extension columns to generated_videos
  const videoCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'generated_videos'`
  )
  if (!videoCols.some((c) => c.column_name === 'source_video_id')) {
    await exec("ALTER TABLE generated_videos ADD COLUMN source_video_id TEXT DEFAULT NULL")
  }
  if (!videoCols.some((c) => c.column_name === 'clip_index')) {
    await exec("ALTER TABLE generated_videos ADD COLUMN clip_index INTEGER NOT NULL DEFAULT 0")
  }

  // Migration: Add flows redesign columns to workflows
  const workflowCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'workflows'`
  )
  if (!workflowCols.some((c) => c.column_name === 'type')) {
    await exec("ALTER TABLE workflows ADD COLUMN type TEXT NOT NULL DEFAULT 'text'")
  }
  if (!workflowCols.some((c) => c.column_name === 'mode')) {
    await exec("ALTER TABLE workflows ADD COLUMN mode TEXT NOT NULL DEFAULT 'manual'")
  }
  if (!workflowCols.some((c) => c.column_name === 'pipeline_agent_id')) {
    await exec("ALTER TABLE workflows ADD COLUMN pipeline_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL")
  }
  if (!workflowCols.some((c) => c.column_name === 'frequency')) {
    await exec("ALTER TABLE workflows ADD COLUMN frequency INTEGER DEFAULT 1440")
  }

  // Migration: Add workflow_id to history
  const historyCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'history'`
  )
  if (!historyCols.some((c) => c.column_name === 'workflow_id')) {
    await exec("ALTER TABLE history ADD COLUMN workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL")
  }

  // Migration: Add workflow_id to coverage_posts
  const coverageCols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'coverage_posts'`
  )
  if (!coverageCols.some((c) => c.column_name === 'workflow_id')) {
    await exec("ALTER TABLE coverage_posts ADD COLUMN workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL")
  }

  // Create indexes for new workflow columns
  await exec(`
    CREATE INDEX IF NOT EXISTS idx_history_workflow_id ON history(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_coverage_posts_workflow_id ON coverage_posts(workflow_id);
  `)
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

    -- Generated videos
    CREATE TABLE IF NOT EXISTS generated_videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      aspect_ratio TEXT NOT NULL DEFAULT '16:9',
      duration_seconds INTEGER NOT NULL DEFAULT 8,
      provider TEXT NOT NULL DEFAULT 'google',
      model TEXT NOT NULL DEFAULT 'veo-3.0-generate-001',
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
    CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
    CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at DESC);

    -- Attachments (for chat, content, code)
    CREATE TABLE IF NOT EXISTS chat_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      r2_key TEXT,
      data_url TEXT,
      extracted_text TEXT,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON chat_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_chat_attachments_user_id ON chat_attachments(user_id);

    -- Forge options (admin-configurable content types, tones, audiences)
    CREATE TABLE IF NOT EXISTS forge_options (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('content_type', 'tone', 'audience')),
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      guidance TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      placeholder TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_forge_options_category ON forge_options(category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_forge_options_category_value ON forge_options(category, value);

    -- Agent settings (key-value per agent, for CMS config, pipeline settings, etc.)
    CREATE TABLE IF NOT EXISTS agent_settings (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      UNIQUE(agent_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_settings_agent_id ON agent_settings(agent_id);

    -- RSS Feeds (global feed library)
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL UNIQUE,
      site_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT 'standard' CHECK(tier IN ('priority', 'standard', 'low')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'error')),
      last_fetched_at TIMESTAMP,
      last_error TEXT,
      error_count INTEGER NOT NULL DEFAULT 0,
      article_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);

    -- Agent feed subscriptions (many-to-many)
    CREATE TABLE IF NOT EXISTS agent_feeds (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_id, feed_id)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_feeds_agent_id ON agent_feeds(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_feeds_feed_id ON agent_feeds(feed_id);

    -- Articles (scraped from feeds)
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      guid TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      published_at TIMESTAMP,
      language TEXT NOT NULL DEFAULT 'en',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(feed_id, guid)
    );
    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

    -- Agent article screenings (relevance cache per agent)
    CREATE TABLE IF NOT EXISTS agent_article_screenings (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      is_relevant INTEGER NOT NULL DEFAULT 0,
      screened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_id, article_id)
    );
    CREATE INDEX IF NOT EXISTS idx_screenings_agent_article ON agent_article_screenings(agent_id, article_id);

    -- Coverage posts (auto-generated from pipeline)
    CREATE TABLE IF NOT EXISTS coverage_posts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      urgency TEXT NOT NULL DEFAULT 'routine' CHECK(urgency IN ('critical', 'high', 'developing', 'routine')),
      story_stage TEXT NOT NULL DEFAULT 'developing',
      confidence INTEGER NOT NULL DEFAULT 3,
      fingerprint TEXT NOT NULL DEFAULT '',
      key_facts TEXT NOT NULL DEFAULT '[]',
      image_prompt TEXT NOT NULL DEFAULT '',
      image_original TEXT,
      image_square TEXT,
      image_landscape TEXT,
      image_vertical TEXT,
      image_headline TEXT NOT NULL DEFAULT '',
      cms_slug TEXT,
      cms_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'rejected')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coverage_posts_agent_id ON coverage_posts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_coverage_posts_status ON coverage_posts(status);
    CREATE INDEX IF NOT EXISTS idx_coverage_posts_created_at ON coverage_posts(created_at DESC);

    -- Coverage social posts (platform-specific content per coverage post)
    CREATE TABLE IF NOT EXISTS coverage_social_posts (
      id TEXT PRIMARY KEY,
      coverage_post_id TEXT NOT NULL REFERENCES coverage_posts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      edited_content TEXT,
      hashtags TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coverage_social_posts_post_id ON coverage_social_posts(coverage_post_id);

    -- Coverage source articles (links posts to source articles)
    CREATE TABLE IF NOT EXISTS coverage_source_articles (
      id TEXT PRIMARY KEY,
      coverage_post_id TEXT NOT NULL REFERENCES coverage_posts(id) ON DELETE CASCADE,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(coverage_post_id, article_id)
    );

    -- Pipeline runs (execution history)
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      current_step TEXT NOT NULL DEFAULT 'queued',
      articles_found INTEGER NOT NULL DEFAULT 0,
      articles_relevant INTEGER NOT NULL DEFAULT 0,
      clusters_found INTEGER NOT NULL DEFAULT 0,
      posts_generated INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      duration_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_agent_id ON pipeline_runs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);

    -- Social accounts (OAuth connections)
    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      platform_user_id TEXT NOT NULL DEFAULT '',
      platform_username TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      expires_at TIMESTAMP,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_social_accounts_agent_id ON social_accounts(agent_id);

    -- Publishing queue (social media scheduling)
    CREATE TABLE IF NOT EXISTS publishing_queue (
      id TEXT PRIMARY KEY,
      coverage_post_id TEXT NOT NULL REFERENCES coverage_posts(id) ON DELETE CASCADE,
      social_post_id TEXT REFERENCES coverage_social_posts(id),
      social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'published', 'failed', 'cancelled')),
      scheduled_at TIMESTAMP,
      published_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_publishing_queue_status ON publishing_queue(status);

    -- Agent guidelines (editorial rules per agent)
    CREATE TABLE IF NOT EXISTS agent_guidelines (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      guideline_type TEXT NOT NULL DEFAULT 'narrative',
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(agent_id, guideline_type)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_guidelines_agent_id ON agent_guidelines(agent_id);

    -- Webhooks (Slack, Teams, custom)
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'custom' CHECK(type IN ('slack', 'teams', 'custom')),
      events TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Email preferences (per user)
    CREATE TABLE IF NOT EXISTS email_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK(digest_frequency IN ('daily', 'weekly', 'none')),
      breaking_news INTEGER NOT NULL DEFAULT 1,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );

    -- Push subscriptions
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      keys_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

    -- Brand monitoring queries
    CREATE TABLE IF NOT EXISTS brand_queries (
      id TEXT PRIMARY KEY,
      agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('daily', 'weekly')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Brand monitoring results
    CREATE TABLE IF NOT EXISTS brand_results (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL REFERENCES brand_queries(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      response TEXT NOT NULL DEFAULT '',
      sentiment TEXT,
      entities TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_brand_results_query_id ON brand_results(query_id);

    -- Gold standard examples (editor-approved posts for few-shot learning)
    CREATE TABLE IF NOT EXISTS gold_standard_examples (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      coverage_post_id TEXT NOT NULL REFERENCES coverage_posts(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Editor diffs (tracks what editors change for learning loop)
    CREATE TABLE IF NOT EXISTS editor_diffs (
      id TEXT PRIMARY KEY,
      coverage_post_id TEXT NOT NULL REFERENCES coverage_posts(id) ON DELETE CASCADE,
      field TEXT NOT NULL,
      original_value TEXT NOT NULL DEFAULT '',
      edited_value TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Image template library
    CREATE TABLE IF NOT EXISTS image_template_library (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_image_template_library_created_at ON image_template_library(created_at DESC);
  `)

  await runMigrations()

  // Encrypt any existing plain-text API keys
  const migrated = await migrateUnencryptedKeys()
  if (migrated > 0) {
    console.log(`Encrypted ${migrated} plain-text API key(s) in database.`)
  }
}

import crypto from 'crypto'
import { query, queryOne, execute } from '../../database/connection.js'
import { geminiGenerate, geminiGenerateImage, extractJson } from './geminiClient.js'
import { buildGeneratePrompt, SETTING_DEFAULTS, getAgentModel } from './prompts.js'
import { getAgentSetting, publishToCms, plainTextToHtml, mapCategoryToCmsSlug, generateTags, linkArticleToDevelopingStory } from '../../services/cmsClient.js'
import { createDefaultTemplate, type ImageTemplate } from '../../services/templateTypes.js'

// Lazy-load compositor — canvas native module may not be available in all environments
let compositeAllFormats: typeof import('../../services/imageCompositor.js').compositeAllFormats | null = null
import('../../services/imageCompositor.js')
  .then(m => { compositeAllFormats = m.compositeAllFormats })
  .catch(() => { console.warn('[Generate] canvas not available — image compositing disabled') })
import type { TopicCluster } from './cluster.js'
import type { ResearchBriefData } from './research.js'

interface ArticleForGeneration {
  id: string
  title: string
  content: string | null
  summary: string | null
  image_url: string | null
  feed_title: string
  language: string | null
}

interface GeneratedPost {
  title: string
  summary: string
  social_posts: {
    x: string
    linkedin: string
    facebook: string
    instagram: string
    threads: string
  }
  image_prompt?: string
  slug?: string
  category?: string
  image_headline?: string
  confidence_score?: number
}

const PLATFORMS = ['x', 'linkedin', 'facebook', 'instagram', 'threads'] as const

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  threads: 500,
}

function validateAndFixSocialPosts(socialPosts: Record<string, string>): Record<string, string> {
  const result = { ...socialPosts }
  for (const [platform, content] of Object.entries(result)) {
    const limit = PLATFORM_CHAR_LIMITS[platform]
    if (!limit || !content) continue
    if (content.length > limit) {
      const truncated = content.slice(0, limit - 1)
      const lastSpace = truncated.lastIndexOf(' ')
      result[platform] = (lastSpace > limit * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '\u2026'
    }
  }
  return result
}

export async function generateCoveragePost(
  agentId: string,
  cluster: TopicCluster,
  researchBrief: ResearchBriefData | null = null,
): Promise<string> {
  // Fetch full article content for the cluster
  const placeholders = cluster.article_ids.map((_, i) => `$${i + 1}`).join(', ')
  const articleRows = await query<ArticleForGeneration>(
    `SELECT a.id, a.title, a.content, a.summary, a.language,
            COALESCE(f.title, '') as feed_title
     FROM articles a
     JOIN feeds f ON a.feed_id = f.id
     WHERE a.id IN (${placeholders})`,
    cluster.article_ids,
  )

  const articlesForPrompt = articleRows.map(a => ({
    title: a.title,
    markdown: a.content || a.summary || a.title,
    publication: a.feed_title,
  }))

  let prompt = await buildGeneratePrompt(articlesForPrompt, agentId)

  // Inject research brief
  if (researchBrief) {
    const briefSections: string[] = []
    if (researchBrief.topic?.context_summary) {
      briefSections.push(`Topic Context:\n${researchBrief.topic.context_summary}`)
    }
    if (researchBrief.seo?.primary_keywords?.length) {
      briefSections.push(`SEO Keywords: ${researchBrief.seo.primary_keywords.join(', ')}`)
    }
    if (briefSections.length > 0) {
      prompt += '\n\n--- RESEARCH BRIEF ---\n' + briefSections.join('\n\n')
    }
  }

  const model = await getAgentModel(agentId, 'model_generate')
  const response = await geminiGenerate(model, prompt, { useSearch: true })

  let generated = extractJson(response) as GeneratedPost | null
  if (!generated || !generated.title || !generated.summary) {
    throw new Error(`Failed to parse generation response for "${cluster.fingerprint}"`)
  }

  // Validate social post limits
  generated.social_posts = validateAndFixSocialPosts(generated.social_posts) as typeof generated.social_posts

  // Generate images
  const imageModel = await getAgentModel(agentId, 'model_image_generate')
  const imageSystemPrompt = (await getAgentSetting(agentId, 'prompt_image_generate')) ?? SETTING_DEFAULTS.prompt_image_generate

  let imageSquare: string | null = null
  let imageLandscape: string | null = null
  let imageVertical: string | null = null

  if (generated.image_prompt) {
    // Load agent's preferred output formats (default: square + landscape)
    const formatsRow = await queryOne<{ value: string }>(
      `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'image_output_formats'`,
      [agentId],
    )
    let outputFormats: string[] = ['square', 'landscape']
    if (formatsRow) {
      try { outputFormats = JSON.parse(formatsRow.value) as string[] } catch { /* use defaults */ }
    }

    const wantSquare = outputFormats.includes('square')
    const wantLandscape = outputFormats.includes('landscape')
    const wantVertical = outputFormats.includes('vertical')

    console.log(`  [Generate] Generating images (${outputFormats.join(', ')}) with ${imageModel}...`)

    const imagePromises: Promise<Buffer | null>[] = []
    const formatKeys: string[] = []

    if (wantSquare) {
      imagePromises.push(geminiGenerateImage(imageModel, generated.image_prompt, '1:1', imageSystemPrompt))
      formatKeys.push('square')
    }
    if (wantLandscape) {
      imagePromises.push(geminiGenerateImage(imageModel, generated.image_prompt, '16:9', imageSystemPrompt))
      formatKeys.push('landscape')
    }
    if (wantVertical) {
      imagePromises.push(geminiGenerateImage(imageModel, generated.image_prompt, '3:4', imageSystemPrompt))
      formatKeys.push('vertical')
    }

    const buffers = await Promise.all(imagePromises)
    const bufferMap: Record<string, Buffer | null> = {}
    formatKeys.forEach((key, i) => { bufferMap[key] = buffers[i] })

    const squareBuf = bufferMap.square ?? null
    const landscapeBuf = bufferMap.landscape ?? null
    const verticalBuf = bufferMap.vertical ?? null

    // Apply image template compositing if headline is available and compositor loaded
    if (compositeAllFormats && generated.image_headline && (squareBuf || landscapeBuf || verticalBuf)) {
      try {
        // Load agent's custom template or use default
        const templateRow = await queryOne<{ value: string }>(
          `SELECT value FROM agent_settings WHERE agent_id = $1 AND key = 'image_template'`,
          [agentId],
        )
        const template: ImageTemplate = templateRow
          ? JSON.parse(templateRow.value)
          : createDefaultTemplate()

        const composited = await compositeAllFormats(
          template,
          squareBuf,
          landscapeBuf,
          generated.image_headline,
          generated.category,
          null,
          verticalBuf,
        )

        if (composited.square) imageSquare = `data:image/png;base64,${composited.square.toString('base64')}`
        if (composited.landscape) imageLandscape = `data:image/png;base64,${composited.landscape.toString('base64')}`
        if (composited.vertical) imageVertical = `data:image/png;base64,${composited.vertical.toString('base64')}`
        console.log(`  [Generate] Composited images with template "${template.name}"`)
      } catch (err) {
        console.error('  [Generate] Compositor failed, using raw images:', err)
        if (squareBuf) imageSquare = `data:image/png;base64,${squareBuf.toString('base64')}`
        if (landscapeBuf) imageLandscape = `data:image/png;base64,${landscapeBuf.toString('base64')}`
        if (verticalBuf) imageVertical = `data:image/png;base64,${verticalBuf.toString('base64')}`
      }
    } else {
      if (squareBuf) imageSquare = `data:image/png;base64,${squareBuf.toString('base64')}`
      if (landscapeBuf) imageLandscape = `data:image/png;base64,${landscapeBuf.toString('base64')}`
      if (verticalBuf) imageVertical = `data:image/png;base64,${verticalBuf.toString('base64')}`
    }
  }

  const postId = crypto.randomUUID()
  const imageUrl = articleRows.find(a => a.image_url)?.image_url ?? null

  // Look up workflow_id for this agent if it has a pipeline agent setup
  let workflowId: string | null = null
  const workflowRow = await queryOne<{ id: string }>(
    `SELECT id FROM workflows WHERE pipeline_agent_id = $1 AND mode IN ('automated', 'both') LIMIT 1`,
    [agentId]
  )
  if (workflowRow) {
    workflowId = workflowRow.id
  }

  await execute(
    `INSERT INTO coverage_posts (
       id, agent_id, title, slug, summary, category, urgency, story_stage,
       confidence, fingerprint, key_facts, image_prompt,
       image_original, image_square, image_landscape, image_vertical,
       image_headline, status, workflow_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())`,
    [
      postId,
      agentId,
      generated.title,
      generated.slug ?? null,
      generated.summary,
      generated.category ?? null,
      cluster.urgency ?? 'routine',
      cluster.story_stage || 'developing',
      generated.confidence_score ?? 3,
      cluster.fingerprint,
      JSON.stringify(cluster.key_facts),
      generated.image_prompt ?? null,
      imageUrl,
      imageSquare,
      imageLandscape,
      imageVertical,
      generated.image_headline ?? null,
      'draft',
      workflowId,
    ],
  )

  // Insert social posts + link source articles in parallel
  const dbInserts: Promise<void>[] = []

  for (const platform of PLATFORMS) {
    const content = generated.social_posts[platform]
    if (content) {
      dbInserts.push(execute(
        `INSERT INTO coverage_social_posts (id, coverage_post_id, platform, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [crypto.randomUUID(), postId, platform, content],
      ))
    }
  }

  for (const articleId of cluster.article_ids) {
    dbInserts.push(execute(
      `INSERT INTO coverage_source_articles (id, coverage_post_id, article_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), postId, articleId],
    ))
  }

  await Promise.all(dbInserts)

  console.log(`  [Generate] Created post "${generated.title}" (id: ${postId})`)

  // Auto-publish to CMS if enabled
  try {
    const cmsEnabled = await getAgentSetting(agentId, 'cms_enabled')
    if (cmsEnabled === 'true') {
      const cmsCategory = (await getAgentSetting(agentId, 'cms_category')) || 'general'
      const cmsPublishStatus = ((await getAgentSetting(agentId, 'cms_publish_status')) as 'draft' | 'published') || 'draft'
      const categorySlug = mapCategoryToCmsSlug(generated.category ?? null, cmsCategory)
      const htmlContent = plainTextToHtml(generated.summary)
      const tags = generateTags(generated.category ?? null, JSON.stringify(cluster.key_facts))
      const excerpt = generated.summary.replace(/\n/g, ' ').slice(0, 200)
      const postSlug = generated.slug || generated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

      const cmsResult = await publishToCms(agentId, {
        title: generated.title,
        slug: postSlug,
        content: htmlContent,
        categorySlug,
        status: cmsPublishStatus,
        excerpt,
        tags,
        featuredImageUrl: imageLandscape || imageSquare || undefined,
        seoTitle: generated.title,
        seoDescription: excerpt,
        isBreaking: cluster.urgency === 'critical',
        externalId: postId,
      })

      if (cmsResult.success) {
        await execute(
          `UPDATE coverage_posts SET cms_slug = $1, cms_url = $2, status = 'published', updated_at = NOW() WHERE id = $3`,
          [cmsResult.slug ?? null, cmsResult.url ?? null, postId],
        )
        console.log(`  [Generate] Published to CMS: ${cmsResult.url || cmsResult.slug}`)

        // Link to developing story if applicable
        const storyId = await getAgentSetting(agentId, 'cms_story_id')
        if (storyId && cmsResult.slug) {
          await linkArticleToDevelopingStory(agentId, storyId, cmsResult.slug, generated.title, generated.summary, cluster.urgency ?? 'routine', imageLandscape || imageSquare || undefined)
        }
      } else {
        console.warn(`  [Generate] CMS publish failed: ${cmsResult.error}`)
      }
    }
  } catch (err) {
    console.error('  [Generate] CMS auto-publish error:', err)
  }

  return postId
}

export async function linkUpdateArticles(
  cluster: TopicCluster,
  existingPostId: string,
): Promise<void> {
  await Promise.all(
    cluster.article_ids.map(articleId =>
      execute(
        `INSERT INTO coverage_source_articles (id, coverage_post_id, article_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [crypto.randomUUID(), existingPostId, articleId],
      ),
    ),
  )
  await execute(`UPDATE coverage_posts SET updated_at = NOW() WHERE id = $1`, [existingPostId])
  console.log(`  [Generate] Linked ${cluster.article_ids.length} update articles to post ${existingPostId}`)
}

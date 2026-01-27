# ContentForge - API Documentation

> **Version:** 1.0.0
> **Last Updated:** January 2026
> **Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Content Generation Interfaces](#content-generation-interfaces)
3. [Content Generator Interface](#content-generator-interface)
4. [Simulated Generator](#simulated-generator)
5. [Claude Generator Integration Guide](#claude-generator-integration-guide)
6. [Authentication Interfaces](#authentication-interfaces)
7. [Storage Interfaces](#storage-interfaces)
8. [History Interfaces](#history-interfaces)
9. [Environment Variables](#environment-variables)
10. [Error Handling](#error-handling)

---

## Overview

ContentForge uses a **provider-based architecture** where all external dependencies (content generation, authentication, storage) are abstracted behind interfaces. This allows implementations to be swapped without modifying the UI layer.

### Architecture Principle

```
UI Components
     │
     ▼
Zustand Stores (state management)
     │
     ▼
Service Interfaces (contracts)
     │
     ├──▶ Local Implementations (current)
     │
     └──▶ API Implementations (future)
```

All interfaces are defined in `/src/types/` and implemented in `/src/services/`.

---

## Content Generation Interfaces

### ForgeInput

The input payload sent to any content generator.

```typescript
// File: src/types/content.ts

interface ForgeInput {
  /**
   * The topic or subject for content generation.
   * Must be at least 3 characters long.
   */
  topic: string;

  /**
   * The type of content to generate.
   * Determines the structural conventions of the output.
   */
  contentType: ContentType;

  /**
   * The tone/voice for the generated content.
   * Affects vocabulary, sentence structure, and formality.
   */
  tone: Tone;

  /**
   * The target audience for the content.
   * Affects complexity, jargon usage, and examples.
   */
  audience: Audience;

  /**
   * The desired length of the generated content.
   * Maps to specific word count ranges.
   */
  length: ContentLength;
}
```

### ContentType

```typescript
type ContentType = 'blog' | 'news' | 'social' | 'email' | 'academic' | 'marketing';

const CONTENT_TYPE_CONFIG: Record<ContentType, ContentTypeConfig> = {
  blog: {
    label: 'Blog Post',
    description: 'Informal, informative web article with subheadings and CTA',
    icon: 'FileText',
    structuralNotes: 'Introduction hook, subheadings, conversational tone, call-to-action',
  },
  news: {
    label: 'News Article',
    description: 'Objective, fact-based reporting in inverted pyramid structure',
    icon: 'Newspaper',
    structuralNotes: 'Lead paragraph, inverted pyramid, attribution, AP style',
  },
  social: {
    label: 'Social Media Post',
    description: 'Platform-optimized short-form content with engagement hooks',
    icon: 'Share2',
    structuralNotes: 'Hook line, concise body, hashtags, engagement prompt',
  },
  email: {
    label: 'Email Newsletter',
    description: 'Direct-to-reader periodic update with sections and links',
    icon: 'Mail',
    structuralNotes: 'Subject line, greeting, sections, links, sign-off',
  },
  academic: {
    label: 'Academic Essay',
    description: 'Formal, research-oriented writing with thesis and evidence',
    icon: 'GraduationCap',
    structuralNotes: 'Thesis statement, evidence paragraphs, citations, conclusion',
  },
  marketing: {
    label: 'Marketing Copy',
    description: 'Persuasive, brand-oriented content with value propositions',
    icon: 'Megaphone',
    structuralNotes: 'Headline, value proposition, benefits, social proof, CTA',
  },
};
```

### Tone

```typescript
type Tone = 'professional' | 'casual' | 'academic' | 'persuasive' | 'creative';

const TONE_CONFIG: Record<Tone, ToneConfig> = {
  professional: {
    label: 'Professional',
    description: 'Business-appropriate, polished, and measured',
    characteristics: ['Formal vocabulary', 'Measured pacing', 'Third-person preference'],
  },
  casual: {
    label: 'Casual',
    description: 'Friendly, approachable, and conversational',
    characteristics: ['Contractions', 'First/second person', 'Colloquial expressions'],
  },
  academic: {
    label: 'Academic',
    description: 'Scholarly, evidence-based, and precise',
    characteristics: ['Technical vocabulary', 'Passive voice acceptable', 'Citation-ready'],
  },
  persuasive: {
    label: 'Persuasive',
    description: 'Compelling, action-oriented, and convincing',
    characteristics: ['Power words', 'Rhetorical questions', 'Emotional appeals'],
  },
  creative: {
    label: 'Creative',
    description: 'Expressive, imaginative, and engaging',
    characteristics: ['Metaphors', 'Varied sentence structure', 'Vivid imagery'],
  },
};
```

### Audience

```typescript
type Audience = 'general' | 'professionals' | 'students' | 'executives' | 'young-adults';

const AUDIENCE_CONFIG: Record<Audience, AudienceConfig> = {
  general: {
    label: 'General Public',
    description: 'Broad, non-specialist readership',
    readingLevel: '8th grade',
    jargonLevel: 'minimal',
  },
  professionals: {
    label: 'Industry Professionals',
    description: 'Domain experts and practitioners',
    readingLevel: 'Advanced',
    jargonLevel: 'technical terminology acceptable',
  },
  students: {
    label: 'Students',
    description: 'Academic learners (high school to graduate)',
    readingLevel: '10th-12th grade',
    jargonLevel: 'defined when introduced',
  },
  executives: {
    label: 'Executives',
    description: 'Senior decision-makers and leaders',
    readingLevel: 'Advanced',
    jargonLevel: 'business terminology',
  },
  'young-adults': {
    label: 'Young Adults',
    description: 'Ages 18-30, digitally native audience',
    readingLevel: '10th grade',
    jargonLevel: 'contemporary/informal',
  },
};
```

### ContentLength

```typescript
type ContentLength = 'short' | 'medium' | 'long';

const LENGTH_CONFIG: Record<ContentLength, LengthConfig> = {
  short: {
    label: 'Short',
    description: 'Quick read, concise format',
    wordRange: { min: 150, max: 300 },
    estimatedReadTime: '1-2 min',
  },
  medium: {
    label: 'Medium',
    description: 'Standard length, well-developed',
    wordRange: { min: 400, max: 700 },
    estimatedReadTime: '3-5 min',
  },
  long: {
    label: 'Long',
    description: 'In-depth, comprehensive coverage',
    wordRange: { min: 900, max: 1500 },
    estimatedReadTime: '6-10 min',
  },
};
```

### ForgeOutput

The output payload returned by any content generator.

```typescript
interface ForgeOutput {
  /** Generated title for the content */
  title: string;

  /** The generated content body (may contain markdown formatting) */
  content: string;

  /** Quality and analytical metrics for the generated content */
  metrics: ContentMetrics;

  /** Contextual improvement suggestions (3-5 tips) */
  tips: string[];

  /** ISO 8601 timestamp of when the content was generated */
  generatedAt: string;
}
```

### ContentMetrics

```typescript
interface ContentMetrics {
  /** Total number of words in the generated content */
  wordCount: number;

  /** Estimated reading time in minutes (based on 200 WPM average) */
  readingTime: number;

  /**
   * Readability score on a 0-100 scale.
   * Based on Flesch-Kincaid readability principles.
   * Higher = more readable.
   */
  readabilityScore: number;

  /**
   * SEO optimization score on a 0-100 scale.
   * Evaluates keyword density, heading structure,
   * meta-friendliness, and content length.
   */
  seoScore: number;

  /**
   * Engagement prediction score on a 0-100 scale.
   * Based on content structure, hook quality,
   * and call-to-action presence.
   */
  engagementScore: number;
}
```

---

## Content Generator Interface

### IContentGenerator

The core interface that all content generation implementations must fulfill.

```typescript
// File: src/services/generators/IContentGenerator.ts

interface IContentGenerator {
  /**
   * Generates content based on the provided input configuration.
   *
   * @param input - The content generation parameters
   * @returns A promise that resolves with the generated content and metrics
   * @throws GenerationError if content generation fails
   */
  generate(input: ForgeInput): Promise<ForgeOutput>;

  /**
   * Optional: Returns the name of the provider for display purposes.
   */
  readonly providerName: string;
}
```

### Generator Factory

```typescript
// File: src/services/generators/generatorFactory.ts

import { SimulatedGenerator } from './SimulatedGenerator';
import { ClaudeGenerator } from './ClaudeGenerator';
import type { IContentGenerator } from './IContentGenerator';

/**
 * Creates the appropriate content generator based on environment configuration.
 *
 * @returns An IContentGenerator implementation
 */
export function createGenerator(): IContentGenerator {
  const provider = import.meta.env.VITE_AI_PROVIDER || 'simulated';

  switch (provider) {
    case 'claude':
      const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
      if (!apiKey) {
        console.warn('VITE_CLAUDE_API_KEY not set, falling back to simulated generator');
        return new SimulatedGenerator();
      }
      return new ClaudeGenerator(apiKey);

    case 'simulated':
    default:
      return new SimulatedGenerator();
  }
}
```

---

## Simulated Generator

### Overview

The `SimulatedGenerator` is the default content generation implementation used during development and for portfolio demonstrations. It produces realistic, structured content without requiring an external API.

### Implementation Details

```typescript
// File: src/services/generators/SimulatedGenerator.ts

class SimulatedGenerator implements IContentGenerator {
  readonly providerName = 'ContentForge Simulated Engine';

  /**
   * Generates content using pre-built templates and dynamic assembly.
   *
   * The generator:
   * 1. Selects a structural template based on contentType
   * 2. Applies tone modifiers to vocabulary and sentence structure
   * 3. Adapts complexity for the target audience
   * 4. Trims or expands to fit the target word count range
   * 5. Calculates metrics based on the final output
   * 6. Generates contextual improvement tips
   *
   * @param input - ForgeInput configuration
   * @returns Promise<ForgeOutput> after simulated processing delay
   */
  async generate(input: ForgeInput): Promise<ForgeOutput> {
    // Simulated processing delay (8-12 seconds)
    await this.simulateProcessing();

    const title = this.generateTitle(input);
    const content = this.generateContent(input);
    const metrics = this.calculateMetrics(content, input);
    const tips = this.generateTips(input, metrics);

    return {
      title,
      content,
      metrics,
      tips,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Simulates the multi-stage processing pipeline.
   * Emits progress events that the ProcessingVisualization component uses.
   */
  private async simulateProcessing(): Promise<void> {
    const stages = [
      { name: 'Analyzing topic', duration: 2000 },
      { name: 'Researching context', duration: 2500 },
      { name: 'Generating content', duration: 3000 },
      { name: 'Refining output', duration: 2000 },
      { name: 'Polishing final draft', duration: 1500 },
    ];

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }
  }

  private getMaxWords(length: ContentLength): number { /* ... */ }
  private generateTitle(input: ForgeInput): string { /* ... */ }
  private generateContent(input: ForgeInput): string { /* ... */ }
  private calculateMetrics(content: string, input: ForgeInput): ContentMetrics { /* ... */ }
  private generateTips(input: ForgeInput, metrics: ContentMetrics): string[] { /* ... */ }
}
```

### Configuration

No external configuration is required. The simulated generator is self-contained and operates entirely within the browser.

---

## Claude Generator Integration Guide

### Overview

The `ClaudeGenerator` is designed for future integration with Anthropic's Claude API. When activated, it replaces the simulated generator to produce AI-generated content using Claude's language model.

### Prerequisites

1. An Anthropic API key with Messages API access
2. A backend proxy (recommended) to avoid exposing the API key in the browser
3. CORS-compatible endpoint

### API Endpoint

```
POST https://api.anthropic.com/v1/messages
```

> **Important:** Direct browser-to-API calls require a proxy server to avoid exposing the API key. In production, route requests through your backend.

### Request Headers

```typescript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': VITE_CLAUDE_API_KEY,          // API key
  'anthropic-version': '2023-06-01',          // API version
};
```

### Request Format

```typescript
interface ClaudeRequest {
  model: string;           // e.g., 'claude-sonnet-4-20250514'
  max_tokens: number;      // Based on ContentLength
  messages: ClaudeMessage[];
  system?: string;         // System prompt for content generation
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### System Prompt Template

```typescript
const SYSTEM_PROMPT = `You are ContentForge, an AI content writing assistant
specialized in generating content for mass communication students.

You generate content based on the following parameters:
- Content Type: Determines structure and conventions
- Tone: Determines vocabulary, formality, and voice
- Audience: Determines complexity and jargon usage
- Length: Determines word count target

Your output must be valid JSON with this exact structure:
{
  "title": "Generated Title",
  "content": "The full generated content with markdown formatting",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Follow the structural conventions for each content type:
- Blog Post: Hook intro, subheadings, conversational, CTA
- News Article: Inverted pyramid, lead paragraph, attribution
- Social Media: Hook line, concise, hashtags, engagement prompt
- Email Newsletter: Subject, greeting, sections, sign-off
- Academic Essay: Thesis, evidence, citations, conclusion
- Marketing Copy: Headline, value prop, benefits, CTA`;
```

### User Prompt Construction

```typescript
private buildPrompt(input: ForgeInput): string {
  return `Generate a ${input.contentType} about "${input.topic}".

Parameters:
- Content Type: ${CONTENT_TYPE_CONFIG[input.contentType].label}
- Tone: ${TONE_CONFIG[input.tone].label} - ${TONE_CONFIG[input.tone].description}
- Target Audience: ${AUDIENCE_CONFIG[input.audience].label} - ${AUDIENCE_CONFIG[input.audience].description}
- Length: ${LENGTH_CONFIG[input.length].label} (${LENGTH_CONFIG[input.length].wordRange.min}-${LENGTH_CONFIG[input.length].wordRange.max} words)

Generate the content following the exact JSON structure specified in your instructions.`;
}
```

### Max Token Mapping

```typescript
private getMaxTokens(length: ContentLength): number {
  const tokenMap: Record<ContentLength, number> = {
    short: 800,    // ~150-300 words
    medium: 1500,  // ~400-700 words
    long: 3000,    // ~900-1500 words
  };
  return tokenMap[length];
}
```

### Response Mapping

```typescript
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

private mapResponse(response: ClaudeResponse, input: ForgeInput): ForgeOutput {
  const rawText = response.content[0].text;
  const parsed = JSON.parse(rawText);

  const content = parsed.content;
  const wordCount = content.split(/\s+/).length;

  return {
    title: parsed.title,
    content: parsed.content,
    metrics: {
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
      readabilityScore: this.calculateReadability(content),
      seoScore: this.calculateSEO(content, input),
      engagementScore: this.calculateEngagement(content, input),
    },
    tips: parsed.tips || this.generateFallbackTips(input),
    generatedAt: new Date().toISOString(),
  };
}
```

### Error Handling

```typescript
async generate(input: ForgeInput): Promise<ForgeOutput> {
  try {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequest(input)),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new GenerationError(
        `Claude API error: ${error.error?.message || response.statusText}`,
        response.status
      );
    }

    const data: ClaudeResponse = await response.json();
    return this.mapResponse(data, input);
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    throw new GenerationError(
      'Failed to connect to content generation service',
      0
    );
  }
}
```

### Integration Checklist

- [ ] Set `VITE_AI_PROVIDER=claude` in `.env`
- [ ] Set `VITE_CLAUDE_API_KEY` with a valid Anthropic API key
- [ ] Implement backend proxy for production (to protect API key)
- [ ] Test with all 6 content types
- [ ] Test with all tone/audience/length combinations
- [ ] Verify JSON parsing from Claude responses
- [ ] Add rate limiting (Claude API has rate limits per tier)
- [ ] Add retry logic for transient failures
- [ ] Monitor token usage for cost management

---

## Authentication Interfaces

### IAuthProvider

```typescript
// File: src/services/auth/IAuthProvider.ts

interface IAuthProvider {
  /**
   * Authenticates a user with email and password.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to the authenticated User object
   * @throws AuthError with code 'INVALID_CREDENTIALS' if authentication fails
   */
  login(email: string, password: string): Promise<User>;

  /**
   * Creates a new user account.
   *
   * @param name - User's display name
   * @param email - User's email address
   * @param password - User's password (minimum 6 characters)
   * @returns Promise resolving to the newly created User object
   * @throws AuthError with code 'EMAIL_EXISTS' if email is already registered
   * @throws AuthError with code 'VALIDATION_ERROR' if input validation fails
   */
  signup(name: string, email: string, password: string): Promise<User>;

  /**
   * Ends the current user session.
   */
  logout(): void;

  /**
   * Retrieves the currently authenticated user, if any.
   *
   * @returns The current User or null if not authenticated
   */
  getCurrentUser(): User | null;

  /**
   * Checks if a valid session exists.
   *
   * @returns true if a user is currently authenticated
   */
  isAuthenticated(): boolean;
}
```

### User Interface

```typescript
interface User {
  /** Unique identifier (UUID v4) */
  id: string;

  /** User's display name */
  name: string;

  /** User's email address */
  email: string;

  /** ISO 8601 timestamp of account creation */
  createdAt: string;
}
```

### AuthError

```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_EXISTS'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR';
```

### LocalAuthProvider Implementation

```typescript
// File: src/services/auth/LocalAuthProvider.ts

class LocalAuthProvider implements IAuthProvider {
  private readonly USERS_KEY = 'contentforge-users';
  private readonly SESSION_KEY = 'contentforge-session';

  async login(email: string, password: string): Promise<User> {
    const users = this.getStoredUsers();
    const user = users.find(u => u.email === email);

    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    this.setSession(user.id);
    return this.toPublicUser(user);
  }

  async signup(name: string, email: string, password: string): Promise<User> {
    this.validateSignupInput(name, email, password);

    const users = this.getStoredUsers();
    if (users.some(u => u.email === email)) {
      throw new AuthError('An account with this email already exists', 'EMAIL_EXISTS');
    }

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser.id);

    return this.toPublicUser(newUser);
  }

  logout(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  getCurrentUser(): User | null {
    const sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) return null;

    const users = this.getStoredUsers();
    const user = users.find(u => u.id === sessionId);
    return user ? this.toPublicUser(user) : null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}
```

---

## Storage Interfaces

### IStorageProvider

```typescript
// File: src/services/storage/IStorageProvider.ts

interface IStorageProvider {
  /**
   * Retrieves an item from storage.
   *
   * @param key - The storage key
   * @returns The stored value or null if not found
   */
  getItem<T>(key: string): T | null;

  /**
   * Stores an item in storage.
   *
   * @param key - The storage key
   * @param value - The value to store (will be serialized)
   */
  setItem<T>(key: string, value: T): void;

  /**
   * Removes an item from storage.
   *
   * @param key - The storage key to remove
   */
  removeItem(key: string): void;

  /**
   * Clears all items from storage.
   * Use with caution - this removes ALL stored data.
   */
  clear(): void;

  /**
   * Returns all storage keys.
   *
   * @returns Array of all storage keys
   */
  getKeys(): string[];
}
```

### LocalStorageProvider

```typescript
// File: src/services/storage/LocalStorageProvider.ts

class LocalStorageProvider implements IStorageProvider {
  private readonly prefix: string;

  constructor(prefix: string = 'contentforge') {
    this.prefix = prefix;
  }

  getItem<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefixKey(key));
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    localStorage.setItem(this.prefixKey(key), JSON.stringify(value));
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.prefixKey(key));
  }

  clear(): void {
    const keys = this.getKeys();
    keys.forEach(key => localStorage.removeItem(key));
  }

  getKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private prefixKey(key: string): string {
    return `${this.prefix}-${key}`;
  }
}
```

---

## History Interfaces

### HistoryEntry

```typescript
interface HistoryEntry {
  /** Unique identifier (UUID v4) */
  id: string;

  /** ISO 8601 timestamp of when the content was generated */
  createdAt: string;

  /** The user ID who generated this content */
  userId: string;

  /** The topic that was submitted */
  topic: string;

  /** The content type that was selected */
  contentType: ContentType;

  /** The tone that was selected */
  tone: Tone;

  /** The audience that was selected */
  audience: Audience;

  /** The length that was selected */
  length: ContentLength;

  /** The complete generation output */
  output: ForgeOutput;
}
```

### History Store Actions

```typescript
interface HistoryActions {
  /**
   * Adds a new entry to the history.
   * Automatically generates id, createdAt, and associates with current user.
   *
   * @param entry - The entry data (without id, createdAt, userId)
   */
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'userId'>) => void;

  /**
   * Retrieves a single history entry by ID.
   *
   * @param id - The entry ID to find
   * @returns The HistoryEntry or undefined if not found
   */
  getEntry: (id: string) => HistoryEntry | undefined;

  /**
   * Returns all history entries for the current user.
   * Sorted in reverse chronological order.
   *
   * @returns Array of HistoryEntry objects
   */
  getEntries: () => HistoryEntry[];

  /**
   * Deletes a single history entry.
   *
   * @param id - The entry ID to delete
   */
  deleteEntry: (id: string) => void;

  /**
   * Clears all history entries for the current user.
   * Does not affect other users' data.
   */
  clearHistory: () => void;

  /**
   * Sets the currently selected/viewed entry.
   *
   * @param id - The entry ID to select, or null to deselect
   */
  selectEntry: (id: string | null) => void;
}
```

### History Persistence

History data is persisted to `localStorage` using Zustand's `persist` middleware:

```typescript
const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      selectedEntryId: null,

      addEntry: (entryData) => {
        const authStore = useAuthStore.getState();
        const userId = authStore.user?.id;
        if (!userId) return;

        const entry: HistoryEntry = {
          ...entryData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          userId,
        };

        set((state) => ({
          entries: [entry, ...state.entries],
        }));
      },

      getEntries: () => {
        const authStore = useAuthStore.getState();
        const userId = authStore.user?.id;
        return get().entries.filter(e => e.userId === userId);
      },

      // ... other actions
    }),
    {
      name: 'contentforge-history',
    }
  )
);
```

---

## Environment Variables

All environment variables use the `VITE_` prefix for Vite compatibility.

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `VITE_AI_PROVIDER` | `string` | `'simulated'` | No | Content generation provider: `'simulated'` or `'claude'` |
| `VITE_CLAUDE_API_KEY` | `string` | - | Only if provider is `'claude'` | Anthropic API key for Claude integration |
| `VITE_CLAUDE_MODEL` | `string` | `'claude-sonnet-4-20250514'` | No | Claude model identifier |
| `VITE_APP_NAME` | `string` | `'ContentForge'` | No | Application display name |
| `VITE_APP_URL` | `string` | `'http://localhost:5173'` | No | Application base URL |
| `VITE_STORAGE_PREFIX` | `string` | `'contentforge'` | No | Prefix for localStorage keys |

### Example `.env` File

```bash
# .env.example

# Content Generation Provider
# Options: 'simulated' (default), 'claude'
VITE_AI_PROVIDER=simulated

# Claude API Configuration (required only if VITE_AI_PROVIDER=claude)
VITE_CLAUDE_API_KEY=sk-ant-api03-your-key-here
VITE_CLAUDE_MODEL=claude-sonnet-4-20250514

# Application Configuration
VITE_APP_NAME=ContentForge
VITE_APP_URL=http://localhost:5173
VITE_STORAGE_PREFIX=contentforge
```

> **Security Note:** Never commit `.env` files containing API keys to version control. The `.env.example` file should contain placeholder values only.

---

## Error Handling

### Error Types

```typescript
/** Base error class for ContentForge */
class ContentForgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ContentForgeError';
  }
}

/** Content generation errors */
class GenerationError extends ContentForgeError {
  constructor(message: string, statusCode?: number) {
    super(message, 'GENERATION_ERROR', statusCode);
    this.name = 'GenerationError';
  }
}

/** Authentication errors */
class AuthError extends ContentForgeError {
  constructor(message: string, code: AuthErrorCode) {
    super(message, code);
    this.name = 'AuthError';
  }
}

/** Storage errors */
class StorageError extends ContentForgeError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}
```

### Error Handling Strategy

1. **Service Layer:** Throws typed errors with descriptive messages and error codes.
2. **Store Layer:** Catches errors, sets `error` state, and optionally logs.
3. **UI Layer:** Reads `error` state and displays user-friendly messages via toast notifications.

```typescript
// Store-level error handling example
generate: async () => {
  set({ phase: 'processing', error: null });

  try {
    const generator = createGenerator();
    const input = get().getForgeInput();
    const output = await generator.generate(input);

    set({ phase: 'output', output });

    // Auto-save to history
    useHistoryStore.getState().addEntry({
      topic: input.topic,
      contentType: input.contentType,
      tone: input.tone,
      audience: input.audience,
      length: input.length,
      output,
    });
  } catch (error) {
    const message = error instanceof ContentForgeError
      ? error.message
      : 'An unexpected error occurred during content generation.';

    set({ phase: 'input', error: message });
  }
};
```

---

*This API documentation covers all interfaces, implementations, and integration points for the ContentForge application. Refer to this document when implementing new providers, debugging integration issues, or onboarding new developers.*

# ContentForge - Technical Architecture

> **Version:** 1.0.0
> **Last Updated:** January 2026
> **Status:** Active Development

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Component Architecture](#component-architecture)
3. [State Management](#state-management)
4. [Data Flow](#data-flow)
5. [Authentication Architecture](#authentication-architecture)
6. [Content Generation Pipeline](#content-generation-pipeline)
7. [File Structure](#file-structure)
8. [Dependency Graph](#dependency-graph)

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.x | UI component library with concurrent features |
| **TypeScript** | 5.x | Static type safety across the entire codebase |
| **Vite** | 5.x | Build tool and dev server with HMR |

### Styling & UI

| Technology | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | v4 | Utility-first CSS framework |
| **Lucide React** | Latest | Icon library (tree-shakeable SVG icons) |
| **Custom CSS** | - | Glassmorphism effects, animations, particle systems |

### State & Routing

| Technology | Version | Purpose |
|---|---|---|
| **Zustand** | 4.x | Lightweight state management with TypeScript support |
| **React Router** | 6.x | Client-side routing with protected routes |

### Development Tools

| Technology | Purpose |
|---|---|
| **ESLint** | Code linting and style enforcement |
| **Prettier** | Code formatting |
| **PostCSS** | CSS processing pipeline for Tailwind |

### Rationale

- **React 18** was chosen for its concurrent rendering capabilities, which support smooth animations during content generation without blocking the UI thread.
- **Zustand** over Redux: Minimal boilerplate, excellent TypeScript inference, and built-in persistence middleware make it ideal for a project of this scale.
- **Vite** over CRA/Webpack: Near-instant HMR, native ES module support, and optimized production builds.
- **Tailwind CSS v4** provides the new engine with improved performance and CSS-first configuration.

---

## Component Architecture

### Component Tree

```
App
├── ThemeProvider
│   └── Router (BrowserRouter)
│       ├── Layout
│       │   ├── Navbar
│       │   │   ├── Logo
│       │   │   ├── NavLinks
│       │   │   ├── ThemeToggle
│       │   │   ├── UserMenu (authenticated)
│       │   │   └── MobileMenuButton
│       │   │
│       │   ├── <Outlet /> (Route Content)
│       │   │   │
│       │   │   ├── LandingPage (/)
│       │   │   │   ├── HeroSection
│       │   │   │   │   ├── AnimatedBackground
│       │   │   │   │   ├── HeroTitle
│       │   │   │   │   └── CTAButton
│       │   │   │   ├── FeaturesSection
│       │   │   │   │   └── FeatureCard[] (mapped)
│       │   │   │   ├── HowItWorksSection
│       │   │   │   │   └── StepCard[] (mapped)
│       │   │   │   └── FooterCTA
│       │   │   │
│       │   │   ├── ForgePage (/forge)
│       │   │   │   ├── ForgeInput
│       │   │   │   │   ├── TopicInput
│       │   │   │   │   ├── ContentTypeSelector
│       │   │   │   │   │   └── TypeCard[] (mapped)
│       │   │   │   │   ├── ToneSelector
│       │   │   │   │   ├── AudienceSelector
│       │   │   │   │   ├── LengthSelector
│       │   │   │   │   └── GenerateButton
│       │   │   │   │
│       │   │   │   ├── ProcessingVisualization (conditional)
│       │   │   │   │   ├── ParticleSystem
│       │   │   │   │   │   └── Particle[] (canvas/DOM)
│       │   │   │   │   ├── AgentNodes
│       │   │   │   │   │   └── AgentNode[] (mapped)
│       │   │   │   │   ├── NeuralNetwork
│       │   │   │   │   │   └── NetworkLayer[] (mapped)
│       │   │   │   │   ├── ProgressSteps
│       │   │   │   │   │   └── Step[] (mapped)
│       │   │   │   │   └── SkipButton
│       │   │   │   │
│       │   │   │   └── ForgeOutput (conditional)
│       │   │   │       ├── ContentDisplay
│       │   │   │       │   ├── ContentTitle
│       │   │   │       │   └── ContentBody
│       │   │   │       ├── MetricsDashboard
│       │   │   │       │   └── MetricCard[] (mapped)
│       │   │   │       ├── ImprovementTips
│       │   │   │       │   └── TipCard[] (mapped)
│       │   │   │       ├── CopyButton
│       │   │   │       └── ExportButton
│       │   │   │
│       │   │   ├── AuthPage (/login, /signup)
│       │   │   │   ├── AuthForm
│       │   │   │   │   ├── InputField[] (mapped)
│       │   │   │   │   ├── SubmitButton
│       │   │   │   │   └── AuthToggleLink
│       │   │   │   └── AuthBackground
│       │   │   │
│       │   │   ├── HistoryPage (/history) [Protected]
│       │   │   │   ├── HistoryList
│       │   │   │   │   └── HistoryCard[] (mapped)
│       │   │   │   ├── HistoryDetail (modal/expanded)
│       │   │   │   └── ClearHistoryButton
│       │   │   │
│       │   │   └── NotFoundPage (*)
│       │   │
│       │   └── Footer
│       │       ├── FooterLinks
│       │       └── Copyright
│       │
│       └── ProtectedRoute (wrapper)
│           └── children (rendered if authenticated)
```

### Component Classification

| Category | Components | Responsibility |
|---|---|---|
| **Layout** | Layout, Navbar, Footer | Page structure, navigation, global UI |
| **Pages** | LandingPage, ForgePage, AuthPage, HistoryPage | Route-level containers, page composition |
| **Feature** | ForgeInput, ProcessingVisualization, ForgeOutput | Core business logic and interaction |
| **Visualization** | ParticleSystem, AgentNodes, NeuralNetwork, ProgressSteps | Animation and visual feedback |
| **UI Primitives** | InputField, Button, Card, Modal, Toast | Reusable, stateless UI elements |
| **Auth** | AuthForm, ProtectedRoute | Authentication flow and route guarding |

---

## State Management

ContentForge uses **Zustand** for state management, organized into four domain-specific stores. Each store is independently accessible, avoiding unnecessary re-renders.

### Store Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Zustand Stores                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ useAuthStore │  │useForgeStore│  │useHistoryStore │  │
│  │             │  │             │  │                │  │
│  │ - user      │  │ - topic     │  │ - entries[]    │  │
│  │ - isAuth    │  │ - type      │  │ - selectedId   │  │
│  │ - loading   │  │ - tone      │  │                │  │
│  │             │  │ - audience  │  │ + addEntry()   │  │
│  │ + login()   │  │ - length    │  │ + getEntry()   │  │
│  │ + signup()  │  │ - phase     │  │ + clearAll()   │  │
│  │ + logout()  │  │ - output    │  │ + deleteOne()  │  │
│  │             │  │             │  │                │  │
│  │             │  │ + setInput()│  │                │  │
│  │             │  │ + generate()│  │                │  │
│  │             │  │ + reset()   │  │                │  │
│  └─────────────┘  └─────────────┘  └────────────────┘  │
│                                                         │
│  ┌──────────────┐                                       │
│  │useThemeStore │                                       │
│  │              │                                       │
│  │ - theme      │                                       │
│  │ - toggle()   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### useAuthStore

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
```

### useForgeStore

```typescript
interface ForgeState {
  // Input Configuration
  topic: string;
  contentType: ContentType;
  tone: Tone;
  audience: Audience;
  length: ContentLength;

  // Processing State
  phase: ForgePhase;  // 'input' | 'processing' | 'output'
  currentStep: number;
  progress: number;

  // Output
  output: ForgeOutput | null;
  error: string | null;

  // Actions
  setTopic: (topic: string) => void;
  setContentType: (type: ContentType) => void;
  setTone: (tone: Tone) => void;
  setAudience: (audience: Audience) => void;
  setLength: (length: ContentLength) => void;
  generate: () => Promise<void>;
  reset: () => void;
}

type ContentType = 'blog' | 'news' | 'social' | 'email' | 'academic' | 'marketing';
type Tone = 'professional' | 'casual' | 'academic' | 'persuasive' | 'creative';
type Audience = 'general' | 'professionals' | 'students' | 'executives' | 'young-adults';
type ContentLength = 'short' | 'medium' | 'long';
type ForgePhase = 'input' | 'processing' | 'output';
```

### useHistoryStore

```typescript
interface HistoryState {
  entries: HistoryEntry[];
  selectedEntryId: string | null;

  addEntry: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => void;
  getEntry: (id: string) => HistoryEntry | undefined;
  deleteEntry: (id: string) => void;
  clearHistory: () => void;
  selectEntry: (id: string | null) => void;
}

interface HistoryEntry {
  id: string;
  createdAt: string;
  topic: string;
  contentType: ContentType;
  tone: Tone;
  audience: Audience;
  length: ContentLength;
  output: ForgeOutput;
}
```

### useThemeStore

```typescript
interface ThemeState {
  theme: 'dark' | 'light';
  toggle: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}
```

### Persistence Strategy

All stores use Zustand's `persist` middleware with `localStorage`:

```typescript
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'contentforge-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

## Data Flow

### Content Generation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Content Generation Pipeline                   │
│                                                                   │
│  ┌─────────┐    ┌───────────┐    ┌──────────────┐    ┌────────┐ │
│  │  User    │    │  Forge    │    │   Content     │    │ Output │ │
│  │  Input   │───>│  Store    │───>│  Generator    │───>│ Store  │ │
│  │         │    │          │    │  (Interface)  │    │        │ │
│  │ - topic │    │ setInput │    │              │    │ result │ │
│  │ - type  │    │ validate │    │ Simulated OR │    │ metrics│ │
│  │ - tone  │    │ generate │    │ Claude API   │    │ tips   │ │
│  │ - aud.  │    │          │    │              │    │        │ │
│  │ - len.  │    │          │    │              │    │        │ │
│  └─────────┘    └───────────┘    └──────────────┘    └────────┘ │
│                       │                                    │     │
│                       │         ┌──────────────┐           │     │
│                       └────────>│  Processing  │           │     │
│                                 │ Visualization│           │     │
│                                 │              │           │     │
│                                 │ - Particles  │           │     │
│                                 │ - Agents     │           │     │
│                                 │ - Neural Net │           │     │
│                                 │ - Progress   │           │     │
│                                 └──────────────┘           │     │
│                                                            │     │
│                                                    ┌───────▼───┐ │
│                                                    │  History   │ │
│                                                    │  Store     │ │
│                                                    │            │ │
│                                                    │ addEntry() │ │
│                                                    └────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Detailed Sequence

1. **Input Phase:** User configures topic, content type, tone, audience, and length in `ForgeInput`. Each selection dispatches an action to `useForgeStore`.

2. **Validation:** On "Generate" click, the store validates that all required fields are populated and the topic meets minimum length requirements.

3. **Phase Transition:** Store sets `phase: 'processing'`, which triggers the `ProcessingVisualization` component to mount.

4. **Content Generation:** The store calls the active `IContentGenerator` implementation:
   - `SimulatedGenerator` returns pre-structured content after a simulated delay.
   - `ClaudeGenerator` (future) will make an API call to Anthropic's Claude API.

5. **Visualization Sync:** During generation, the `ProcessingVisualization` component runs through its animation stages, synchronized with progress updates from the generator.

6. **Output Phase:** Upon completion, the store sets `phase: 'output'` with the `ForgeOutput` data. The `ForgeOutput` component mounts with the results.

7. **History Persistence:** The completed generation is automatically added to `useHistoryStore`, which persists it to `localStorage`.

---

## Authentication Architecture

### Design Philosophy

Authentication is implemented with a **localStorage-based abstraction layer** that mirrors a real API authentication flow. This design allows seamless migration to a backend API without modifying any UI components.

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  UI Components                    │
│  AuthForm, Navbar, ProtectedRoute                │
└──────────────────────┬──────────────────────────┘
                       │ calls
┌──────────────────────▼──────────────────────────┐
│               useAuthStore (Zustand)              │
│  login() | signup() | logout() | checkAuth()      │
└──────────────────────┬──────────────────────────┘
                       │ delegates to
┌──────────────────────▼──────────────────────────┐
│             IAuthProvider Interface               │
│  login() | signup() | logout() | getCurrentUser() │
└───────────┬─────────────────────┬───────────────┘
            │                     │
┌───────────▼──────┐  ┌──────────▼────────┐
│ LocalAuthProvider │  │ APIAuthProvider   │
│ (Current)        │  │ (Future)          │
│                  │  │                   │
│ localStorage     │  │ REST API calls    │
│ bcrypt-like hash │  │ JWT tokens        │
│ UUID generation  │  │ Refresh tokens    │
└──────────────────┘  └───────────────────┘
```

### LocalAuthProvider Implementation

- **User Storage:** Users are stored in `localStorage` under the key `contentforge-users` as a JSON array.
- **Password Handling:** Passwords are hashed using a simple encoding scheme (production would use bcrypt via API).
- **Session Token:** A session identifier is stored in `contentforge-session` to maintain login state.
- **User Scoping:** History data is scoped by user ID, ensuring data isolation.

### Migration Path to API

When a backend is introduced, only the `IAuthProvider` implementation needs to change:

1. Create `APIAuthProvider` implementing the same interface
2. Swap the provider in the store factory
3. No UI component changes required

---

## Content Generation Pipeline

### Generator Interface

```typescript
interface IContentGenerator {
  generate(input: ForgeInput): Promise<ForgeOutput>;
}

interface ForgeInput {
  topic: string;
  contentType: ContentType;
  tone: Tone;
  audience: Audience;
  length: ContentLength;
}

interface ForgeOutput {
  title: string;
  content: string;
  metrics: ContentMetrics;
  tips: string[];
  generatedAt: string;
}
```

### SimulatedGenerator (Current)

The `SimulatedGenerator` is the default implementation used during development and for the portfolio demonstration:

- **Template System:** Maintains content templates for each content type, tone, and audience combination.
- **Dynamic Assembly:** Constructs output by combining appropriate structural elements based on input configuration.
- **Simulated Delay:** Introduces a 8-12 second delay to allow the visualization animation to play fully.
- **Deterministic Metrics:** Generates metrics based on the actual word count and content characteristics.

### ClaudeGenerator (Future Integration)

A stub `ClaudeGenerator` class exists, ready for integration with Anthropic's Claude API:

```typescript
class ClaudeGenerator implements IContentGenerator {
  private apiKey: string;
  private endpoint: string = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(input: ForgeInput): Promise<ForgeOutput> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: this.getMaxTokens(input.length),
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(input),
          },
        ],
      }),
    });

    const data = await response.json();
    return this.mapResponse(data, input);
  }
}
```

### Provider Selection

The active generator is selected at runtime based on the `VITE_AI_PROVIDER` environment variable:

```typescript
function createGenerator(): IContentGenerator {
  const provider = import.meta.env.VITE_AI_PROVIDER || 'simulated';

  switch (provider) {
    case 'claude':
      return new ClaudeGenerator(import.meta.env.VITE_CLAUDE_API_KEY);
    case 'simulated':
    default:
      return new SimulatedGenerator();
  }
}
```

---

## File Structure

```
content_forge/
├── public/
│   ├── favicon.ico
│   ├── og-image.png
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthForm.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── forge/
│   │   │   ├── ForgeInput.tsx
│   │   │   ├── ForgeOutput.tsx
│   │   │   ├── ContentTypeSelector.tsx
│   │   │   ├── ToneSelector.tsx
│   │   │   ├── AudienceSelector.tsx
│   │   │   ├── LengthSelector.tsx
│   │   │   └── TopicInput.tsx
│   │   │
│   │   ├── visualization/
│   │   │   ├── ProcessingVisualization.tsx
│   │   │   ├── ParticleSystem.tsx
│   │   │   ├── AgentNodes.tsx
│   │   │   ├── NeuralNetwork.tsx
│   │   │   └── ProgressSteps.tsx
│   │   │
│   │   ├── output/
│   │   │   ├── ContentDisplay.tsx
│   │   │   ├── MetricsDashboard.tsx
│   │   │   ├── ImprovementTips.tsx
│   │   │   ├── CopyButton.tsx
│   │   │   └── ExportButton.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── landing/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesSection.tsx
│   │   │   ├── HowItWorksSection.tsx
│   │   │   └── FooterCTA.tsx
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryList.tsx
│   │   │   ├── HistoryCard.tsx
│   │   │   └── HistoryDetail.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       ├── Badge.tsx
│   │       └── Spinner.tsx
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── ForgePage.tsx
│   │   ├── AuthPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── stores/
│   │   ├── useAuthStore.ts
│   │   ├── useForgeStore.ts
│   │   ├── useHistoryStore.ts
│   │   └── useThemeStore.ts
│   │
│   ├── services/
│   │   ├── generators/
│   │   │   ├── IContentGenerator.ts
│   │   │   ├── SimulatedGenerator.ts
│   │   │   ├── ClaudeGenerator.ts
│   │   │   └── generatorFactory.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── IAuthProvider.ts
│   │   │   └── LocalAuthProvider.ts
│   │   │
│   │   └── storage/
│   │       ├── IStorageProvider.ts
│   │       └── LocalStorageProvider.ts
│   │
│   ├── types/
│   │   ├── content.ts
│   │   ├── auth.ts
│   │   └── common.ts
│   │
│   ├── utils/
│   │   ├── contentTemplates.ts
│   │   ├── metrics.ts
│   │   ├── validation.ts
│   │   └── formatters.ts
│   │
│   ├── hooks/
│   │   ├── useAnimation.ts
│   │   ├── useMediaQuery.ts
│   │   └── useClipboard.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── docs/
│   ├── 00-MASTER-REQUIREMENTS.md
│   ├── 01-TECHNICAL-ARCHITECTURE.md
│   ├── 02-UI-UX-DESIGN-SYSTEM.md
│   ├── 03-API-DOCUMENTATION.md
│   └── 04-DEPLOYMENT-GUIDE.md
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── README.md
```

---

## Dependency Graph

### Runtime Dependencies

```
React 18
├── react-dom (rendering)
├── react-router-dom (routing)
└── zustand (state management)
    └── zustand/middleware (persist)

Lucide React (icons)
Tailwind CSS v4 (styling)
```

### Build Dependencies

```
Vite
├── @vitejs/plugin-react (React Fast Refresh)
├── vite-plugin-compression (gzip/brotli)
└── rollup (bundling, via Vite)

TypeScript
├── @types/react
└── @types/react-dom

PostCSS
├── tailwindcss
└── autoprefixer

ESLint
├── eslint-plugin-react
├── eslint-plugin-react-hooks
└── @typescript-eslint/eslint-plugin
```

---

*This architecture document should be referenced when making implementation decisions, adding new features, or onboarding new contributors to the ContentForge project.*

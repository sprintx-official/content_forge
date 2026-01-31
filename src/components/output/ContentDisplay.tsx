import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
} from 'lucide-react'

interface ContentDisplayProps {
  content: string
  onEditorReady?: (editor: Editor) => void
  isCodeMode?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

function contentToHTML(content: string): string {
  return content
    .split('\n\n')
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join('')
}

function codeToHTML(content: string): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<pre><code>${escaped}</code></pre>`
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-all',
        isActive
          ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
          : 'text-[#9ca3af] hover:text-white hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/10 mx-1" />
}

interface ToolbarProps {
  editor: Editor
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

function Toolbar({ editor, isFullscreen, onToggleFullscreen }: ToolbarProps) {
  const iconSize = 'w-4 h-4'

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/10 bg-white/[0.03]">
      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className={iconSize} />
      </ToolbarButton>

      {/* Fullscreen toggle */}
      {onToggleFullscreen && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={onToggleFullscreen}
            isActive={isFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className={iconSize} />
            ) : (
              <Maximize2 className={iconSize} />
            )}
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

export default function ContentDisplay({
  content,
  onEditorReady,
  isCodeMode,
  isFullscreen,
  onToggleFullscreen,
}: ContentDisplayProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Your content will appear here…' }),
    ],
    content: isCodeMode ? codeToHTML(content) : contentToHTML(content),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[200px] px-6 py-4 md:px-8 md:py-6',
      },
    },
  })

  const onEditorReadyCb = useCallback(
    (e: Editor) => onEditorReady?.(e),
    [onEditorReady],
  )

  useEffect(() => {
    if (editor) {
      onEditorReadyCb(editor)
    }
  }, [editor, onEditorReadyCb])

  // Update editor content when the content prop changes externally (e.g. regenerate, tab switch)
  useEffect(() => {
    if (editor && content) {
      const newHTML = isCodeMode ? codeToHTML(content) : contentToHTML(content)
      // Only replace if different to avoid cursor jumps
      if (editor.getHTML() !== newHTML) {
        editor.commands.setContent(newHTML)
      }
    }
  }, [editor, content, isCodeMode])

  // Handle Escape key for fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onToggleFullscreen) {
        onToggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, onToggleFullscreen])

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden',
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none flex flex-col'
          : 'rounded-2xl max-h-[60vh] overflow-y-auto animate-[fadeIn_0.6s_ease-out_both]',
        '[&::-webkit-scrollbar]:w-1.5',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb]:hover:bg-white/20',
      )}
    >
      {editor && (
        <Toolbar
          editor={editor}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}

      <div className={cn('tiptap-editor', isFullscreen && 'flex-1 overflow-y-auto')}>
        <EditorContent editor={editor} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tiptap-editor .tiptap {
          color: #f9fafb;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          line-height: 1.625;
        }

        @media (min-width: 768px) {
          .tiptap-editor .tiptap {
            font-size: 1.125rem;
          }
        }

        .tiptap-editor .tiptap p {
          margin-bottom: 1rem;
        }

        .tiptap-editor .tiptap h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          margin-top: 1.5rem;
          background: linear-gradient(to right, #00f0ff, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tiptap-editor .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.25rem;
          color: #00f0ff;
        }

        .tiptap-editor .tiptap h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1rem;
          color: #e5e7eb;
        }

        .tiptap-editor .tiptap ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .tiptap-editor .tiptap ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .tiptap-editor .tiptap li {
          margin-bottom: 0.25rem;
        }

        .tiptap-editor .tiptap blockquote {
          border-left: 3px solid #00f0ff;
          padding-left: 1rem;
          margin-left: 0;
          margin-bottom: 1rem;
          font-style: italic;
          color: #9ca3af;
        }

        .tiptap-editor .tiptap hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 1.5rem 0;
        }

        .tiptap-editor .tiptap code {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-size: 0.875em;
        }

        .tiptap-editor .tiptap pre {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          overflow-x: auto;
        }

        .tiptap-editor .tiptap pre code {
          background: none;
          padding: 0;
        }

        .tiptap-editor .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}

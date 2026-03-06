interface DigestPost {
  id: string
  title: string
  summary: string
  category: string | null
  urgency: string | null
  confidence: number | null
  created_at: string
  agent_name: string
}

const APP_URL = process.env.PUBLIC_URL || 'http://localhost:3000'

function urgencyBadge(urgency: string | null): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    developing: '#ca8a04',
    routine: '#6b7280',
  }
  if (!urgency) return ''
  const color = colors[urgency] || colors.routine
  return `<span style="background:${color};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${urgency}</span>`
}

export function digestEmailHtml(posts: DigestPost[], agentName: string, period: string): string {
  const postRows = posts
    .map(
      (p) => `
    <tr>
      <td style="padding:16px;border-bottom:1px solid #e5e7eb;">
        <div style="margin-bottom:4px;">
          ${urgencyBadge(p.urgency)}
          ${p.category ? `<span style="color:#6b7280;font-size:12px;margin-left:8px;">${p.category}</span>` : ''}
        </div>
        <a href="${APP_URL}/newsroom?post=${p.id}" style="color:#1d4ed8;font-weight:600;font-size:16px;text-decoration:none;">
          ${p.title}
        </a>
        <p style="color:#374151;font-size:14px;margin:8px 0 0;line-height:1.5;">
          ${p.summary.slice(0, 200)}${p.summary.length > 200 ? '...' : ''}
        </p>
        <div style="margin-top:8px;font-size:12px;color:#9ca3af;">
          ${new Date(p.created_at).toLocaleString()}
          ${p.confidence != null ? ` · Confidence: ${p.confidence}/5` : ''}
        </div>
      </td>
    </tr>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#111827;padding:24px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:20px;">ContentForge</h1>
        <p style="color:#9ca3af;margin:8px 0 0;font-size:14px;">${agentName} — ${period} Digest</p>
      </div>
      <div style="padding:0;">
        <table style="width:100%;border-collapse:collapse;">
          ${postRows || '<tr><td style="padding:24px;text-align:center;color:#6b7280;">No new posts in this period.</td></tr>'}
        </table>
      </div>
      <div style="padding:16px 24px;background:#f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
        <a href="${APP_URL}/settings" style="color:#6b7280;">Manage email preferences</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function breakingNewsEmailHtml(post: DigestPost): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#dc2626;padding:24px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:20px;">BREAKING NEWS</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${post.agent_name}</p>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">
          <a href="${APP_URL}/newsroom?post=${post.id}" style="color:#111827;text-decoration:none;">${post.title}</a>
        </h2>
        ${post.category ? `<div style="margin-bottom:12px;">${urgencyBadge(post.urgency)} <span style="color:#6b7280;font-size:12px;margin-left:8px;">${post.category}</span></div>` : ''}
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;">
          ${post.summary}
        </p>
        <div style="margin-top:16px;">
          <a href="${APP_URL}/newsroom?post=${post.id}" style="display:inline-block;background:#1d4ed8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
            Read Full Coverage
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
        <a href="${APP_URL}/settings" style="color:#6b7280;">Manage email preferences</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

export type { DigestPost }

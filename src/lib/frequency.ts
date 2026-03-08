export function formatFrequency(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  const days = Math.floor(minutes / 1440)
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  const weeks = Math.floor(minutes / 10080)
  if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''}`
  }

  const months = Math.floor(minutes / 43200)
  return `${months} month${months !== 1 ? 's' : ''}`
}

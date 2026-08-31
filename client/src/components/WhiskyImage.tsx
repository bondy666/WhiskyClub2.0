import { useState } from 'react'

// Shows a whisky's photo, falling back to a tumbler emoji when there's
// no image or it fails to load.
export function WhiskyImage({
  url,
  className = '',
  emojiSize = 'text-2xl',
  alt = '',
}: {
  url?: string | null
  className?: string
  emojiSize?: string
  alt?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImg = url && !failed

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-ink-700 to-ink-900 ring-1 ring-white/5 ${className}`}
    >
      {showImg ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={emojiSize}>🥃</span>
      )}
    </div>
  )
}

import React, {useRef, useState} from 'react'

type MediaPreview = {
  id: string
  file: File
  url: string
  kind: 'image' | 'video'
}

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function Requester() {
  const [caption, setCaption] = useState<string>('')
  const [media, setMedia] = useState<MediaPreview[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function onSelectFiles(files: FileList | null): void {
    if (!files || files.length === 0) return
    const accepted: MediaPreview[] = []
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) continue
      const id = generateId('media')
      const url = URL.createObjectURL(file)
      accepted.push({id, file, url, kind: isImage ? 'image' : 'video'})
    }
    setMedia(prev => {
      const next = [...prev, ...accepted]
      if (next.length > 0 && selectedIndex >= next.length) {
        setSelectedIndex(0)
      }
      return next
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeMedia(id: string): void {
    setMedia(prev => {
      const index = prev.findIndex(m => m.id === id)
      const toRevoke = prev[index]
      if (toRevoke) URL.revokeObjectURL(toRevoke.url)
      const next = prev.filter(m => m.id !== id)
      if (next.length === 0) setSelectedIndex(0)
      else if (index <= selectedIndex) setSelectedIndex(Math.max(0, selectedIndex - 1))
      return next
    })
  }

  function resetForm(): void {
    setCaption('')
    media.forEach(m => URL.revokeObjectURL(m.url))
    setMedia([])
    setSelectedIndex(0)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = {
        description: caption.trim(),
        mediaCount: media.length,
      }
      // Replace with real submission logic
      // eslint-disable-next-line no-console
      console.log('Submitting post payload:', payload)
      await new Promise(res => setTimeout(res, 600))
      resetForm()
      // eslint-disable-next-line no-alert
      alert('Post published!')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      // eslint-disable-next-line no-alert
      alert('Failed to publish')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = media.length > 0
  const selected = media[selectedIndex] ?? null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Create a Post</h2>
        <p className="text-sm text-gray-600">Select photos or videos and add a caption.</p>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-medium">Media</div>
        <input
          ref={fileInputRef}
          id="mediaInput"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={e => onSelectFiles(e.target.files)}
          className="hidden"
        />

        {media.length > 0 ? (
          <div className="space-y-3">
            <div className="relative w-full bg-black/5 rounded-md border border-gray-200 overflow-hidden">
              <div className="w-full h-96 bg-black flex items-center justify-center">
                {selected?.kind === 'image' ? (
                  <img src={selected.url} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <video src={selected?.url} className="h-full w-auto object-contain" controls />
                )}
              </div>
              <div className="absolute top-2 right-2 flex gap-2">
                <label
                  htmlFor="mediaInput"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50 cursor-pointer"
                >
                  Add more
                </label>
                {selected && (
                  <button
                    type="button"
                    onClick={() => removeMedia(selected.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {media.map((m, idx) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={
                    'relative h-20 w-14 flex-shrink-0 rounded-md border ' +
                    (idx === selectedIndex ? 'border-blue-600' : 'border-gray-200')
                  }
                >
                  {m.kind === 'image' ? (
                    <img src={m.url} alt="thumb" className="h-full w-full object-cover rounded-md" />
                  ) : (
                    <video src={m.url} className="h-full w-full object-cover rounded-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <label
            htmlFor="mediaInput"
            className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Tap to upload photos or videos
          </label>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="caption" className="text-sm font-medium">
          Caption
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Write a caption..."
          rows={4}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="text-right text-xs text-gray-500">{caption.length}/2200</div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex justify-center items-center rounded-md px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={
            'inline-flex justify-center items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm ' +
            (canSubmit && !submitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed')
          }
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}

export default Requester



import React, {useRef, useState} from 'react'
import { requestsService } from '../services/request.service'
import { requestAssetsService } from '../services/request_assets.service'

type MediaPreview = {
  id: string
  file: File
  url: string
  kind: 'image' | 'video'
}

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function PostComposer() {
  const [caption, setCaption] = useState<string>('')
  const [media, setMedia] = useState<MediaPreview[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function ensureRequestId(): Promise<string> {
    // create a backend request from the caption if none exists yet in this compose session
    // we use a simple sentinel by storing it on the component instance (via state)
    if ((window as any).__compose_request_id__) return (window as any).__compose_request_id__ as string
    const created = await requestsService.create({
      title: 'Media Upload',
      description: caption.trim() || 'Uploading media...',
      budget: 0,
    })
    ;(window as any).__compose_request_id__ = created.id
    return created.id
  }

  async function onSelectFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return
    const accepted: MediaPreview[] = []
    const requestId = await ensureRequestId()
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) continue
      const id = generateId('media')
      const url = URL.createObjectURL(file)
      accepted.push({id, file, url, kind: isImage ? 'image' : 'video'})
      // kick off upload; no await to keep UI snappy, but we can await to ensure request
      try {
        await requestAssetsService.upload(requestId, file)
      } catch (e) {
        console.error('Upload failed', e)
      }
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
    // eslint-disable-next-line no-console
    console.log('handleSubmit called - Form submitted!')
    e.preventDefault()
    if (submitting) return
    await submitPost()
  }

  async function submitPost(): Promise<void> {
    if (submitting) return
    setSubmitting(true)
    try {
      // Get the request ID that was created when images were uploaded
      const requestId = (window as any).__compose_request_id__
      // eslint-disable-next-line no-console
      console.log('Current request ID:', requestId)
      // eslint-disable-next-line no-console
      console.log('Media count:', media.length)
      // eslint-disable-next-line no-console
      console.log('Can submit:', canSubmit)
      
      if (!requestId) {
        throw new Error('No request ID found. Please upload at least one image first.')
      }

      // eslint-disable-next-line no-console
      console.log('Making update request to backend...')
      
      // Update the request with the final caption
      await requestsService.update(requestId, {
        query: caption.trim() || 'Posted media'
      })

      // eslint-disable-next-line no-console
      console.log('Post saved successfully! Request ID:', requestId, 'Caption:', caption.trim())
      
      resetForm()
      // Clear the request ID for next post
      delete (window as any).__compose_request_id__
      
      // eslint-disable-next-line no-alert
      alert('Post published!')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to publish post:', err)
      // eslint-disable-next-line no-alert
      alert('Failed to publish: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = media.length > 0
  const selected = media[selectedIndex] ?? null

  // Debug logging
  // eslint-disable-next-line no-console
  console.log('PostComposer render - media.length:', media.length, 'canSubmit:', canSubmit)

  return (
    <div className="min-h-full pt-15 p-6 pb-8 bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Create a Post</h2>
          <p className="text-sm text-gray-600">Share photos or videos with a caption to get personalized shopping recommendations</p>
        </div>

      <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Media</h3>
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
            <div className="space-y-4">
              <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-lg">
                <div className="w-full h-64 bg-black flex items-center justify-center">
                  {selected?.kind === 'image' ? (
                    <img src={selected.url} alt="Preview" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <video src={selected?.url} className="h-full w-auto object-contain" controls />
                  )}
                </div>
                <div className="absolute top-4 right-4 flex gap-3">
                  <label
                    htmlFor="mediaInput"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12S21.1 14 20 14H14V20C14 21.1 13.1 22 12 22S10 21.1 10 20V14H4C2.9 14 2 13.1 2 12S2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z"/>
                    </svg>
                    Add more
                  </label>
                  {selected && (
                    <button
                      type="button"
                      onClick={() => removeMedia(selected.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
                      </svg>
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {media.map((m, idx) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative h-20 w-20 flex-shrink-0 rounded-xl border-2 transition-all ${
                      idx === selectedIndex 
                        ? 'border-[#5A31F4] ring-2 ring-[#5A31F4]/20 scale-105' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {m.kind === 'image' ? (
                      <img src={m.url} alt="thumb" className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <video src={m.url} className="h-full w-full object-cover rounded-xl" />
                    )}
                    {idx === selectedIndex && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#5A31F4] rounded-full flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                          <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <label
              htmlFor="mediaInput"
              className="flex h-45 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-all group"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto bg-[#5A31F4]/10 rounded-full flex items-center justify-center group-hover:bg-[#5A31F4]/20 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#5A31F4]">
                    <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Upload photos or videos</p>
                  <p className="text-xs text-gray-500 mt-1">Tap to select from your device</p>
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Add Caption</h3>
        <div className="space-y-3">
          <textarea
            id="caption"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Write a caption to describe what you're looking for or what style you want..."
            rows={3}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#5A31F4] focus:ring-2 focus:ring-[#5A31F4]/20 transition-all resize-none"
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Help us understand your style preferences</span>
            <span className={`${caption.length > 2000 ? 'text-red-500' : 'text-gray-500'}`}>
              {caption.length}/2200
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex justify-center items-center rounded-full px-6 py-3 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
          </svg>
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          onClick={async (e) => {
            // eslint-disable-next-line no-console
            console.log('POST BUTTON CLICKED!!! canSubmit:', canSubmit, 'submitting:', submitting, 'media.length:', media.length)
            if (!canSubmit) {
              e.preventDefault()
              // eslint-disable-next-line no-alert
              alert('Please upload at least one image first!')
              return
            }
            e.preventDefault()
            await submitPost()
          }}
          className={`inline-flex justify-center items-center rounded-full px-8 py-3 text-sm font-semibold shadow-lg transition-all ${
            canSubmit && !submitting
              ? 'bg-gradient-to-r from-[#5A31F4] to-[#6E3AFF] text-white hover:from-[#4E28D6] hover:to-[#5E2FD1] hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Publishing…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Post
              </>
            )}
          </div>
        </button>
      </div>
      </form>
    </div>
  )
}

export default PostComposer



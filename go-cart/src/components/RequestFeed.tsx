import { useEffect, useMemo, useRef, useState } from "react";
import {
  useProductSearch,
  useRecommendedProducts,
  usePopularProducts,
  useRecentProducts,
  ProductCard,
} from "@shopify/shop-minis-react";
import { requestsService } from "../services/request.service";
import { curationService } from "../services/curation.service";
import { generateProductSearchQuery } from "../services/fal.service";
import type {
  CartItem,
  ShoppingRequest,
  CartItemProductSnapshot,
  SubmittedCart,
} from "../types";
import { CartItemEditor } from "./cart/CartItemEditor";
import { CartItemList } from "./cart/CartItemList";
import { cartsService } from "../services/cart.service";
import { CartSubmitForm } from "./cart/CartSubmitForm";

export function RequestFeed() {
  const [requests, setRequests] = useState<ShoppingRequest[] | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<ShoppingRequest | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [showCurated, setShowCurated] = useState(false);
  const scrollFeedRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    requestsService
      .list()
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    setItems([]);
  }, [selectedRequest?.id]);

  if (requests === null) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-white">Loading requests...</p>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-white/85 px-6">
          <div className="text-3xl mb-2">🕰️</div>
          <div className="text-lg font-semibold">Nothing to see yet</div>
          <div className="text-sm text-white/70 mt-1">
            No posts are live right now — come back later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        className="h-full overflow-y-auto snap-y snap-mandatory"
        ref={scrollFeedRef}
        onScroll={() => {
          const el = scrollFeedRef.current;
          if (!el) return;
          const containerHeight = el.clientHeight || 1;
          const index = Math.round(el.scrollTop / containerHeight);
          if (index !== activeIndex) setActiveIndex(index);
        }}
      >
        {requests.map((req, i) => (
          <div key={req.id} className="snap-start h-full">
            <ReelCard
              request={req}
              isActive={i === activeIndex}
              onShop={() => {
                setSelectedRequest(req);
                setShowCurated(true);
              }}
            />
          </div>
        ))}
      </div>

      {selectedRequest && showCurated ? (
        <CurationsOverlay
          request={selectedRequest}
          items={items}
          onAddItem={(it) => setItems((prev) => [...prev, it])}
          onRemoveItem={(idx) =>
            setItems((prev) => prev.filter((_, i) => i !== idx))
          }
          onClose={() => {
            setShowCurated(false);
            setSelectedRequest(null);
          }}
        />
      ) : null}

      {selectedRequest && !showCurated ? (
        <BuilderOverlay
          request={selectedRequest}
          items={items}
          onAddItem={(it) => setItems((prev) => [...prev, it])}
          onRemoveItem={(idx) =>
            setItems((prev) => prev.filter((_, i) => i !== idx))
          }
          onClose={() => setSelectedRequest(null)}
          onSubmitted={() => setSelectedRequest(null)}
        />
      ) : null}
    </div>
  );
}

export default RequestFeed;

function ReelCard({
  request,
  isActive,
  onShop,
}: {
  request: ShoppingRequest;
  isActive: boolean;
  onShop: () => void;
}) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const media = request.media;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // HUD and gesture state
  const [showHud, setShowHud] = useState(false);
  const hudHideTimeoutRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const holdTimeoutRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const wasPlayingBeforeHoldRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / containerWidth);
    if (index !== currentImageIndex) setCurrentImageIndex(index);
  }

  function scrollToImage(index: number) {
    const el = scrollContainerRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
    el.scrollTo({ left: containerWidth * index, behavior: "smooth" });
  }

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setIsMuted(next);
  }

  function onPointerDown() {
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    isHoldingRef.current = false;
    wasPlayingBeforeHoldRef.current = false;
    holdTimeoutRef.current = window.setTimeout(() => {
      const el = videoRef.current;
      if (!el) return;
      isHoldingRef.current = true;
      suppressNextClickRef.current = true;
      if (!el.paused) {
        wasPlayingBeforeHoldRef.current = true;
        el.pause();
        showHudTemporarily();
      }
    }, 280);
  }

  function endHold(e?: { preventDefault?: () => void; stopPropagation?: () => void }) {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    const el = videoRef.current;
    if (!el) return;
    if (isHoldingRef.current) {
      suppressClickUntilRef.current = Date.now() + 500;
      if (e?.preventDefault) e.preventDefault();
      if (e?.stopPropagation) e.stopPropagation();
      if (wasPlayingBeforeHoldRef.current) {
        el.play().catch(() => {});
      }
      isHoldingRef.current = false;
      wasPlayingBeforeHoldRef.current = false;
    }
  }

  function showHudTemporarily() {
    setShowHud(true);
    if (hudHideTimeoutRef.current) {
      clearTimeout(hudHideTimeoutRef.current);
    }
    hudHideTimeoutRef.current = window.setTimeout(() => {
      setShowHud(false);
      hudHideTimeoutRef.current = null;
    }, 1200);
  }

  useEffect(() => {
    return () => {
      if (hudHideTimeoutRef.current) clearTimeout(hudHideTimeoutRef.current);
    };
  }, []);

  // Pause and reset video when card is not active; autoplay when it becomes active
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!isActive) {
      try {
        el.pause();
      } catch {}
      el.currentTime = 0;
    } else {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  }, [isActive]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {isDescriptionExpanded ? (
        <button
          aria-label="Collapse description"
          className="absolute inset-0 z-20 bg-transparent cursor-default"
          onClick={() => setIsDescriptionExpanded(false)}
        />
      ) : null}
      {media ? (
        media.type === "video" && media.urls?.[0] ? (
          <>
            <video
              ref={videoRef}
              src={media.urls[0]}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              controls={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                touchAction: "manipulation",
              }}
              onPointerDown={onPointerDown}
              onPointerUp={(e) => endHold(e)}
              onPointerCancel={(e) => endHold(e)}
              onPointerLeave={(e) => endHold(e)}
              onMouseDown={onPointerDown}
              onMouseUp={(e) => endHold(e)}
              onTouchStart={onPointerDown}
              onTouchEnd={(e) => endHold(e)}
              onTouchCancel={(e) => endHold(e)}
              onClick={() => {
                const now = Date.now();
                if (
                  suppressNextClickRef.current ||
                  now < suppressClickUntilRef.current
                ) {
                  suppressNextClickRef.current = false;
                  return;
                }
                toggleMute();
                showHudTemporarily();
              }}
              onPlay={() => {
                showHudTemporarily();
              }}
              onPause={() => {
                showHudTemporarily();
              }}
            />
            <button
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              className={`absolute bottom-28 right-4 z-10 h-10 w-10 rounded-full flex items-center justify-center text-white bg-black/50 hover:bg-black/60 border border-white/20 transition-opacity duration-300 ${
                showHud ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
            >
              {isMuted ? (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4h4l5 5V5L7 10H3z"></path>
                  <path d="M16 8l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 10v4h4l5 5V5L7 10H3z"></path>
                  <path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M18.5 6.5a8 8 0 010 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </>
        ) : media.type === "image" && media.urls && media.urls.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="absolute inset-0 w-full h-full overflow-x-auto flex snap-x snap-mandatory"
            onScroll={handleScroll}
          >
            {media.urls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={u}
                alt={`image ${i + 1}`}
                className="h-full w-full object-cover flex-shrink-0 snap-start"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center p-6">
            <p className="text-gray-700 text-center text-sm whitespace-pre-wrap max-w-prose">
              {request.description}
            </p>
          </div>
        )
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          No media
        </div>
      )}



      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-20 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none">
        {media?.type === "image" && media.urls && media.urls.length > 1 ? (
          <div
            className="mb-2 flex items-center justify-center gap-1.5 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {media.urls.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  i === currentImageIndex ? "bg-white" : "bg-white/40"
                }`}
                onClick={() => scrollToImage(i)}
              />
            ))}
          </div>
        ) : null}
        <h3 className="text-white font-semibold text-base">{request.title}</h3>
        <div className="relative mt-1">
          <p
            className={`text-white/95 text-sm px-1 py-0.5 ${
              isDescriptionExpanded
                ? "line-clamp-none max-h-32 overflow-y-auto pr-28"
                : "line-clamp-1 pr-24"
            } pointer-events-auto`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDescriptionExpanded((prev) => !prev);
            }}
          >
            {request.description}
          </p>
          <button
            className="absolute right-0 top-0 text-xs font-medium text-white/90 underline decoration-white/60 hover:text-white pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setIsDescriptionExpanded((prev) => !prev);
            }}
          >
            {isDescriptionExpanded ? "Show less" : "Show more"}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-white/90 text-xs">
            Budget: <span className="text-white font-bold text-sm bg-green-500 px-2 py-0.5 rounded-full">${request.budget}</span>
            {request.occasion ? ` · ${request.occasion}` : ""}
          </div>
          <button
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5A31F4] hover:bg-[#4E28D6] shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 pointer-events-auto"
            onClick={() => {
              if (isDescriptionExpanded) {
                setIsDescriptionExpanded(false);
                setTimeout(() => onShop(), 0);
              } else {
                onShop();
              }
            }}
          >
            Shop for them
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (q: string) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search products"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
function BuilderOverlay({
  request,
  items,
  onAddItem,
  onRemoveItem,
  onClose,
  onSubmitted,
}: {
  request: ShoppingRequest;
  items: CartItem[];
  onAddItem: (it: CartItem) => void;
  onRemoveItem: (idx: number) => void;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const canSubmit = useMemo(() => items.length > 0, [items]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold">
              Curate for “{request.title}”
            </h4>
            <p className="text-xs text-gray-500">
              Build a moodboard and submit
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <CartItemEditor onAdd={onAddItem} />
          <CartItemList items={items} onRemove={onRemoveItem} />
          <CartSubmitForm
            requestId={request.id}
            items={items}
            onSubmitted={() => {
              onSubmitted();
            }}
          />
          {!canSubmit ? (
            <p className="text-xs text-gray-500 text-center">
              Add at least one item to submit.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// CuratedOverlay removed in favor of CartSpotlight

function CurationsOverlay({
  request,
  items,
  onAddItem,
  onRemoveItem,
  onClose,
}: {
  request: ShoppingRequest;
  items: CartItem[];
  onAddItem: (it: CartItem) => void;
  onRemoveItem: (idx: number) => void;
  onClose: () => void;
}) {
  // Generate AI-driven tags for curation
  const [tagsResult, setTagsResult] = useState<{ summary: string; tags: string[] } | null>(null);
  const [tagsLoading, setTagsLoading] = useState<boolean>(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setTagsLoading(true);
    setTagsError(null);
    setTagsResult(null);
    curationService
      .generateTagsForRequest(request)
      .then((res) => {
        if (!cancelled) setTagsResult(res);
      })
      .catch((err) => {
        if (!cancelled) setTagsError(err?.message || "Failed to generate tags");
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  // AI query + Minis product search (default feed when not actively typing)
  const [aiQuery, setAiQuery] = useState('');
  useEffect(() => {
    let cancelled = false;
    generateProductSearchQuery(request).then((q) => { if (!cancelled) setAiQuery(q); });
    return () => { cancelled = true };
  }, [request]);
  const {
    products: aiProducts,
    loading: aiLoading,
    error: aiError,
    hasNextPage: aiHasNext,
    fetchMore: aiFetchMore,
  } = useProductSearch({
    query: aiQuery,
    handle: request.id,
    skip: !aiQuery,
  } as any);

  // Recommended and Popular as secondary fallbacks
  const { products: recProducts, hasNextPage: recHasNext, fetchMore: recFetchMore } = useRecommendedProducts({ handle: request.id } as any);
  const { products: popProducts, hasNextPage: popHasNext, fetchMore: popFetchMore } = usePopularProducts({ handle: request.id } as any);
  const { products: recentProducts } = useRecentProducts({ handle: request.id } as any);

  // Search state and results (lifted for pagination control)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => window.clearTimeout(id);
  }, [searchQuery]);
  const {
    products: searchProducts,
    loading: searchLoading,
    error: searchError,
    isTyping: searchIsTyping,
    hasNextPage: searchHasNext,
    fetchMore: searchFetchMore,
  } = useProductSearch({
    query: debouncedQuery,
    skip: debouncedQuery.trim().length < 2,
    handle: 'feed',
  } as any);

  // Build mixed feed of products and stores
  const { activeProducts, productSnapshots, basisLabel, basisDetail, activeHasNext, activeFetchMore, activeLoading, activeError } = useMemo(() => {
    // Select active source and label
    let source: any[] | null = null
    let label = ''
    let detail = ''
    let hasNext = false
    let fetchMore: (() => Promise<void>) | undefined
    let loading = false
    let error: string | null = null

    const searching = debouncedQuery.trim().length >= 2
    if (searching) {
      source = searchProducts ?? []
      label = debouncedQuery ? `search: "${debouncedQuery}"` : 'search'
      hasNext = !!searchHasNext
      fetchMore = searchFetchMore as any
      loading = searchLoading
      error = (searchError as any)?.message || (searchError as any) || null
    } else if (aiProducts && aiProducts.length > 0) {
      source = aiProducts
      label = 'AI search'
      detail = aiQuery ? `query: ${aiQuery}` : ''
      hasNext = !!aiHasNext
      fetchMore = aiFetchMore as any
      loading = !!aiLoading
      error = (aiError as any)?.message || (aiError as any) || null
    } else if (recProducts && recProducts.length > 0) {
      source = recProducts
      label = 'recommended for you'
      hasNext = !!recHasNext
      fetchMore = recFetchMore as any
      loading = false
      error = null
    } else if (popProducts && popProducts.length > 0) {
      source = popProducts
      label = 'popular now'
      hasNext = !!popHasNext
      fetchMore = popFetchMore as any
      loading = false
      error = null
    } else {
      source = recentProducts ?? []
      label = 'recently viewed'
      hasNext = false
      fetchMore = undefined
      loading = false
      error = null
    }

    const mapped: CartItemProductSnapshot[] = (source ?? []).map((p: any) => ({
      id: String(p?.id ?? ''),
      title: String(p?.title ?? ''),
      imageUrl: p?.featuredImage?.url ?? undefined,
      priceAmount: p?.price?.amount != null ? Number(p.price.amount) : undefined,
      priceCurrencyCode: p?.price?.currencyCode ?? 'USD',
    }))
    const seen = new Set<string>()
    const snapshots = mapped.filter(p => {
      if (!p.id || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    const defaultDetail = (tagsResult?.tags && tagsResult.tags.length > 0) ? `tags: ${tagsResult.tags.slice(0, 10).join(', ')}` : ''
    return {
      activeProducts: source ?? [],
      productSnapshots: snapshots,
      basisLabel: label,
      basisDetail: detail || defaultDetail,
      activeHasNext: hasNext,
      activeFetchMore: fetchMore,
      activeLoading: loading,
      activeError: error,
    }
  }, [
    debouncedQuery,
    searchProducts,
    searchHasNext,
    searchFetchMore,
    searchLoading,
    searchIsTyping,
    searchError,
    aiProducts,
    aiHasNext,
    aiFetchMore,
    aiLoading,
    aiError,
    recProducts,
    recHasNext,
    recFetchMore,
    popProducts,
    popHasNext,
    popFetchMore,
    recentProducts,
    request.id,
    tagsResult?.tags,
  ])

  const loading = activeLoading || tagsLoading;
  const error = activeError || tagsError;

  // Auto infinite scroll using IntersectionObserver
  const overlayScrollRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = overlayScrollRef.current || null
    const sentinel = loadMoreRef.current
    if (!sentinel || !activeHasNext || !activeFetchMore) return
    let pending = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting && !pending) {
          pending = true
          Promise.resolve(activeFetchMore())
            .catch(() => {})
            .finally(() => {
              pending = false
            })
        }
      },
      { root, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeHasNext, activeFetchMore, productSnapshots.length])

  // UI state: tab between products and cart
  const [activeTab, setActiveTab] = useState<'browse' | 'cart'>('browse')
  const sheetSizeClass = 'h-[90vh] max-h-[90vh]'

  // Fetch "my responses" (previous carts) for this request
  const [myResponses, setMyResponses] = useState<SubmittedCart[] | null>(null)
  useEffect(() => {
    let cancelled = false
    setMyResponses(null)
    cartsService.listMineByRequest(request.id)
      .then((res) => { if (!cancelled) setMyResponses(res) })
      .catch(() => { if (!cancelled) setMyResponses([]) })
    return () => { cancelled = true }
  }, [request.id])

  // Removed SimpleProductTile; we now use the SDK's ProductCard

  // Stores UI removed

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={overlayScrollRef} className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 overflow-y-auto ${sheetSizeClass}`}>
        <div className="p-4 border-b sticky top-0 bg-white z-30 flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold">
              Shop for “{request.title}”
            </h4>
            <p className="text-xs text-gray-500">
              Budget ${request.budget}
              {request.occasion ? ` · ${request.occasion}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Stores removed */}

            {/* Tabs (sticky with header) */}
            <section className="sticky top-12 z-20 bg-white pb-2 border-b">
              <div className="flex items-center gap-2 px-0.5">
                <button
                  className={`px-3 py-1.5 rounded-full text-xs border ${activeTab === 'browse' ? 'bg-[#5A31F4] text-white border-[#5A31F4]' : 'bg-white text-gray-700 border-gray-300'}`}
                  onClick={() => setActiveTab('browse')}
                >Browse</button>
                <button
                  className={`px-3 py-1.5 rounded-full text-xs border ${activeTab === 'cart' ? 'bg-[#5A31F4] text-white border-[#5A31F4]' : 'bg-white text-gray-700 border-gray-300'}`}
                  onClick={() => setActiveTab('cart')}
                >Your cart ({items.length})</button>
              </div>
            </section>

            {/* Content */}
            <section>
              {activeTab === 'browse' ? (
                <>
                  {/* Search bar (browse only) */}
                  <div className="mb-3">
                    <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
                  </div>
              <div className="mb-2 px-0.5">
                    <h5 className="text-sm font-semibold text-gray-900">Products <span className="text-xs font-normal text-gray-500">({basisLabel})</span></h5>
                    {basisDetail ? (
                      <div className="text-xs text-gray-500 mt-0.5 break-words">{basisDetail}</div>
                    ) : null}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeProducts.map((prod: any, idx: number) => {
                      const snap: CartItemProductSnapshot = {
                        id: String(prod?.id ?? ''),
                        title: String(prod?.title ?? ''),
                        imageUrl: prod?.featuredImage?.url ?? undefined,
                        priceAmount: prod?.price?.amount != null ? Number(prod.price.amount) : undefined,
                        priceCurrencyCode: prod?.price?.currencyCode ?? 'USD',
                      }
                      const inCartIdx = items.findIndex((it) => it.product.id === snap.id)
                  return (
                    <div key={`p-${idx}`} className="relative">
                          <ProductCard product={prod} />
                          <div className="mt-1 flex justify-end">
                            {inCartIdx >= 0 ? (
                              <button className="text-[11px] px-2 py-1 rounded-md border border-gray-300 bg-white/95 shadow-sm hover:bg-white" onClick={() => onRemoveItem(inCartIdx)}>
                                Remove
                              </button>
                            ) : (
                              <button className="text-[11px] px-2 py-1 rounded-md bg-[#5A31F4] text-white shadow-sm hover:bg-[#4E28D6]" onClick={() => onAddItem({ product: snap, quantity: 1 })}>
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Sentinel for auto load more */}
                  <div ref={loadMoreRef} className="h-8" />
                </>
              ) : (
                <>
                  <div className="mb-2 px-0.5">
                    <h5 className="text-sm font-semibold text-gray-900">Your curated cart</h5>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-sm text-gray-500 px-0.5">No items yet. Add products from Browse.</div>
                  ) : null}
                  {/* My responses preview */}
                  {myResponses && myResponses.length > 0 ? (
                    <div className="mb-3 px-0.5">
                      <div className="text-xs text-gray-600">Your previous responses</div>
                      <div className="mt-1 flex gap-2 overflow-x-auto -mx-0.5 px-0.5">
                        {myResponses.map((c) => (
                          <div key={c.id} className="shrink-0 px-2 py-1 rounded-full border text-xs bg-white">
                            {new Date(c.submittedAt).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 pb-20">
                    {items.map((it, idx) => (
                      <div key={`ci-${idx}`} className="flex items-center gap-3 border rounded-lg p-2">
                        <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                          {it.product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.product.imageUrl} alt={it.product.title || 'Product'} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{it.product.title || 'Product'}</div>
                          <div className="text-xs text-gray-600">{it.product.priceCurrencyCode || 'USD'} {it.product.priceAmount ?? '-'}</div>
                        </div>
                        <button className="text-[11px] px-2 py-1 rounded-md border border-gray-300 bg-white" onClick={() => onRemoveItem(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                  {/* Sticky submit at bottom */}
                  <div className="sticky bottom-0 left-0 right-0 bg-white border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="px-0.5 py-2">
                      <button
                        disabled={items.length === 0}
                        onClick={async () => {
                          if (items.length === 0) return
                          await cartsService.submit({ requestId: request.id, items })
                          onClose()
                        }}
                        className={`w-full h-10 rounded-full text-sm font-medium ${items.length > 0 ? 'bg-[#5A31F4] text-white' : 'bg-gray-200 text-gray-500'}`}
                      >
                        Submit cart
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

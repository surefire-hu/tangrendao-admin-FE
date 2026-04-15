import { useEffect, useRef, useState, useCallback } from 'react'
import { Select, Spin } from 'antd'
import type { AdProduct } from '../types'

interface ProductPageResult {
  count: number
  has_next: boolean
  page: number
  results: AdProduct[]
}

interface Props {
  productType: string
  country: string
  onSelect: (product: AdProduct) => void
  searchFn: (params: {
    type: string
    q?: string
    country?: string
    page?: number
    page_size?: number
  }) => Promise<{ data: ProductPageResult }>
  selectedId?: string
}

export function ProductSelect({ productType, country, onSelect, searchFn, selectedId }: Props) {
  const [options, setOptions]       = useState<AdProduct[]>([])
  const [loading, setLoading]       = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const searchTimer                 = useRef<ReturnType<typeof setTimeout>>()
  const searchQRef                  = useRef('')
  const pageRef                     = useRef(1)
  const hasNextRef                  = useRef(false)
  const busyRef                     = useRef(false)

  const fetchPage = useCallback(async (q: string, pg: number, reset: boolean) => {
    if (busyRef.current) return
    busyRef.current = true
    if (pg === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await searchFn({ type: productType, q: q || undefined, country, page: pg, page_size: 20 })
      const { results, has_next } = res.data
      setOptions(prev => reset ? results : [...prev, ...results])
      hasNextRef.current = has_next
      pageRef.current    = pg
    } catch {
      /* silent */
    } finally {
      busyRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [productType, country, searchFn])

  // Reload when productType or country changes
  useEffect(() => {
    searchQRef.current = ''
    setOptions([])
    fetchPage('', 1, true)
  }, [productType, country, fetchPage])

  function handleSearch(val: string) {
    searchQRef.current = val
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      fetchPage(val, 1, true)
    }, 350)
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.target as HTMLDivElement
    const nearBottom = el.scrollTop + el.offsetHeight >= el.scrollHeight - 60
    if (nearBottom && hasNextRef.current && !busyRef.current) {
      fetchPage(searchQRef.current, pageRef.current + 1, false)
    }
  }

  return (
    <Select
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      onPopupScroll={handleScroll}
      loading={loading}
      placeholder="搜索产品名称或城市…"
      style={{ width: '100%' }}
      value={selectedId || undefined}
      onChange={(val) => {
        const found = options.find(p => p.id === val)
        if (found) onSelect(found)
      }}
      notFoundContent={loading ? <Spin size="small" /> : '暂无数据'}
      dropdownRender={(menu) => (
        <>
          {menu}
          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Spin size="small" />
            </div>
          )}
        </>
      )}
      options={options.map(p => ({
        value: p.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.cover_image && (
              <img
                src={p.cover_image}
                alt=""
                style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
              />
            )}
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.title}
            </span>
            {p.city && (
              <span style={{ color: '#999', fontSize: 11, flexShrink: 0 }}>{p.city}</span>
            )}
          </div>
        ),
      }))}
    />
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { ProductsAPI } from '../api'

export default function LowStock() {
  const [products, setProducts] = useState([])
  const [threshold, setThreshold] = useState(5)
  const [query, setQuery] = useState('')

  const load = async () => {
    const data = await ProductsAPI.list()
    setProducts(data)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const t = Number(threshold || 0)
    return products
      .filter(p => Number(p.stock) <= t)
      .filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()) || String(p.barcode || '').includes(query))
      .sort((a, b) => Number(a.stock) - Number(b.stock))
  }, [products, threshold, query])

  return (
    <div className="low-stock">
      <div className="card">
        <h2>Low Stock</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <label>Threshold</label>
          <input className="input" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} style={{ width: 100 }} />
          <div className="spacer" />
          <input className="input" placeholder="Search name or barcode" value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
          <button className="btn" onClick={load}>Refresh</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Barcode</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.barcode || '-'}</td>
                <td>₹{Number(p.price).toFixed(2)}</td>
                <td style={{ color: '#ffb4a2', fontWeight: 600 }}>{p.stock}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>No products at or below threshold.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}



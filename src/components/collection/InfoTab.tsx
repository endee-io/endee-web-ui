'use client'

import type { CollectionSummary } from '../../api/client'
import { typeLabel, typeBadge, sparseModel } from '../../lib/collectionFields'

const formatDate = (timestamp: number | string | undefined) =>
  new Date(Number(timestamp ?? 0) * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function InfoTab({ collection }: { collection: CollectionSummary }) {
  const fields = collection.fields ?? []

  return (
    <div>
      {/* Collection summary */}
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Collection Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Objects</div>
            <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {(collection.total_elements ?? 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Fields</div>
            <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">{fields.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Layout Version</div>
            <div className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {collection.layout_version ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Created</div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-2">
              {formatDate(collection.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Fields table */}
      {fields.length > 0 && (
        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Fields</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Dimension</th>
                <th className="pb-2 pr-4 font-medium">Space</th>
                <th className="pb-2 pr-4 font-medium">Precision</th>
                <th className="pb-2 pr-4 font-medium">Extra</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const p = field.params ?? {}
                const extra =
                  field.type === 'sparse'
                    ? `model: ${sparseModel(field) ?? '—'}`
                    : [
                        p.pooling ? `pooling: ${p.pooling}` : null,
                        p.M != null ? `M: ${p.M}` : null,
                        p.ef_con != null ? `ef_con: ${p.ef_con}` : null,
                      ].filter(Boolean).join(' · ') || '—'
                return (
                  <tr key={field.name} className="border-b border-slate-100 dark:border-slate-600/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{field.name}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge(field.type)}`}>
                        {typeLabel(field.type)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {field.type === 'sparse' ? '—' : (p.dimension ?? '—')}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                      {field.type === 'sparse' ? '—' : (p.space_type ?? '—')}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300 capitalize">
                      {field.type === 'sparse' ? '—' : (String(p.precision ?? '—'))}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{extra}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

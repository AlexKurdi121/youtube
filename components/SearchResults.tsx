'use client'

interface SearchResult {
  id: number
  title: string
  url: string
  description: string
  icon: string
}

interface SearchResultsProps {
  results: SearchResult[]
  loading: boolean
}

export default function SearchResults({ results, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No results found</h3>
        <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transform hover:-translate-y-1"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0 mt-1">{result.icon}</div>
            <div className="flex-1 min-w-0">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {result.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
                  {result.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <span className="truncate">{result.url}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Link</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      ))}
      
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        Showing {results.length} result{results.length > 1 ? 's' : ''}
      </div>
    </div>
  )
}
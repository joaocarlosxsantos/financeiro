'use client'

export function Loader({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-8">
      <div className="flex items-center gap-2 sm:gap-3 text-gray-600">
        <span className="inline-block h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
        <span className="text-xs sm:text-sm">{text}</span>
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}



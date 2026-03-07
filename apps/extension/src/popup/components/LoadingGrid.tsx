import React from 'react'

export const LoadingGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-full h-32 bg-[#161b22] border border-[#30363d] rounded-md animate-pulse"
        />
      ))}
    </div>
  )
}

import React from 'react'

type ErrorMessageProps = {
  message: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="bg-[#161b22] border border-[#da3633] rounded-md p-4 mb-4">
      <p className="text-sm text-[#f85149]">{message}</p>
    </div>
  )
}

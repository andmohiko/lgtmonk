import React from 'react'
import { Header } from './components/Header'
import { ImageGrid } from './components/ImageGrid'
import { LoadingGrid } from './components/LoadingGrid'
import { ErrorMessage } from './components/ErrorMessage'
import { Footer } from './components/Footer'
import { useRandomImages } from './hooks/useRandomImages'
import './styles/popup.css'

export const Popup: React.FC = () => {
  const { images, isLoading, error, refetch } = useRandomImages(6)

  return (
    <div className="w-[600px] h-[480px] bg-[#0d1117] text-[#c9d1d9] flex flex-col">
      <Header onReload={refetch} isLoading={isLoading} />

      <div className="flex-1 px-3 py-3 overflow-y-auto">
        {error && <ErrorMessage message={error} />}

        {isLoading ? (
          <LoadingGrid />
        ) : (
          <ImageGrid images={images} />
        )}
      </div>

      <Footer />
    </div>
  )
}

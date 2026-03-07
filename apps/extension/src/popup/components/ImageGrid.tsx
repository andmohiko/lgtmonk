import React from 'react'
import type { Image } from '../../shared/types/Image'
import { ImageCard } from './ImageCard'

type ImageGridProps = {
  images: Array<Image>
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((image) => (
        <ImageCard key={image.imageId} image={image} />
      ))}
    </div>
  )
}

import { Heart } from 'lucide-react'
import type { MouseEvent } from 'react'

type FavoriteButtonProps = {
  imageId: string
  imageUrl: string
  isFavorite: boolean
  onToggle: (imageId: string, imageUrl: string) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost'
}

/**
 * お気に入りボタンコンポーネント
 * F-06: お気に入り登録機能
 */
export function FavoriteButton({
  imageId,
  imageUrl,
  isFavorite,
  onToggle,
  size = 'md',
  variant = 'default',
}: FavoriteButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // 画像カードのクリックイベントを防止
    e.stopPropagation()
    onToggle(imageId, imageUrl)
  }

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  // アイコンサイズ
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  // バリアント別のスタイル
  const variantClasses =
    variant === 'ghost'
      ? 'bg-transparent hover:bg-white/10'
      : 'bg-black/40 hover:bg-black/60'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        ${variantClasses}
        flex items-center justify-center
        rounded-full
        transition-all duration-300
        active:scale-125
        group
      `}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <Heart
        size={iconSizes[size]}
        className={`
          transition-colors duration-300
          ${
            isFavorite
              ? 'fill-[#f85149] text-[#f85149]'
              : 'fill-none text-[#8b949e] group-hover:text-[#f85149]'
          }
        `}
      />
    </button>
  )
}

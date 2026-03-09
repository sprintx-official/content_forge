import React from 'react'
import { Type, ImageIcon, Square, QrCode, Layers } from 'lucide-react'
import type { ElementType } from './templateTypes'

interface ElementPanelProps {
  onAddElement: (type: ElementType) => void
}

const ELEMENT_TYPES: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type className="size-4" /> },
  { type: 'image', label: 'Image', icon: <ImageIcon className="size-4" /> },
  { type: 'shape', label: 'Shape', icon: <Square className="size-4" /> },
  { type: 'qr-code', label: 'QR Code', icon: <QrCode className="size-4" /> },
  { type: 'gradient', label: 'Gradient', icon: <Layers className="size-4" /> },
]

export default function ElementPanel({ onAddElement }: ElementPanelProps) {
  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-[#cbd5e1] uppercase tracking-wider mb-2">
        Elements
      </h3>
      <div className="flex flex-col gap-1">
        {ELEMENT_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onAddElement(type)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#f8fafc] hover:bg-white/5 rounded-lg transition-colors"
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

"use client"

import React, { useState, useRef, useEffect, MouseEvent, TouchEvent, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { X, UploadCloud, ImageIcon } from "lucide-react"

interface AvatarCropperProps {
    onClose: () => void
    onUpload: (blob: Blob) => Promise<void>
}

export function AvatarCropper({ onClose, onUpload }: AvatarCropperProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement | null>(null)

    // Handle file selection
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = (event) => {
                setImageSrc(event.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0]
            if (file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = (event) => {
                    setImageSrc(event.target?.result as string)
                }
                reader.readAsDataURL(file)
            }
        }
    }

    // Load image into a hidden image element for canvas rendering
    useEffect(() => {
        if (imageSrc) {
            const img = new Image()
            img.onload = () => {
                imageRef.current = img
                // Reset zoom and offset based on image aspect ratio ideally
                setZoom(1)
                setOffset({ x: 0, y: 0 })
                draw()
            }
            img.src = imageSrc
        }
    }, [imageSrc])

    // Draw image onto canvas based on zoom and offset
    const draw = () => {
        const canvas = canvasRef.current
        const img = imageRef.current
        if (!canvas || !img) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const size = 300 // Size of our viewport
        const imgRatio = img.width / img.height

        let targetW, targetH
        if (imgRatio > 1) {
            targetH = size * zoom
            targetW = targetH * imgRatio
        } else {
            targetW = size * zoom
            targetH = targetW / imgRatio
        }

        const x = (size - targetW) / 2 + offset.x
        const y = (size - targetH) / 2 + offset.y

        ctx.drawImage(img, x, y, targetW, targetH)
    }

    useEffect(() => {
        draw()
    }, [zoom, offset])

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
        setIsDragging(true)
        dragStartRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y }
    }

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        setOffset({ x: dragStartRef.current.offsetX + dx, y: dragStartRef.current.offsetY + dy })
    }

    const onMouseUp = () => setIsDragging(false)

    // Touch events for mobile
    const onTouchStart = (e: TouchEvent) => {
        setIsDragging(true)
        const touch = e.touches[0]
        dragStartRef.current = { x: touch.clientX, y: touch.clientY, offsetX: offset.x, offsetY: offset.y }
    }

    const onTouchMove = (e: TouchEvent) => {
        if (!isDragging) return
        const touch = e.touches[0]
        const dx = touch.clientX - dragStartRef.current.x
        const dy = touch.clientY - dragStartRef.current.y
        setOffset({ x: dragStartRef.current.offsetX + dx, y: dragStartRef.current.offsetY + dy })
    }

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.005)))
    }

    const handleConfirm = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        setIsUploading(true)

        // Extract standard size circle
        const outputCanvas = document.createElement("canvas")
        outputCanvas.width = 400
        outputCanvas.height = 400
        const outCtx = outputCanvas.getContext("2d")

        if (outCtx) {
            // Fill background white just in case of transparency
            outCtx.fillStyle = "#ffffff"
            outCtx.fillRect(0, 0, 400, 400)

            // Draw current canvas scaled up
            outCtx.drawImage(canvas, 0, 0, 300, 300, 0, 0, 400, 400)

            outputCanvas.toBlob(async (blob) => {
                if (!blob) {
                    console.error("Canvas toBlob returned null")
                    setIsUploading(false)
                    return
                }
                try {
                    await onUpload(blob)
                    onClose()
                } catch (err) {
                    console.error("Upload failed", err)
                    setIsUploading(false)
                }
            }, "image/webp", 0.9)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <h3 className="text-lg font-jakarta font-bold text-white">Photo de profil</h3>
                    <p className="text-xs text-white/50 tracking-wide mt-1">Ajustez votre avatar</p>
                </div>

                {!imageSrc ? (
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-white/10 rounded-xl h-64 flex flex-col items-center justify-center gap-4 hover:bg-white/[0.02] hover:border-white/20 transition-all cursor-pointer relative group"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-white/80">Cliquez ou glissez une image</p>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">PNG, JPG ou WEBP</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            {/* The crop mask */}
                            <div
                                className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-2 border-primary/40 cursor-grab active:cursor-grabbing bg-black"
                                onMouseDown={onMouseDown}
                                onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp}
                                onMouseLeave={onMouseUp}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onMouseUp}
                                onWheel={onWheel}
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={300}
                                    height={300}
                                    className="pointer-events-none"
                                />
                                {/* Hint overlay */}
                                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-50">
                                    <span className="bg-black/80 text-[10px] text-white px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                                        Scroll pour zoomer
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/[0.04]">
                            <Button
                                variant="outline"
                                className="flex-1 border-white/10 text-white/60 hover:text-white"
                                onClick={() => setImageSrc(null)}
                                disabled={isUploading}
                            >
                                Changer l&apos;image
                            </Button>
                            <Button
                                className="flex-1 bg-white text-black hover:bg-white/90 font-bold"
                                onClick={handleConfirm}
                                disabled={isUploading}
                            >
                                {isUploading ? "Enregistrement..." : "Valider"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

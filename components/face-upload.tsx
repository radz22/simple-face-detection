"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, CheckCircle2 } from "lucide-react"
import { getFaceEmbedding, float32ArrayToArray } from "@/lib/face-recognition"
import { loadModels } from "@/lib/face-recognition"

interface FaceUploadProps {
  onUpload: (embedding: number[]) => Promise<void>
  disabled?: boolean
}

export function FaceUpload({ onUpload, disabled }: FaceUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)

  useEffect(() => {
    loadModels().then(() => setModelsLoaded(true))
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || disabled || !modelsLoaded) return

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file")
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        setPreview(dataUrl)

        // Create image element
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = dataUrl
        })

        // Get face embedding
        const embedding = await getFaceEmbedding(img)

        if (!embedding) {
          throw new Error("No face detected in image. Please ensure your face is clearly visible.")
        }

        // Convert to array
        const embeddingArray = float32ArrayToArray(embedding)

        await onUpload(embeddingArray)
        setSuccess(true)
      }

      reader.readAsDataURL(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process image"
      setError(message)
      setPreview(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="face-upload">Upload Face Photo</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a clear photo of your face for facial recognition
          </p>
        </div>

        {preview && (
          <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-xs mx-auto">
            <img
              src={preview}
              alt="Face preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-500">Face registered successfully!</p>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            id="face-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || isLoading || !modelsLoaded}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading || !modelsLoaded}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}


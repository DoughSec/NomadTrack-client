import API_BASE_URL from '../lib/apiBaseUrl'

type PresignResponse = {
  uploadUrl: string
  fileUrl: string
}

type TripPhotoResponse = {
  id?: number
  photoId?: number
  url?: string
  photoUrl?: string
  imageUrl?: string
  src?: string
  [key: string]: unknown
}

const BASE_URL = API_BASE_URL

const normalizeToken = (tokenValue: string | null | undefined): string => {
  if (!tokenValue || typeof tokenValue !== 'string') return ''
  return tokenValue.replace(/^Bearer\s+/i, '').trim()
}

const parseApiResponse = async (response: Response): Promise<any> => {
  const rawText = await response.text()
  if (!rawText) return {}
  try {
    return JSON.parse(rawText)
  } catch {
    return { message: rawText }
  }
}

export function useImageUpload() {
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const authToken = normalizeToken(localStorage.getItem('token'))

    const uploadedUrls = await Promise.all(
      files.map(async (file) => {
        // 1) Request presigned URL
        const presignResponse = await fetch(`${BASE_URL}/uploads/presign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            fileName: file.name,
          }),
        })

        const presignData = (await parseApiResponse(presignResponse)) as PresignResponse & { message?: string }
        if (!presignResponse.ok) {
          throw new Error(presignData?.message || 'Failed to get presigned upload URL.')
        }

        const { uploadUrl, fileUrl } = presignData

        // 2) Upload file to S3 (direct, no baseURL)
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        })
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage.')
        }

        return fileUrl
      }),
    )

    return uploadedUrls
  }

  const uploadAndPersistTripPhotos = async (
    tripId: string | number,
    files: File[],
    options?: { caption?: string; startSortOrder?: number },
  ): Promise<{ uploadedUrls: string[]; savedPhotos: TripPhotoResponse[] }> => {
    const normalizedTripId = String(tripId ?? '').trim()
    if (!normalizedTripId) {
      throw new Error('Trip id is required to save photo records.')
    }

    const uploadedUrls = await uploadImages(files)
    const authToken = normalizeToken(localStorage.getItem('token'))
    const baseSortOrder =
      typeof options?.startSortOrder === 'number' && Number.isFinite(options.startSortOrder)
        ? options.startSortOrder
        : 0

    const savedPhotos: TripPhotoResponse[] = []
    for (let index = 0; index < uploadedUrls.length; index += 1) {
      const url = uploadedUrls[index]
      const response = await fetch(
        `${BASE_URL}/trips/${encodeURIComponent(normalizedTripId)}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            url,
            caption: options?.caption ?? '',
            sortOrder: baseSortOrder + index,
          }),
        },
      )

      const data = (await parseApiResponse(response)) as TripPhotoResponse & { message?: string }
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save trip photo record.')
      }
      savedPhotos.push(data)
    }

    return { uploadedUrls, savedPhotos }
  }

  const deletePersistedTripPhoto = async (photoId: string | number): Promise<void> => {
    const normalizedPhotoId = String(photoId ?? '').trim()
    if (!normalizedPhotoId) {
      throw new Error('Photo id is required to delete a trip photo.')
    }

    const authToken = normalizeToken(localStorage.getItem('token'))
    const response = await fetch(
      `${BASE_URL}/trips/photos/${encodeURIComponent(normalizedPhotoId)}`,
      {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      },
    )

    if (!response.ok) {
      const data = (await parseApiResponse(response)) as { message?: string }
      throw new Error(data?.message || 'Failed to delete trip photo.')
    }
  }

  return { uploadImages, uploadAndPersistTripPhotos, deletePersistedTripPhoto }
}


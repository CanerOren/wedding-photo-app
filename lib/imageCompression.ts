import imageCompression from 'browser-image-compression'

export const compressImage = async (file: File) => {
  return await imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1,
    useWebWorker: true
  })
}
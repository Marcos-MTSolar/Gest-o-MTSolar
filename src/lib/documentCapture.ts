import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function capturarDocumento(): Promise<File | null> {
  // No browser normal, retorna null para usar o input padrão
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // pergunta: câmera ou galeria
    });

    if (!photo.dataUrl) return null;

    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `documento_${Date.now()}.jpg`, { 
      type: 'image/jpeg' 
    });
    return file;
  } catch {
    return null; // usuário cancelou
  }
}

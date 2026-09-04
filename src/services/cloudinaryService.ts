import * as ImagePicker from 'expo-image-picker';
import { sha1 } from '../utils/sha1';
import { DocumentType } from '../types';

export const CLOUDINARY_CONFIG = {
  cloudName: 'nffrbaq1',
  apiKey: '991948769391834',
  apiSecret: 'CCbDlNTIXPk3lc1zTOoyxj7zmhg',
  baseFolder: 'delivery boys details',
};

export interface PickedImageResult {
  uri: string;
  base64?: string | null;
}

export interface CloudinaryUploadResult {
  success: boolean;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}

export const cloudinaryService = {
  /**
   * Pick an image from user's gallery / camera with base64 support
   */
  async pickImage(useCamera: boolean = false): Promise<string | null> {
    const res = await this.pickImageDetailed(useCamera);
    return res ? (res.base64 ? `data:image/jpeg;base64,${res.base64}` : res.uri) : null;
  },

  /**
   * Pick an image returning both uri and base64
   */
  async pickImageDetailed(useCamera: boolean = false): Promise<PickedImageResult | null> {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission is required to capture document photos.');
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
          allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          return {
            uri: result.assets[0].uri,
            base64: result.assets[0].base64,
          };
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Gallery access permission is required to upload document images.');
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
          allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          return {
            uri: result.assets[0].uri,
            base64: result.assets[0].base64,
          };
        }
      }
    } catch (e: any) {
      console.warn('[CloudinaryService] Image pick error:', e);
      throw e;
    }
    return null;
  },

  /**
   * Upload an image (base64 data URI or file URI) to Cloudinary with folder hierarchy:
   * "delivery boys details/<partnerName>_<mobileNo>/"
   */
  async uploadPartnerDocument(
    imageInput: string,
    partnerName: string,
    partnerPhone: string,
    docType: DocumentType | string
  ): Promise<CloudinaryUploadResult> {
    try {
      // 1. Sanitize folder name: "delivery boys details/<Name>_<Mobile>"
      const sanitizedName = (partnerName || 'Partner').trim().replace(/[/\\?%*:|"<>]/g, '_');
      const sanitizedPhone = (partnerPhone || '0000000000').replace(/\D/g, '').slice(-10);
      const folderPath = `${CLOUDINARY_CONFIG.baseFolder}/${sanitizedName}_${sanitizedPhone}`;

      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `${docType}_${timestamp}`;

      // 2. Generate Cloudinary SHA-1 signature
      // Sorted parameters: folder, public_id, timestamp
      const stringToSign = `folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
      const signature = sha1(stringToSign);

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

      // 3. If imageInput is a base64 Data URI or raw base64, send JSON payload (100% reliable across Android & iOS)
      if (imageInput.startsWith('data:') || !imageInput.startsWith('file://')) {
        const filePayload = imageInput.startsWith('data:')
          ? imageInput
          : `data:image/jpeg;base64,${imageInput}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            file: filePayload,
            api_key: CLOUDINARY_CONFIG.apiKey,
            timestamp: timestamp,
            folder: folderPath,
            public_id: publicId,
            signature: signature,
          }),
        });

        const responseJson = await response.json();

        if (response.ok && responseJson.secure_url) {
          return {
            success: true,
            secureUrl: responseJson.secure_url,
            publicId: responseJson.public_id,
          };
        } else {
          const errMsg = responseJson.error?.message || 'Failed to upload document to Cloudinary';
          return {
            success: false,
            error: errMsg,
          };
        }
      } else {
        // Fallback: Use FormData without manually setting Content-Type (allows React Native to generate multipart boundary)
        const formData = new FormData();
        const filename = imageInput.split('/').pop() || `${docType}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri: imageInput,
          name: filename,
          type,
        } as any);

        formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('folder', folderPath);
        formData.append('public_id', publicId);
        formData.append('signature', signature);

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const responseJson = await response.json();

        if (response.ok && responseJson.secure_url) {
          return {
            success: true,
            secureUrl: responseJson.secure_url,
            publicId: responseJson.public_id,
          };
        } else {
          const errMsg = responseJson.error?.message || 'Failed to upload document to Cloudinary';
          return {
            success: false,
            error: errMsg,
          };
        }
      }
    } catch (e: any) {
      console.warn('[CloudinaryService] Upload error:', e);
      return {
        success: false,
        error: e?.message || 'Network error during image upload to Cloudinary',
      };
    }
  },
};

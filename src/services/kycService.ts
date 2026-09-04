import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DocumentType, KYCStatusType } from '../types';
import { cloudinaryService } from './cloudinaryService';

export const kycService = {
  async uploadDocument(
    partnerId: string,
    partnerName: string,
    partnerPhone: string,
    documentType: DocumentType,
    fileUri: string
  ): Promise<{ success: boolean; fileUrl?: string; status: KYCStatusType; error?: string }> {
    try {
      // 1. Upload to Cloudinary with folder hierarchy "delivery boys details/<name>_<phone>"
      const result = await cloudinaryService.uploadPartnerDocument(
        fileUri,
        partnerName,
        partnerPhone,
        documentType
      );

      if (!result.success || !result.secureUrl) {
        return {
          success: false,
          status: 'pending',
          error: result.error || 'Cloudinary upload failed',
        };
      }

      // 2. Persist the Cloudinary secure URL directly into Firestore delivery_partners document
      try {
        const partnerRef = doc(db, 'delivery_partners', partnerId);
        await setDoc(
          partnerRef,
          {
            documentImages: {
              [documentType]: result.secureUrl,
            },
            kycStatus: {
              documents: {
                [documentType]: 'under_review',
              },
            },
          },
          { merge: true }
        );
      } catch (firestoreError) {
        console.warn('[KYCService] Firestore sync warning:', firestoreError);
      }

      return {
        success: true,
        fileUrl: result.secureUrl,
        status: 'under_review',
      };
    } catch (e: any) {
      console.error('[KYCService] KYC Document Upload Error:', e);
      return { success: false, status: 'pending', error: e?.message };
    }
  },
};

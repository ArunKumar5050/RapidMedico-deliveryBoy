import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { DocumentType, KYCStatusType } from '../types';
import { StatusBadge } from './StatusBadge';
import { cloudinaryService } from '../services/cloudinaryService';
import { Camera, CheckCircle2, FileText, AlertCircle, CarFront, Shield, CreditCard, Banknote, User } from 'lucide-react-native';

interface DocumentUploaderProps {
  label: string;
  documentType: DocumentType;
  status: KYCStatusType;
  currentImageUrl?: string;
  rejectionReason?: string;
  onUpload: (type: DocumentType, uri: string) => Promise<void>;
}

const getIconForDocType = (type: DocumentType, size: number, color: string) => {
  switch (type) {
    case 'driving_license': return <CarFront size={size} color={color} />;
    case 'vehicle_rc': return <CarFront size={size} color={color} />;
    case 'aadhaar': return <Shield size={size} color={color} />;
    case 'pan': return <CreditCard size={size} color={color} />;
    case 'cancelled_cheque': return <Banknote size={size} color={color} />;
    default: return <FileText size={size} color={color} />;
  }
};

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  documentType,
  status,
  currentImageUrl,
  rejectionReason,
  onUpload,
}) => {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(currentImageUrl || null);

  const handlePick = async (useCamera: boolean) => {
    try {
      const uri = await cloudinaryService.pickImage(useCamera);
      if (!uri) return;

      setLocalPreview(uri);
      setUploading(true);
      await onUpload(documentType, uri);
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message || 'Could not pick or upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleActionSheet = () => {
    Alert.alert(
      `Upload ${label}`,
      'Choose source for uploading your KYC document image to Cloudinary:',
      [
        { text: '📷 Take Photo (Camera)', onPress: () => handlePick(true) },
        { text: '🖼️ Choose from Gallery', onPress: () => handlePick(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const isApproved = status === 'approved';
  const hasUploaded = !!(localPreview || currentImageUrl || status === 'under_review' || isApproved);

  // Uploaded state
  if (hasUploaded && !uploading) {
    return (
      <View style={[styles.card, styles.cardActiveUpload]}>
        <View style={styles.header}>
          <View style={styles.labelRow}>
            <View style={styles.iconBoxPrimary}>
              {getIconForDocType(documentType, 20, '#adc6ff')}
            </View>
            <View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.subtitle}>Document Uploaded</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <CheckCircle2 size={16} color="#4ae176" />
            <Text style={styles.statusTextVerified}>
               {isApproved ? 'Verified' : 'Under Review'}
            </Text>
          </View>
        </View>

        {rejectionReason ? (
          <View style={styles.rejectionBox}>
             <AlertCircle size={14} color="#ffb4ab" style={{ marginRight: 6 }} />
             <Text style={styles.rejectionText} numberOfLines={2}>{rejectionReason}</Text>
          </View>
        ) : null}

        {localPreview || currentImageUrl ? (
          <View style={styles.imagePreviewContainer}>
            <View style={styles.imageBox}>
               <Image source={{ uri: localPreview || currentImageUrl }} style={styles.image} />
               <View style={styles.imageOverlay}>
                 <Text style={styles.imageOverlayText}>Uploaded.jpg</Text>
               </View>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  // Uploading state
  if (uploading) {
    return (
      <View style={[styles.card, styles.cardUploading]}>
         <View style={styles.header}>
          <View style={styles.labelRow}>
            <View style={styles.iconBoxPrimary}>
              {getIconForDocType(documentType, 20, '#adc6ff')}
            </View>
            <View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.subtitleUploading}>Uploading...</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressContainer}>
           <ActivityIndicator size="small" color="#adc6ff" style={{ marginRight: 16 }} />
           <View style={{ flex: 1 }}>
              <View style={styles.progressBarBg}>
                 <View style={styles.progressBarFill} />
              </View>
              <Text style={styles.progressText}>Processing high-res image</Text>
           </View>
        </View>
      </View>
    );
  }

  // Idle state
  return (
    <View style={styles.card}>
      <View style={styles.header}>
          <View style={styles.labelRow}>
            <View style={styles.iconBoxMuted}>
              {getIconForDocType(documentType, 20, '#c2c6d6')}
            </View>
            <View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.subtitleMuted}>Clear photo with good lighting</Text>
            </View>
          </View>
          <Text style={styles.statusTextRequired}>Required</Text>
      </View>

      {rejectionReason ? (
        <View style={styles.rejectionBox}>
            <AlertCircle size={14} color="#ffb4ab" style={{ marginRight: 6 }} />
            <Text style={styles.rejectionText} numberOfLines={2}>{rejectionReason}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.uploadDashed}
        onPress={handleActionSheet}
        activeOpacity={0.7}
      >
        <Camera size={32} color="#8c909f" />
        <Text style={styles.uploadBtnText}>Tap to capture or upload</Text>
        <Text style={styles.uploadBtnSubtext}>JPEG, PNG up to 5MB</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  cardActiveUpload: {
    borderColor: 'rgba(77, 142, 255, 0.3)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
  },
  cardUploading: {
    borderColor: 'rgba(173, 198, 255, 0.3)',
    backgroundColor: 'rgba(173, 198, 255, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBoxPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(173, 198, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxMuted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#252a38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dee2f5',
  },
  subtitle: {
    fontSize: 11,
    color: '#c2c6d6',
    fontWeight: '500',
  },
  subtitleMuted: {
    fontSize: 11,
    color: '#c2c6d6',
  },
  subtitleUploading: {
    fontSize: 11,
    color: '#adc6ff',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTextVerified: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ae176',
  },
  statusTextRequired: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffb4ab',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: '#ffb4ab',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  rejectionText: {
    fontSize: 12,
    color: '#ffb4ab',
    fontWeight: '500',
    flex: 1,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  imageBox: {
    width: 96,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(10, 15, 28, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  imageOverlayText: {
    fontSize: 10,
    color: '#dee2f5',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#252a38',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#adc6ff',
    width: '64%', // fake progress
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#c2c6d6',
    marginTop: 8,
    textAlign: 'right',
  },
  uploadDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dee2f5',
  },
  uploadBtnSubtext: {
    fontSize: 11,
    color: '#c2c6d6',
  },
});

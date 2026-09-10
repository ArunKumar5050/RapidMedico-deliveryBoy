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
import { useThemeStore } from '../store/themeStore';
import { Camera, CheckCircle2, FileText, AlertCircle, CarFront, Shield, CreditCard, Banknote } from 'lucide-react-native';

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
  const { theme } = useThemeStore();
  const styles = createStyles(theme);

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
              {getIconForDocType(documentType, 20, theme.primary)}
            </View>
            <View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.subtitle}>Document Uploaded</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <CheckCircle2 size={16} color={theme.success} />
            <Text style={styles.statusTextVerified}>
               {isApproved ? 'Verified' : 'Under Review'}
            </Text>
          </View>
        </View>

        {rejectionReason ? (
          <View style={styles.rejectionBox}>
             <AlertCircle size={14} color={theme.danger} style={{ marginRight: 6 }} />
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
              {getIconForDocType(documentType, 20, theme.primary)}
            </View>
            <View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.subtitleUploading}>Uploading...</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressContainer}>
           <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 16 }} />
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
              {getIconForDocType(documentType, 20, theme.textMuted)}
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
            <AlertCircle size={14} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={styles.rejectionText} numberOfLines={2}>{rejectionReason}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.uploadDashed}
        onPress={handleActionSheet}
        activeOpacity={0.7}
      >
        <Camera size={32} color={theme.textMuted} />
        <Text style={styles.uploadBtnText}>Tap to capture or upload</Text>
        <Text style={styles.uploadBtnSubtext}>JPEG, PNG up to 5MB</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 16,
  },
  cardActiveUpload: {
    borderColor: theme.primary,
    shadowColor: theme.primaryGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
  },
  cardUploading: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryBg,
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
    backgroundColor: theme.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxMuted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.subtleBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  subtitleMuted: {
    fontSize: 11,
    color: theme.textMuted,
  },
  subtitleUploading: {
    fontSize: 11,
    color: theme.primary,
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
    color: theme.success,
  },
  statusTextRequired: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.danger,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dangerBg,
    borderWidth: 1,
    borderColor: theme.danger,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  rejectionText: {
    fontSize: 12,
    color: theme.danger,
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
    borderColor: theme.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.subtleBox,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    width: '64%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
  uploadDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.cardBorder,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  uploadBtnSubtext: {
    fontSize: 11,
    color: theme.textMuted,
  },
});


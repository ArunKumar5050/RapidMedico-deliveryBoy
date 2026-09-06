import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { kycService } from '../services/kycService';
import { DocumentUploader } from '../components/DocumentUploader';
import { DocumentType, KYCStatusType } from '../types';
import { ArrowLeft, ArrowRight, ShieldAlert, BadgeInfo } from 'lucide-react-native';


export const KYCUploadScreen = ({ navigation }: any) => {
  const { partner, setPartner } = useAuthStore();
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [docStatuses, setDocStatuses] = useState<Record<DocumentType, KYCStatusType>>({
    driving_license: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.driving_license || 'pending' : 'pending',
    vehicle_rc: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.vehicle_rc || 'pending' : 'pending',
    aadhaar: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.aadhaar || 'pending' : 'pending',
    pan: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.pan || 'pending' : 'pending',
    insurance: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.insurance || 'pending' : 'pending',
    cancelled_cheque: typeof partner?.kycStatus === 'object' ? partner.kycStatus.documents.cancelled_cheque || 'pending' : 'pending',
  });

  const handleUpload = async (type: DocumentType, uri: string) => {
    if (!partner) return;
    const res = await kycService.uploadDocument(
      partner.partnerId,
      partner.fullName,
      partner.phone,
      type,
      uri
    );
    if (res.success && res.fileUrl) {
      setDocStatuses((prev) => ({ ...prev, [type]: 'under_review' }));
      setPartner({
        ...partner,
        documentImages: {
          ...(partner.documentImages || {}),
          [type]: res.fileUrl,
        },
      });
      Alert.alert(
        'Upload Successful! ☁️',
        `${type.replace('_', ' ').toUpperCase()} has been uploaded and stored in your Cloudinary dossier.`
      );
    } else {
      Alert.alert('Upload Failed', res.error || 'Could not upload document.');
    }
  };

  const handleSubmitKYC = async () => {
    if (!partner) return;
    setPartner({
      ...partner,
      kycStatus: {
        overall: 'under_review',
        documents: docStatuses,
      },
    });

    Alert.alert(
      'KYC Dossier Submitted! 📋',
      'Your documents are under review by RapidMedicoco Compliance Ops. Approval usually takes 2-4 business hours.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const overallStatus = typeof partner?.kycStatus === 'object' ? partner.kycStatus.overall : partner?.kycStatus || 'pending';
  const isUnderReview = overallStatus === 'under_review';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#dee2f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RapidMedicoco</Text>
        <View style={styles.headerRight}>
           <View style={styles.avatar}>
               <Text style={styles.avatarText}>{partner?.fullName?.charAt(0) || 'P'}</Text>
           </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>KYC Verification</Text>
          <Text style={styles.mainSubtitle}>Complete your profile to start delivering critical medical supplies.</Text>
        </View>

        {isUnderReview && (
          <View style={styles.reviewBanner}>
            <View style={styles.reviewIconBox}>
              <ShieldAlert size={20} color="#4fdbc8" />
            </View>
            <View style={styles.reviewTextCol}>
              <Text style={styles.reviewTitle}>Verification in Progress</Text>
              <Text style={styles.reviewDesc}>Your documents are currently being reviewed by our compliance team. This usually takes 2-4 hours.</Text>
            </View>
          </View>
        )}

        <View style={styles.docsList}>
          <DocumentUploader
            label="Aadhaar Card"
            documentType="aadhaar"
            status={docStatuses.aadhaar}
            currentImageUrl={partner?.documentImages?.aadhaar}
            onUpload={handleUpload}
          />

          <DocumentUploader
            label="Driving License"
            documentType="driving_license"
            status={docStatuses.driving_license}
            currentImageUrl={partner?.documentImages?.driving_license}
            onUpload={handleUpload}
          />
          
          <DocumentUploader
            label="Vehicle Registration (RC)"
            documentType="vehicle_rc"
            status={docStatuses.vehicle_rc}
            currentImageUrl={partner?.documentImages?.vehicle_rc}
            onUpload={handleUpload}
          />

          <DocumentUploader
            label="PAN Card"
            documentType="pan"
            status={docStatuses.pan}
            currentImageUrl={partner?.documentImages?.pan}
            onUpload={handleUpload}
          />

          <DocumentUploader
            label="Bank Details (Passbook/Cheque)"
            documentType="cancelled_cheque"
            status={docStatuses.cancelled_cheque}
            currentImageUrl={partner?.documentImages?.cancelled_cheque || partner?.bankDetails?.chequeImageUri}
            onUpload={handleUpload}
          />
        </View>

        <View style={styles.actionArea}>
          <TouchableOpacity
            style={[styles.btnPrimaryContainer, isUnderReview && styles.btnDisabled]}
            onPress={handleSubmitKYC}
            disabled={isUnderReview}
          >
            <View
              style={[styles.btnPrimary, { backgroundColor: theme.primaryGlow }]}
            >
              <Text style={styles.btnPrimaryText}>Submit KYC</Text>
              <ArrowRight size={20} color="#0e1320" />
            </View>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            By submitting, you agree to RapidMedicoco's background check policies.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 5,
    zIndex: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: theme.subtleBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  titleContainer: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  reviewBanner: {
    backgroundColor: 'rgba(4, 180, 162, 0.1)',
    borderColor: 'rgba(4, 180, 162, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  reviewIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(4, 180, 162, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTextCol: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  reviewDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  docsList: {
    gap: 8,
  },
  actionArea: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  btnPrimaryContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.secondaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  btnPrimaryText: {
    color: theme.bg,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  footerText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 11,
    marginTop: 16,
  },
});

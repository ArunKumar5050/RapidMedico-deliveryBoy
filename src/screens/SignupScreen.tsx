import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import { authService, SignupPayload, DELIVERY_ZONES } from '../services/authService';
import { cloudinaryService } from '../services/cloudinaryService';
import {
  User,
  Phone,
  MapPin,
  Bike,
  CreditCard,
  Mail,
  CheckCircle2,
  Camera,
  Building2,
  FileText,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react-native';


const VEHICLE_TYPES = [
  { id: 'scooter', label: 'Scooter / Moped', icon: '🛵', desc: 'Petrol 100-125cc' },
  { id: 'ev_bike', label: 'Electric EV ⚡', icon: '⚡', desc: 'Zero Emission EV' },
  { id: 'motorbike', label: 'Motorbike', icon: '🏍️', desc: 'Geared 125-200cc' },
];

export const SignupScreen = ({ navigation }: any) => {
  const { theme } = useThemeStore();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // ==================== STEP 1: Basic Profile State ====================
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cityId, setCityId] = useState('khatushyam_ji');
  const [vehicleType, setVehicleType] = useState('scooter');

  // ==================== STEP 2: KYC, Vehicle & Bank State ====================
  const [dlNumber, setDlNumber] = useState('');
  const [dlImageUri, setDlImageUri] = useState<string | null>(null);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [rcImageUri, setRcImageUri] = useState<string | null>(null);

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarImageUri, setAadhaarImageUri] = useState<string | null>(null);

  const [panNumber, setPanNumber] = useState('');
  const [panImageUri, setPanImageUri] = useState<string | null>(null);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [chequeImageUri, setChequeImageUri] = useState<string | null>(null);

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real Cloudinary Document Upload Handler
  const handlePickAndUpload = (docType: string, docLabel: string, setter: (url: string) => void) => {
    Alert.alert(
      `Upload ${docLabel}`,
      `Select image source to upload to folder:\n"delivery boys details/${fullName.trim() || 'Partner'}_${phone.trim() || '0000000000'}"`,
      [
        {
          text: '📷 Take Photo (Camera)',
          onPress: async () => {
            try {
              const uri = await cloudinaryService.pickImage(true);
              if (!uri) return;
              setUploadingDoc(docType);
              const res = await cloudinaryService.uploadPartnerDocument(
                uri,
                fullName || 'New Partner',
                phone || '0000000000',
                docType
              );
              if (res.success && res.secureUrl) {
                setter(res.secureUrl);
                Alert.alert(
                  'Cloudinary Upload Complete! ☁️',
                  `${docLabel} uploaded successfully.\nFolder: delivery boys details/${fullName || 'Partner'}_${phone}`
                );
              } else {
                Alert.alert('Upload Failed', res.error || 'Failed to upload document.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to capture photo');
            } finally {
              setUploadingDoc(null);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            try {
              const uri = await cloudinaryService.pickImage(false);
              if (!uri) return;
              setUploadingDoc(docType);
              const res = await cloudinaryService.uploadPartnerDocument(
                uri,
                fullName || 'New Partner',
                phone || '0000000000',
                docType
              );
              if (res.success && res.secureUrl) {
                setter(res.secureUrl);
                Alert.alert(
                  'Cloudinary Upload Complete! ☁️',
                  `${docLabel} uploaded successfully.\nFolder: delivery boys details/${fullName || 'Partner'}_${phone}`
                );
              } else {
                Alert.alert('Upload Failed', res.error || 'Failed to pick image.');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to pick image');
            } finally {
              setUploadingDoc(null);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = 'Please enter your full name (minimum 3 letters)';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (email.trim() && !email.includes('@')) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!dlNumber.trim() || dlNumber.trim().length < 6) {
      errs.dlNumber = 'Please enter a valid Driving License number';
    }
    if (!vehicleNumber.trim() || vehicleNumber.trim().length < 6) {
      errs.vehicleNumber = 'Please enter a valid Vehicle Registration';
    }
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      errs.aadhaarNumber = 'Please enter a valid 12-digit Aadhaar number';
    }
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      errs.panNumber = 'Please enter a valid 10-character PAN number';
    }
    if (!bankName.trim()) {
      errs.bankName = 'Please enter your Bank Name';
    }
    if (!accountNumber.trim() || accountNumber.length < 8) {
      errs.accountNumber = 'Please enter a valid Bank Account Number';
    }
    if (accountNumber.trim() !== confirmAccountNumber.trim()) {
      errs.confirmAccountNumber = 'Account numbers do not match';
    }
    if (!ifscCode.trim() || ifscCode.trim().length < 6) {
      errs.ifscCode = 'Please enter a valid IFSC Code';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setErrors({});
      setCurrentStep(2);
    }
  };

  const handleSubmitFinal = async () => {
    if (!validateStep2()) {
      Alert.alert('Incomplete Details', 'Please complete all required vehicle, KYC and bank fields.');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const signupPayload: SignupPayload = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        cityId,
        vehicleType,
        drivingLicenseNumber: dlNumber.toUpperCase().trim(),
        dlImageUri: dlImageUri || undefined,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        rcImageUri: rcImageUri || undefined,
        aadhaarNumber: aadhaarNumber.replace(/\D/g, '').trim(),
        aadhaarImageUri: aadhaarImageUri || undefined,
        panNumber: panNumber.toUpperCase().trim(),
        panImageUri: panImageUri || undefined,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.toUpperCase().trim(),
        chequeImageUri: chequeImageUri || undefined,
      };

      const res = await authService.sendOTP(cleanPhone);
      if (res.success) {
        navigation.navigate('AuthOTPVerify', {
          phone: cleanPhone,
          mode: 'signup',
          signupData: signupPayload,
        });
      } else {
         Alert.alert('Error', (res as any).error || res.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      Alert.alert('Registration Error', e?.message || 'Failed to submit registration.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.stepIndicatorHeader}>
        <Text style={styles.stepIndicatorTitle}>
          {currentStep === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
        </Text>
        <Text style={styles.stepIndicatorSubtitle}>
          {currentStep === 1 ? 'Personal Info' : 'KYC & Bank'}
        </Text>
      </View>
      <View style={styles.stepIndicatorBars}>
        <View style={[styles.stepBar, styles.stepBarActive]} />
        <View style={[styles.stepBar, currentStep === 2 ? styles.stepBarActive : styles.stepBarInactive]} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => (currentStep === 2 ? setCurrentStep(1) : navigation.goBack())}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#dee2f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RapidMedico</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>{currentStep === 1 ? 'Create Account' : 'KYC Verification'}</Text>
          <Text style={styles.mainSubtitle}>
            {currentStep === 1 ? 'Join the medical logistics network.' : 'Complete your profile to start delivering.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* Subtle background glow */}
          <View style={styles.glowEffect} />

          {currentStep === 1 ? (
            <View style={styles.formContainer}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputRow, errors.fullName && styles.inputError]}>
                  <User size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#8c909f"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                  />
                </View>
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputRow, errors.email && styles.inputError]}>
                  <Mail size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#8c909f"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Mobile */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.phoneContainer}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <View style={[styles.inputRow, { flex: 1 }, errors.phone && styles.inputError]}>
                    <Phone size={20} color="#8c909f" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="00000 00000"
                      placeholderTextColor="#8c909f"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text.replace(/\D/g, '').slice(0, 10));
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                    />
                  </View>
                </View>
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              {/* Hub / Zone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Operational Hub / Zone</Text>
                <View style={styles.zoneGrid}>
                  {DELIVERY_ZONES.map((zone) => {
                    const selected = cityId === zone.id;
                    return (
                      <TouchableOpacity
                        key={zone.id}
                        style={[styles.zoneCard, selected && styles.zoneCardSelected]}
                        onPress={() => setCityId(zone.id)}
                        activeOpacity={0.8}
                      >
                        <MapPin size={16} color={selected ? theme.primary : theme.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.zoneName, selected && styles.textPrimary]}>{zone.name}</Text>
                          <Text style={styles.zoneState}>{zone.state}</Text>
                        </View>
                        {selected && <CheckCircle2 size={18} color="#adc6ff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Vehicle Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Type</Text>
                <View style={styles.vehicleList}>
                  {VEHICLE_TYPES.map((v) => {
                    const selected = vehicleType === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.vehicleOption, selected && styles.vehicleOptionSelected]}
                        onPress={() => setVehicleType(v.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.vehicleIconEmoji}>{v.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.vehicleOptionTitle, selected && styles.textPrimary]}>{v.label}</Text>
                          <Text style={styles.vehicleOptionDesc}>{v.desc}</Text>
                        </View>
                        {selected && <CheckCircle2 size={18} color="#adc6ff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </View>
          ) : (
            <View style={styles.formContainer}>
               {/* DL */}
               <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Driving License Number (DL)</Text>
                <View style={[styles.inputRow, errors.dlNumber && styles.inputError]}>
                  <CreditCard size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. RJ-2320150012345"
                    placeholderTextColor="#8c909f"
                    autoCapitalize="characters"
                    value={dlNumber}
                    onChangeText={(text) => {
                      setDlNumber(text.toUpperCase());
                      if (errors.dlNumber) setErrors((prev) => ({ ...prev, dlNumber: '' }));
                    }}
                  />
                </View>
                {errors.dlNumber ? <Text style={styles.errorText}>{errors.dlNumber}</Text> : null}
                
                <View style={styles.uploadCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>Driving License Photo</Text>
                    <Text style={[styles.uploadSubtitle, dlImageUri && styles.textSuccess]}>
                      {dlImageUri ? '✓ Uploaded' : 'Upload front & back'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadBtn, dlImageUri && styles.uploadBtnSuccess]}
                    onPress={() => handlePickAndUpload('driving_license', 'Driving License', setDlImageUri)}
                    disabled={uploadingDoc === 'driving_license'}
                  >
                    {uploadingDoc === 'driving_license' ? (
                      <ActivityIndicator size="small" color="#adc6ff" />
                    ) : (
                      <Camera size={18} color={dlImageUri ? theme.successGlow : theme.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

               {/* RC */}
               <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Registration (RC)</Text>
                <View style={[styles.inputRow, errors.vehicleNumber && styles.inputError]}>
                  <Bike size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. RJ 23 EQ 1234"
                    placeholderTextColor="#8c909f"
                    autoCapitalize="characters"
                    value={vehicleNumber}
                    onChangeText={(text) => {
                      setVehicleNumber(text.toUpperCase());
                      if (errors.vehicleNumber) setErrors((prev) => ({ ...prev, vehicleNumber: '' }));
                    }}
                  />
                </View>
                {errors.vehicleNumber ? <Text style={styles.errorText}>{errors.vehicleNumber}</Text> : null}

                <View style={styles.uploadCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>Vehicle RC Document</Text>
                    <Text style={[styles.uploadSubtitle, rcImageUri && styles.textSuccess]}>
                      {rcImageUri ? '✓ Uploaded' : 'Upload smart card'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadBtn, rcImageUri && styles.uploadBtnSuccess]}
                    onPress={() => handlePickAndUpload('vehicle_rc', 'Vehicle RC', setRcImageUri)}
                    disabled={uploadingDoc === 'vehicle_rc'}
                  >
                    {uploadingDoc === 'vehicle_rc' ? (
                      <ActivityIndicator size="small" color="#adc6ff" />
                    ) : (
                      <Camera size={18} color={rcImageUri ? theme.successGlow : theme.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Aadhaar */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Aadhaar Card Number</Text>
                <View style={[styles.inputRow, errors.aadhaarNumber && styles.inputError]}>
                  <FileText size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="12-digit Aadhaar number"
                    placeholderTextColor="#8c909f"
                    keyboardType="numeric"
                    maxLength={14}
                    value={aadhaarNumber}
                    onChangeText={(text) => {
                      setAadhaarNumber(text);
                      if (errors.aadhaarNumber) setErrors((prev) => ({ ...prev, aadhaarNumber: '' }));
                    }}
                  />
                </View>
                {errors.aadhaarNumber ? <Text style={styles.errorText}>{errors.aadhaarNumber}</Text> : null}

                <View style={styles.uploadCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>Aadhaar Card Copy</Text>
                    <Text style={[styles.uploadSubtitle, aadhaarImageUri && styles.textSuccess]}>
                      {aadhaarImageUri ? '✓ Uploaded' : 'Upload front & back'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadBtn, aadhaarImageUri && styles.uploadBtnSuccess]}
                    onPress={() => handlePickAndUpload('aadhaar', 'Aadhaar Card', setAadhaarImageUri)}
                    disabled={uploadingDoc === 'aadhaar'}
                  >
                    {uploadingDoc === 'aadhaar' ? (
                      <ActivityIndicator size="small" color="#adc6ff" />
                    ) : (
                      <Camera size={18} color={aadhaarImageUri ? theme.successGlow : theme.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* PAN */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PAN Card Number</Text>
                <View style={[styles.inputRow, errors.panNumber && styles.inputError]}>
                  <CreditCard size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-character PAN (e.g. ABCDE1234F)"
                    placeholderTextColor="#8c909f"
                    autoCapitalize="characters"
                    maxLength={10}
                    value={panNumber}
                    onChangeText={(text) => {
                      setPanNumber(text.toUpperCase());
                      if (errors.panNumber) setErrors((prev) => ({ ...prev, panNumber: '' }));
                    }}
                  />
                </View>
                {errors.panNumber ? <Text style={styles.errorText}>{errors.panNumber}</Text> : null}

                <View style={styles.uploadCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>PAN Card Photo</Text>
                    <Text style={[styles.uploadSubtitle, panImageUri && styles.textSuccess]}>
                      {panImageUri ? '✓ Uploaded' : 'Upload photo'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadBtn, panImageUri && styles.uploadBtnSuccess]}
                    onPress={() => handlePickAndUpload('pan', 'PAN Card', setPanImageUri)}
                    disabled={uploadingDoc === 'pan'}
                  >
                    {uploadingDoc === 'pan' ? (
                      <ActivityIndicator size="small" color="#adc6ff" />
                    ) : (
                      <Camera size={18} color={panImageUri ? theme.successGlow : theme.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

               {/* Bank Name */}
               <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <View style={[styles.inputRow, errors.bankName && styles.inputError]}>
                  <Building2 size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. State Bank of India"
                    placeholderTextColor="#8c909f"
                    value={bankName}
                    onChangeText={(text) => {
                      setBankName(text);
                      if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: '' }));
                    }}
                  />
                </View>
                {errors.bankName ? <Text style={styles.errorText}>{errors.bankName}</Text> : null}
              </View>

               {/* Account Number */}
               <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Account Number</Text>
                <View style={[styles.inputRow, errors.accountNumber && styles.inputError]}>
                  <Building2 size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter Account Number"
                    placeholderTextColor="#8c909f"
                    keyboardType="numeric"
                    value={accountNumber}
                    onChangeText={(text) => {
                      setAccountNumber(text);
                      if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
                    }}
                  />
                </View>
                {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
              </View>

              {/* Confirm Account Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Re-enter Account Number</Text>
                <View style={[styles.inputRow, errors.confirmAccountNumber && styles.inputError]}>
                  <Building2 size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter Account Number"
                    placeholderTextColor="#8c909f"
                    keyboardType="numeric"
                    value={confirmAccountNumber}
                    onChangeText={(text) => {
                      setConfirmAccountNumber(text);
                      if (errors.confirmAccountNumber)
                        setErrors((prev) => ({ ...prev, confirmAccountNumber: '' }));
                    }}
                  />
                </View>
                {errors.confirmAccountNumber ? <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text> : null}
              </View>

              {/* IFSC */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <View style={[styles.inputRow, errors.ifscCode && styles.inputError]}>
                  <Building2 size={20} color="#8c909f" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. SBIN0001234"
                    placeholderTextColor="#8c909f"
                    autoCapitalize="characters"
                    maxLength={11}
                    value={ifscCode}
                    onChangeText={(text) => {
                      setIfscCode(text.toUpperCase());
                      if (errors.ifscCode) setErrors((prev) => ({ ...prev, ifscCode: '' }));
                    }}
                  />
                </View>
                {errors.ifscCode ? <Text style={styles.errorText}>{errors.ifscCode}</Text> : null}
                
                <View style={styles.uploadCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>Cancelled Cheque / Passbook</Text>
                    <Text style={[styles.uploadSubtitle, chequeImageUri && styles.textSuccess]}>
                      {chequeImageUri ? '✓ Uploaded' : 'Upload photo'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.uploadBtn, chequeImageUri && styles.uploadBtnSuccess]}
                    onPress={() => handlePickAndUpload('cancelled_cheque', 'Bank Cheque / Passbook', setChequeImageUri)}
                    disabled={uploadingDoc === 'cancelled_cheque'}
                  >
                    {uploadingDoc === 'cancelled_cheque' ? (
                      <ActivityIndicator size="small" color="#adc6ff" />
                    ) : (
                      <Camera size={18} color={chequeImageUri ? theme.successGlow : theme.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.btnPrimaryContainer}
            onPress={currentStep === 1 ? handleNextStep : handleSubmitFinal}
            disabled={loading}
          >
            <View
              style={[styles.btnPrimary, { backgroundColor: theme.primaryGlow }]}
            >
              {loading ? (
                <ActivityIndicator color="#0e1320" />
              ) : (
                <>
                  <Text style={styles.btnPrimaryText}>
                    {currentStep === 1 ? 'Continue to Verification' : 'Submit KYC'}
                  </Text>
                  <ArrowRight size={20} color="#0e1320" />
                </>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: theme.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
    fontFamily: 'Inter-Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  stepIndicatorContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  stepIndicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicatorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    letterSpacing: 0.6,
  },
  stepIndicatorSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  stepIndicatorBars: {
    flexDirection: 'row',
    gap: 8,
    height: 6,
  },
  stepBar: {
    flex: 1,
    borderRadius: 3,
  },
  stepBarActive: {
    backgroundColor: theme.primary,
    shadowColor: theme.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  stepBarInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  formCard: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -96,
    right: -96,
    width: 192,
    height: 192,
    backgroundColor: 'rgba(173,198,255,0.05)',
    borderRadius: 96,
    // blur radius would be implemented via a View but we just use opacity and color here for a subtle effect
  },
  formContainer: {
    gap: 20,
    zIndex: 10,
  },
  inputGroup: {
    // marginBottom handled by gap
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputError: {
    borderColor: theme.danger,
  },
  textInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    padding: 0,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCode: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    color: theme.textPrimary,
    fontSize: 14,
  },
  errorText: {
    color: theme.danger,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  zoneGrid: {
    gap: 8,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  zoneCardSelected: {
    borderColor: 'rgba(173,198,255,0.5)',
    backgroundColor: 'rgba(173,198,255,0.1)',
  },
  zoneName: {
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  zoneState: {
    fontSize: 11,
    color: theme.textMuted,
  },
  textPrimary: {
    color: theme.primary,
    fontWeight: '600',
  },
  vehicleList: {
    gap: 8,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  vehicleOptionSelected: {
    borderColor: 'rgba(173,198,255,0.5)',
    backgroundColor: 'rgba(173,198,255,0.1)',
  },
  vehicleIconEmoji: {
    fontSize: 20,
  },
  vehicleOptionTitle: {
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  vehicleOptionDesc: {
    fontSize: 11,
    color: theme.textMuted,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
  },
  textSuccess: {
    color: theme.successGlow,
  },
  uploadBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(173,198,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(173,198,255,0.3)',
  },
  uploadBtnSuccess: {
    backgroundColor: 'rgba(107,255,143,0.1)',
    borderColor: 'rgba(107,255,143,0.3)',
  },
  actionContainer: {
    marginTop: 32,
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

import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { useThemeStore } from '../store/themeStore';

interface LocationPermissionModalProps {
  visible: boolean;
  stage: 'foreground' | 'background' | 'servicesDisabled';
  onGrant: () => void;
  onDismiss: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  visible,
  stage,
  onGrant,
  onDismiss,
}) => {
  const { theme } = useThemeStore();

  const getTitleAndText = () => {
    switch (stage) {
      case 'servicesDisabled':
        return {
          title: 'Turn On Location Services',
          body: 'GPS location is disabled on your device. Please turn on Location Services in your Android settings to receive delivery offers.',
          button: 'Open Device Settings',
        };
      case 'background':
        return {
          title: 'Background Location Permission Required',
          body: 'RapidMedico tracks your delivery route in the background so customers receive accurate live tracking while your phone is locked or you are using turn-by-turn navigation.',
          button: 'Allow Always / Background',
        };
      default:
        return {
          title: 'Location Access Needed',
          body: 'RapidMedico uses your high-accuracy location to match nearby pharmacy pickups and track delivery routes.',
          button: 'Grant Location Access',
        };
    }
  };

  const content = getTitleAndText();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{content.title}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{content.body}</Text>
          <View style={styles.btnContainer}>
            <PrimaryButton label={content.button} onPress={onGrant} />
            <SecondaryButton label="Not Now" onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  btnContainer: {
    width: '100%',
  },
});


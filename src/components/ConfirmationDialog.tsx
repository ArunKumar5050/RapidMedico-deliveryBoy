import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.btnRow}>
            <SecondaryButton label={cancelLabel} onPress={onCancel} />
            <PrimaryButton
              label={confirmLabel}
              onPress={onConfirm}
              variant={isDestructive ? 'danger' : 'primary'}
            />
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
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  btnRow: {
    width: '100%',
    gap: 8,
  },
});

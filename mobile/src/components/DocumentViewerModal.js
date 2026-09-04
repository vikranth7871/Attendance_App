import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator, Linking
} from 'react-native';
import { X, FileText, Download, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const DocumentViewerModal = ({ visible, onClose, documentUrl, title = 'Attached Document' }) => {
  if (!visible) return null;

  const isImage = documentUrl && (
    documentUrl.endsWith('.png') ||
    documentUrl.endsWith('.jpg') ||
    documentUrl.endsWith('.jpeg') ||
    documentUrl.endsWith('.webp') ||
    documentUrl.includes('image')
  );

  const handleOpenExternal = () => {
    if (documentUrl) {
      Linking.openURL(documentUrl).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, shadows.lg]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ShieldCheck size={18} color={colors.primary} />
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {!documentUrl ? (
              <View style={styles.emptyContainer}>
                <FileText size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No document attached or accessible.</Text>
              </View>
            ) : isImage ? (
              <ScrollView contentContainerStyle={styles.imageScroll} maximumZoomScale={3} minimumZoomScale={1}>
                <Image
                  source={{ uri: documentUrl }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </ScrollView>
            ) : (
              <View style={styles.docPlaceholder}>
                <FileText size={56} color={colors.primary} />
                <Text style={styles.docName}>{title}</Text>
                <Text style={styles.docSub}>PDF / Supporting Documentation</Text>
                <TouchableOpacity style={styles.viewDocBtn} onPress={handleOpenExternal}>
                  <ExternalLink size={16} color="#fff" />
                  <Text style={styles.viewDocText}>Open In Browser / Viewer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  title: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  closeBtn: { padding: spacing.xs },
  body: { padding: spacing.md, minHeight: 280, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.sm, color: colors.textMuted, textAlign: 'center' },
  imageScroll: { alignItems: 'center', justifyContent: 'center' },
  image: { width: 360, height: 360, borderRadius: radius.md },
  docPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  docName: { ...typography.base, ...typography.semibold, color: colors.textPrimary, textAlign: 'center' },
  docSub: { ...typography.xs, color: colors.textMuted, marginBottom: spacing.md },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  viewDocText: { ...typography.sm, ...typography.bold, color: '#fff' },
});

export default DocumentViewerModal;


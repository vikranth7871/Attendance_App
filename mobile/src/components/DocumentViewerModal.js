import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, Linking, Platform, Animated
} from 'react-native';
import { X, FileText, Download, ExternalLink, ShieldCheck, ZoomIn, ZoomOut, RotateCcw, FileCheck } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';
import api from '../api/client';

const DocumentViewerModal = ({ visible, onClose, documentUrl, title = 'Attached Document' }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  const resolveDocUrl = (url) => {
    if (!url) return null;
    const clean = String(url).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('data:') || clean.startsWith('blob:')) return clean;
    const apiBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
    return `${apiBase}${clean.startsWith('/') ? '' : '/'}${clean}`;
  };

  const finalUrl = resolveDocUrl(documentUrl);

  const isPdf = Boolean(
    finalUrl && (
      /\.pdf($|\?)/i.test(finalUrl) ||
      finalUrl.startsWith('data:application/pdf') ||
      finalUrl.includes('application/pdf')
    )
  );

  const isExplicitImage = Boolean(
    finalUrl && (
      /\.(png|jpe?g|webp|gif|svg|bmp)($|\?)/i.test(finalUrl) ||
      finalUrl.startsWith('data:image/')
    )
  );

  const shouldRenderImage = (isExplicitImage || !isPdf) && !imageError;

  // Pulse animation for the skeleton placeholder while loading
  useEffect(() => {
    let anim;
    if (imageLoading && visible) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 750,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 750,
            useNativeDriver: false,
          }),
        ])
      );
      anim.start();
    }
    return () => anim && anim.stop();
  }, [imageLoading, visible]);

  // Pre-decode and load image smoothly without layout jump or white flash
  useEffect(() => {
    if (visible && finalUrl) {
      setImageLoading(true);
      setImageError(false);
      setZoomScale(1);
      fadeAnim.setValue(0);

      if (shouldRenderImage) {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Image) {
          const preImg = new window.Image();
          preImg.src = finalUrl;
          preImg.onload = () => {
            setImageLoading(false);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 320,
              useNativeDriver: false,
            }).start();
          };
          preImg.onerror = () => {
            setImageLoading(false);
            setImageError(true);
          };
        } else {
          Image.prefetch(finalUrl)
            .then(() => {
              setImageLoading(false);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
              }).start();
            })
            .catch(() => {
              // fallback to native Image onLoad
              setImageLoading(false);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 320,
                useNativeDriver: true,
              }).start();
            });
        }
      } else {
        setImageLoading(false);
      }
    }
  }, [visible, finalUrl, shouldRenderImage]);

  if (!visible) return null;

  const handleOpenExternal = () => {
    if (!finalUrl) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(finalUrl, '_blank');
    } else {
      Linking.openURL(finalUrl).catch(() => {});
    }
  };

  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.5, 3));
  const handleZoomOut = () => setZoomScale((s) => Math.max(s - 0.5, 1));
  const handleZoomReset = () => setZoomScale(1);

  const fileExt = finalUrl
    ? (finalUrl.split('.').pop() || '').split('?')[0].toUpperCase().slice(0, 4)
    : 'DOC';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, shadows.lg]}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.subtitle}>
                  {isPdf ? 'PDF Document' : isExplicitImage ? 'Image Attachment' : 'Supporting Documentation'}
                </Text>
              </View>
              {fileExt && fileExt.length <= 4 && (
                <View style={styles.extBadge}>
                  <Text style={styles.extBadgeText}>{fileExt}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleOpenExternal}
                accessibilityLabel="Open external"
                title="Open in new tab"
              >
                <ExternalLink size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Close"
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Body: Document Viewer inside the app */}
          <View style={styles.body}>
            {!finalUrl ? (
              <View style={styles.emptyContainer}>
                <FileText size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No document attached or accessible.</Text>
              </View>
            ) : shouldRenderImage ? (
              /* Inline Image Viewer with Flicker-Free Skeleton Loader */
              <View style={styles.imageViewerContainer}>
                {imageLoading ? (
                  /* Dedicated, Sleek Loading Screen to prevent flickering */
                  <View style={styles.loadingScreen}>
                    <View style={styles.loadingCenterCard}>
                      <View style={styles.spinnerWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                      </View>
                      <Text style={styles.loadingDocTitle}>Loading Document</Text>
                      <Text style={styles.loadingDocSubtitle}>Preparing high-resolution view...</Text>

                      {/* Animated Skeleton Document Preview */}
                      <View style={styles.skeletonDocumentCard}>
                        <Animated.View style={[styles.skeletonHeaderBar, { opacity: pulseAnim }]} />
                        <View style={styles.skeletonLinesGroup}>
                          <Animated.View style={[styles.skeletonLine, { width: '85%', opacity: pulseAnim }]} />
                          <Animated.View style={[styles.skeletonLine, { width: '92%', opacity: pulseAnim }]} />
                          <Animated.View style={[styles.skeletonLine, { width: '70%', opacity: pulseAnim }]} />
                          <Animated.View style={[styles.skeletonLine, { width: '80%', opacity: pulseAnim }]} />
                          <Animated.View style={[styles.skeletonLine, { width: '55%', opacity: pulseAnim }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Animated Image View — Fades in seamlessly once fully decoded */}
                <Animated.View
                  style={[
                    styles.animatedImageWrapper,
                    {
                      opacity: fadeAnim,
                      display: imageLoading ? 'none' : 'flex',
                    },
                  ]}
                >
                  <ScrollView
                    style={styles.imageScroll}
                    contentContainerStyle={styles.imageScrollContent}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                  >
                    <Image
                      source={{ uri: finalUrl }}
                      style={[
                        styles.image,
                        {
                          transform: [{ scale: zoomScale }],
                        },
                      ]}
                      resizeMode="contain"
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  </ScrollView>

                  {/* Image Zoom Toolbar — only appears once loaded */}
                  <View style={styles.zoomToolbar}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} disabled={zoomScale <= 1}>
                      <ZoomOut size={16} color={zoomScale <= 1 ? colors.textMuted : '#fff'} />
                    </TouchableOpacity>
                    <Text style={styles.zoomText}>{Math.round(zoomScale * 100)}%</Text>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} disabled={zoomScale >= 3}>
                      <ZoomIn size={16} color={zoomScale >= 3 ? colors.textMuted : '#fff'} />
                    </TouchableOpacity>
                    {zoomScale > 1 && (
                      <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomReset}>
                        <RotateCcw size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              </View>
            ) : isPdf && Platform.OS === 'web' ? (
              /* Inline PDF Viewer via Web IFrame */
              <View style={styles.iframeContainer}>
                <iframe
                  src={finalUrl}
                  title={title}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 480,
                    border: 'none',
                    borderRadius: radius.md,
                    backgroundColor: '#0f172a',
                  }}
                />
              </View>
            ) : (
              /* Fallback Document Card for other types / Native PDF */
              <View style={styles.docPlaceholder}>
                <View style={styles.docPlaceholderIconWrap}>
                  <FileText size={48} color={colors.primary} />
                </View>
                <Text style={styles.docName} numberOfLines={2}>{title}</Text>
                <Text style={styles.docSub}>
                  {isPdf ? 'PDF Document' : 'Document File'}
                </Text>
                <TouchableOpacity style={styles.viewDocBtn} onPress={handleOpenExternal} activeOpacity={0.8}>
                  <ExternalLink size={16} color="#fff" />
                  <Text style={styles.viewDocText}>Open In System Viewer</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  modalCard: {
    width: '95%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  subtitle: {
    ...typography.xs,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  extBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  extBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  body: {
    minHeight: 320,
    maxHeight: 560,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  imageViewerContainer: {
    width: '100%',
    height: 480,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d16',
    zIndex: 10,
  },
  loadingCenterCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    maxWidth: 360,
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  loadingDocTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  loadingDocSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  skeletonDocumentCard: {
    width: '100%',
    padding: 18,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  skeletonHeaderBar: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
    marginBottom: 14,
  },
  skeletonLinesGroup: {
    gap: 8,
  },
  skeletonLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  animatedImageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 13, 22, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: spacing.xs,
  },
  loadingText: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  imageScroll: {
    width: '100%',
    height: '100%',
  },
  imageScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: spacing.sm,
  },
  image: {
    width: '100%',
    height: 440,
    borderRadius: radius.md,
  },
  zoomToolbar: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  zoomBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    minWidth: 36,
    textAlign: 'center',
  },
  iframeContainer: {
    width: '100%',
    height: 500,
  },
  docPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  docPlaceholderIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  docName: {
    ...typography.base,
    ...typography.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    maxWidth: 320,
  },
  docSub: {
    ...typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  viewDocText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
});

export default DocumentViewerModal;


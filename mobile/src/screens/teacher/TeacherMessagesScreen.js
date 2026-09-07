import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageSquare,
  Send,
  User,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

/**
 * Format timestamp into exact web format: "Aug 1 at 06:30 PM"
 */
const formatMsgDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${month} ${day} at ${time}`;
  } catch {
    return 'Recently';
  }
};

const TeacherMessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768; // Tablet / Web 2-column view

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/teacher/messages');
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, []);

  const teacherId = user?.id || user?._id;

  // Group conversations by Parent ID and calculate unread counts dynamically
  const parentMap = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      const isParentSender = m.sender_role === 'parent';
      const parentId = isParentSender ? m.sender_id : m.receiver_id;
      const parentName = isParentSender ? m.sender_name : m.receiver_name;
      if (!parentId) return;

      if (!map[parentId]) {
        map[parentId] = {
          parentId,
          parentName: parentName || 'Parent',
          studentName: m.student_name || 'Student',
          studentId: m.student_id || null,
          messages: [],
          lastMessage: m.message,
          lastDate: m.created_at,
          unreadCount: 0,
        };
      }
      map[parentId].messages.push(m);
      map[parentId].lastMessage = m.message;
      map[parentId].lastDate = m.created_at;

      if (m.student_name && map[parentId].studentName === 'Student') {
        map[parentId].studentName = m.student_name;
      }
      if (m.student_id && !map[parentId].studentId) {
        map[parentId].studentId = m.student_id;
      }

      // Check if this message is unread for the teacher
      const isIncoming = m.sender_role === 'parent' || (teacherId && String(m.receiver_id) === String(teacherId));
      const isUnread = isIncoming && (m.is_read === false || m.is_read === 0 || m.is_read === 'false' || !m.is_read);
      if (isUnread) {
        map[parentId].unreadCount += 1;
      }
    });
    return map;
  }, [messages, teacherId]);

  const conversationList = useMemo(() => Object.values(parentMap), [parentMap]);

  // Dynamic count of total unread messages across all parent inquiries
  const totalUnreadCount = useMemo(() => {
    return conversationList.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversationList]);

  // Mark messages from parent as read locally and persist to backend
  const markConversationAsRead = useCallback(async (parentId) => {
    if (!parentId) return;

    // 1. Instantly update local state so badge responds with 0 delay
    setMessages((prev) =>
      prev.map((m) => {
        const isFromThisParent =
          (m.sender_role === 'parent' && String(m.sender_id) === String(parentId)) ||
          (String(m.receiver_id) === String(teacherId) && String(m.sender_id) === String(parentId));
        if (isFromThisParent && !m.is_read) {
          return { ...m, is_read: true };
        }
        return m;
      })
    );

    // 2. Persist to backend
    try {
      await api.put(`/teacher/messages/read/${parentId}`);
    } catch (e) {
      console.warn('Failed to mark messages as read on server:', e);
    }
  }, [teacherId]);

  const handleSelectParent = (parentId) => {
    setSelectedParentId(parentId);
    markConversationAsRead(parentId);
  };

  // Auto-select first conversation on wide screens if none selected
  useEffect(() => {
    if (isWide && conversationList.length > 0 && !selectedParentId) {
      setSelectedParentId(conversationList[0].parentId);
      markConversationAsRead(conversationList[0].parentId);
    }
  }, [isWide, conversationList, selectedParentId, markConversationAsRead]);

  const activeConversation = selectedParentId
    ? parentMap[selectedParentId]
    : isWide && conversationList.length > 0
    ? conversationList[0]
    : null;

  // Search filtering
  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversationList;
    return conversationList.filter(
      (c) =>
        c.parentName?.toLowerCase().includes(q) ||
        c.studentName?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversationList, search]);

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConversation) return;
    setSending(true);
    try {
      await api.post('/teacher/messages/reply', {
        receiverId: activeConversation.parentId,
        studentId: activeConversation.studentId || null,
        subject: 'Teacher Response',
        message: replyText.trim(),
      });
      setReplyText('');
      await fetchMessages();
    } catch (err) {
      console.error('Error sending teacher reply:', err);
      Alert.alert('Send Error', err.response?.data?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     1. PARENT INQUIRIES LIST SUB-TREE
     ───────────────────────────────────────────────────────────── */
  const renderInquiriesList = (fullWidth = false) => (
    <View style={[styles.inquiriesContainer, fullWidth && { width: '100%', flex: 1 }]}>
      <View style={styles.inquiriesHeaderRow}>
        <Text style={styles.inquiriesSectionTitle}>PARENT INQUIRIES</Text>
        <View
          style={[
            styles.inquiriesBadge,
            totalUnreadCount > 0 ? styles.inquiriesBadgeUnread : styles.inquiriesBadgeZero,
          ]}
        >
          <Text
            style={[
              styles.inquiriesBadgeText,
              totalUnreadCount > 0 ? styles.inquiriesBadgeTextUnread : styles.inquiriesBadgeTextZero,
            ]}
          >
            {totalUnreadCount}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parents or students..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={{ padding: spacing.sm }}>
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} style={{ marginBottom: spacing.sm, height: 74 }} />
          ))}
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyInquiries}>
          <MessageSquare size={36} color={colors.textMuted} />
          <Text style={styles.emptyInquiriesTitle}>No parent messages</Text>
          <Text style={styles.emptyInquiriesSub}>Parent inquiries will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => String(item.parentId)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          renderItem={({ item }) => {
            const isSelected = String(activeConversation?.parentId) === String(item.parentId);
            return (
              <TouchableOpacity
                style={[
                  styles.inquiryCard,
                  isSelected && styles.inquiryCardActive,
                ]}
                onPress={() => handleSelectParent(item.parentId)}
                activeOpacity={0.75}
              >
                <View style={styles.inquiryCardHeader}>
                  <View style={styles.inquiryHeaderLeft}>
                    <Text style={[styles.inquiryParentName, isSelected && { color: '#fff' }]}>
                      {item.parentName}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.cardUnreadBadge}>
                        <Text style={styles.cardUnreadBadgeText}>{item.unreadCount} new</Text>
                      </View>
                    )}
                  </View>
                  {item.lastDate && (
                    <Text style={styles.inquiryDate}>
                      {new Date(item.lastDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>

                <Text style={styles.inquiryChildTag}>
                  Child: {item.studentName}
                </Text>

                {item.lastMessage && (
                  <Text style={styles.inquirySnippet} numberOfLines={1} ellipsizeMode="tail">
                    {item.lastMessage}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  /* ─────────────────────────────────────────────────────────────
     2. CHAT THREAD VIEW SUB-TREE
     ───────────────────────────────────────────────────────────── */
  const renderChatThread = (showBackButton = false) => {
    if (!activeConversation) {
      return (
        <View style={styles.emptyThreadContainer}>
          <MessageSquare size={44} color={colors.textMuted} />
          <Text style={styles.emptyThreadText}>
            Select a parent conversation from the left to view messages.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chatThreadContainer}>
        {/* Chat Thread Header */}
        <View style={styles.chatHeader}>
          {showBackButton && (
            <TouchableOpacity
              onPress={() => setSelectedParentId(null)}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityLabel="Back to inquiries list"
            >
              <ChevronLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.chatHeaderName}>{activeConversation.parentName}</Text>
            <Text style={styles.chatHeaderSub}>
              Parent of: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{activeConversation.studentName}</Text>
            </Text>
          </View>
        </View>

        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={activeConversation.messages}
          keyExtractor={(m, i) => m.id?.toString() || i.toString()}
          contentContainerStyle={styles.messagesListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item: msg }) => {
            const isTeacher = msg.sender_role === 'teacher' || msg.sender_id === user?.id;
            const senderDisplayName = isTeacher
              ? msg.sender_name || user?.name || 'Jane Teacher'
              : msg.sender_name || activeConversation.parentName;

            return (
              <View
                style={[
                  styles.msgWrapper,
                  isTeacher ? styles.msgWrapperRight : styles.msgWrapperLeft,
                ]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    isTeacher ? styles.msgBubbleTeacher : styles.msgBubbleParent,
                  ]}
                >
                  <View style={styles.msgTopRow}>
                    <Text style={styles.msgSenderLabel}>{senderDisplayName}</Text>
                    <Text style={styles.msgTimestamp}>{formatMsgDate(msg.created_at)}</Text>
                  </View>
                  <Text style={styles.msgBodyText}>{msg.message}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Reply Input Bar */}
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${activeConversation.parentName}...`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!replyText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Send size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.sendBtnText}>Send Reply</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ─────────────────────────────────────────────────────────────
     3. MAIN RESPONSIVE RENDER
     ───────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sleek Header */}
      <Header
        title="Parent Communication"
        subtitle="Educator Overview"
        navigation={navigation}
      />

      {/* Top Banner Matching Web Screenshot */}
      <View style={styles.topBanner}>
        <View style={styles.bannerTitleRow}>
          <View style={styles.bannerIconBox}>
            <MessageSquare size={20} color="#8b5cf6" />
          </View>
          <Text style={styles.bannerTitle}>Parent Communication & Inbox</Text>
        </View>
        <Text style={styles.bannerSubtitle}>
          Receive inquiries from parents, view child details, and send direct responses.
        </Text>
      </View>

      {/* Responsive Viewport */}
      {isWide ? (
        /* Tablet / Desktop Split Grid View (Exact match to web screenshot) */
        <View style={styles.splitGrid}>
          <View style={styles.sidebarColumn}>{renderInquiriesList(false)}</View>
          <View style={styles.chatColumn}>{renderChatThread(false)}</View>
        </View>
      ) : (
        /* Mobile Portrait View (Responsive flow) */
        selectedParentId ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
          >
            {renderChatThread(true)}
          </KeyboardAvoidingView>
        ) : (
          renderInquiriesList(true)
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0f17',
  },

  /* Top Banner */
  topBanner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },

  /* Wide Split Grid */
  splitGrid: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sidebarColumn: {
    width: 290,
    height: '100%',
  },
  chatColumn: {
    flex: 1,
    height: '100%',
  },

  /* Inquiries List (Left Panel / Mobile Screen 1) */
  inquiriesContainer: {
    backgroundColor: '#141824',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
  },
  inquiriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  inquiriesSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  inquiriesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquiriesBadgeUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
  },
  inquiriesBadgeZero: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inquiriesBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inquiriesBadgeTextUnread: {
    color: '#c4b5fd',
  },
  inquiriesBadgeTextZero: {
    color: colors.textMuted,
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f2e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    padding: 0,
  },

  /* Inquiry Card */
  inquiryCard: {
    backgroundColor: '#181d2a',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  inquiryCardActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8b5cf6',
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  inquiryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardUnreadBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  cardUnreadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  inquiryParentName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inquiryDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  inquiryChildTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  inquirySnippet: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },

  /* Empty Inquiries */
  emptyInquiries: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyInquiriesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyInquiriesSub: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Chat Thread Container (Right Panel / Mobile Screen 2) */
  chatThreadContainer: {
    flex: 1,
    backgroundColor: '#141824',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  backBtn: {
    paddingRight: 10,
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chatHeaderSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* Message Stream */
  messagesListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
  },
  msgWrapper: {
    width: '100%',
    flexDirection: 'row',
  },
  msgWrapperLeft: {
    justifyContent: 'flex-start',
  },
  msgWrapperRight: {
    justifyContent: 'flex-end',
  },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  msgBubbleParent: {
    backgroundColor: '#191f2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 3,
  },
  msgBubbleTeacher: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    borderBottomRightRadius: 3,
  },
  msgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  msgSenderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  msgTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  msgBodyText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },

  /* Empty Thread */
  emptyThreadContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141824',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyThreadText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },

  /* Reply Bar */
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#141824',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#1a1f2e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxHeight: 90,
  },
  sendBtn: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TeacherMessagesScreen;

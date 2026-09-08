import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageSquare, Send, BookOpen, User, UserCheck,
  CheckCircle, Clock, ChevronRight
} from 'lucide-react-native';
import Header from '../../components/Header';
import ChildSwitcher from '../../components/ChildSwitcher';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentMessagesScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route?.params?.studentId || null);

  const [messages, setMessages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);

  const fetchChildren = async () => {
    try {
      const { data } = await api.get('/parent/children');
      const kids = Array.isArray(data) ? data : [];
      setChildren(kids);
      if (!selectedChildId && kids.length > 0) {
        setSelectedChildId(String(route?.params?.studentId || kids[0].id || kids[0].studentId));
      }
    } catch (err) {
      console.error('Fetch children error in messages:', err);
    }
  };

  const fetchMessages = async (childId = selectedChildId) => {
    setLoading(true);
    try {
      const url = childId
        ? `/parent/messages?studentId=${childId}`
        : '/parent/messages';
      const { data } = await api.get(url);
      setMessages(data.messages || []);
      const fetchedTeachers = data.teachers || [];
      setTeachers(fetchedTeachers);

      if (fetchedTeachers.length > 0) {
        const stillValid = fetchedTeachers.find(t => String(t.id) === String(selectedTeacherId));
        const autoId = stillValid ? String(selectedTeacherId) : String(fetchedTeachers[0].id);
        setSelectedTeacherId(autoId);
        const readUrl = childId
          ? `/parent/messages/read/${autoId}?studentId=${childId}`
          : `/parent/messages/read/${autoId}`;
        api.put(readUrl).catch(() => {});
      } else {
        setSelectedTeacherId(null);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchMessages(selectedChildId);
    } else {
      fetchMessages();
    }
  }, [selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
    fetchMessages(selectedChildId);
  }, [selectedChildId]);

  const handleSelectTeacher = async (teacherId) => {
    const id = String(teacherId);
    setSelectedTeacherId(id);

    // Optimistically mark read in local state for this child
    setMessages(prev => prev.map(m => {
      const isForChild = !selectedChildId || !m.student_id || String(m.student_id) === String(selectedChildId);
      return (String(m.sender_id) === id && isForChild) ? { ...m, is_read: true } : m;
    }));

    try {
      const url = selectedChildId
        ? `/parent/messages/read/${id}?studentId=${selectedChildId}`
        : `/parent/messages/read/${id}`;
      await api.put(url);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTeacherId) return;
    setSending(true);
    try {
      await api.post('/parent/messages', {
        receiverId: selectedTeacherId,
        studentId: selectedChildId,
        subject: 'Parent Inquiry',
        message: newMessage.trim(),
      });
      setNewMessage('');
      fetchMessages(selectedChildId);
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading && !refreshing) return <FullPageLoader message="Loading teacher communication..." />;

  const activeTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

  // Filter messages for active teacher conversation AND selected child
  const currentChat = messages.filter(m => {
    const matchesTeacher = String(m.sender_id) === String(selectedTeacherId) || String(m.receiver_id) === String(selectedTeacherId);
    const matchesChild = !selectedChildId || !m.student_id || String(m.student_id) === String(selectedChildId);
    return matchesTeacher && matchesChild;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Sender detection: is it sent by the parent?
  const teacherIds = teachers.map(t => String(t.id));
  const isSentByParent = (msg) => !teacherIds.includes(String(msg.sender_id));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Teacher Communication"
        subtitle="Direct messaging with subject teachers"
        navigation={navigation}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryLight}
            />
          }
        >
          {/* Child Switcher Component */}
          {children.length > 0 && (
            <ChildSwitcher
              childrenList={children}
              selectedChildId={selectedChildId}
              onSelectChild={(id) => setSelectedChildId(id)}
            />
          )}

          {teachers.length === 0 ? (
            <View style={[styles.emptyCard, shadows.sm]}>
              <UserCheck size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Teachers Allocated</Text>
              <Text style={styles.emptySub}>
                Subject teacher allocations have not been recorded for this student yet.
              </Text>
            </View>
          ) : (
            <>
              {/* Teacher Selector Carousel */}
              <View style={styles.teachersSection}>
                <Text style={styles.sectionHeader}>Subject Teachers</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.teachersRow}
                >
                  {teachers.map((t) => {
                    const isActive = String(t.id) === String(selectedTeacherId);
                    const unreadCount = messages.filter(
                      m => String(m.sender_id) === String(t.id) &&
                           !m.is_read &&
                           (!selectedChildId || !m.student_id || String(m.student_id) === String(selectedChildId))
                    ).length;

                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.teacherChip,
                          isActive && styles.teacherChipActive,
                          shadows.sm
                        ]}
                        onPress={() => handleSelectTeacher(t.id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={isActive ? (colors.gradientPrimary || ['#6366f1', '#8b5cf6']) : ['#334155', '#475569']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.teacherAvatar}
                        >
                          <Text style={styles.teacherAvatarText}>
                            {(t.name || 'T').charAt(0).toUpperCase()}
                          </Text>
                        </LinearGradient>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.teacherName, isActive && { color: colors.primaryLight }]}
                            numberOfLines={1}
                          >
                            {t.name}
                          </Text>
                          <Text style={styles.teacherSubject} numberOfLines={1}>
                            {t.subjects || 'Subject Teacher'}
                          </Text>
                        </View>

                        {unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Active Conversation Thread */}
              <View style={[styles.chatBox, shadows.sm]}>
                {/* Active Teacher Banner */}
                {activeTeacher && (
                  <View style={styles.chatHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.onlineDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activeTeacherName}>{activeTeacher.name}</Text>
                        <Text style={styles.activeTeacherSub} numberOfLines={1}>{activeTeacher.subjects || 'Faculty'}</Text>
                      </View>
                    </View>
                    {selectedChildId && (
                      <View style={styles.childBadgePill}>
                        <UserCheck size={11} color={colors.primaryLight} />
                        <Text style={styles.childBadgeText} numberOfLines={1}>
                          {children.find(c => String(c.id || c.studentId) === String(selectedChildId))?.name || 'Child'} Thread
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Messages List */}
                <View style={styles.messagesStream}>
                  {currentChat.length === 0 ? (
                    <View style={styles.emptyChatContainer}>
                      <MessageSquare size={36} color={colors.textMuted} />
                      <Text style={styles.emptyChatText}>
                        No messages exchanged yet with {activeTeacher?.name || 'this teacher'} for this child.
                      </Text>
                      <Text style={styles.emptyChatSub}>
                        Send a message below to initiate communication.
                      </Text>
                    </View>
                  ) : (
                    currentChat.map((msg, idx) => {
                      const own = isSentByParent(msg);
                      const timeStr = msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '';

                      if (own) {
                        return (
                          <View key={msg.id || idx} style={styles.ownMsgRow}>
                            <LinearGradient
                              colors={colors.gradientPrimary || ['#6366f1', '#8b5cf6']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.ownMsgBubble}
                            >
                              <Text style={styles.ownMsgText}>{msg.message}</Text>
                              <Text style={styles.ownMsgTime}>{timeStr}</Text>
                            </LinearGradient>
                          </View>
                        );
                      }

                      return (
                        <View key={msg.id || idx} style={styles.teacherMsgRow}>
                          <View style={styles.teacherMsgBubble}>
                            <Text style={styles.teacherMsgSender}>{activeTeacher?.name || 'Teacher'}</Text>
                            <Text style={styles.teacherMsgText}>{msg.message}</Text>
                            <Text style={styles.teacherMsgTime}>{timeStr}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}

          <View style={{ height: spacing.lg }} />
        </ScrollView>

        {/* Bottom Message Input Bar */}
        {teachers.length > 0 && selectedTeacherId && (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder={`Message ${activeTeacher?.name || 'teacher'}...`}
              placeholderTextColor={colors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!newMessage.trim() || sending) && { opacity: 0.5 }
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    padding: spacing.md,
  },
  teachersSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  teachersRow: {
    gap: 8,
    paddingBottom: 4,
  },
  teacherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 170,
    maxWidth: 220,
  },
  teacherChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  teacherAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  teacherSubject: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  unreadBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  chatBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 320,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  childBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '45%',
  },
  childBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeTeacherName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  activeTeacherSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  messagesStream: {
    padding: spacing.md,
    gap: 12,
  },
  ownMsgRow: {
    alignItems: 'flex-end',
  },
  ownMsgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderBottomRightRadius: 2,
  },
  ownMsgText: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18,
  },
  ownMsgTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginTop: 4,
  },
  teacherMsgRow: {
    alignItems: 'flex-start',
  },
  teacherMsgBubble: {
    maxWidth: '80%',
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teacherMsgSender: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryLight,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  teacherMsgText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  teacherMsgTime: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyChatContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  emptyChatText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyChatSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    maxHeight: 90,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ParentMessagesScreen;

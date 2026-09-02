import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Send, X, ChevronRight } from 'lucide-react-native';
import Header from '../../components/Header';
import { FullPageLoader } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ParentMessagesScreen = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ messages: [], teachers: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [viewThread, setViewThread] = useState(null); // teacher to view thread with

  const fetchMessages = async () => {
    try {
      const { data: res } = await api.get('/parent/messages');
      setData(res || { messages: [], teachers: [] });
    } catch (err) {
      console.error('Messages fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchMessages(); }, []);

  const handleSend = async () => {
    if (!selectedTeacher) { Alert.alert('Select Teacher', 'Please select a teacher to message.'); return; }
    if (!form.message.trim()) { Alert.alert('Empty Message', 'Please type a message.'); return; }
    setSending(true);
    try {
      await api.post('/parent/messages', {
        receiverId: selectedTeacher.id,
        subject: form.subject || 'General Inquiry',
        message: form.message,
      });
      setShowCompose(false);
      setForm({ subject: '', message: '' });
      setSelectedTeacher(null);
      Alert.alert('✅ Sent', 'Your message has been sent.');
      fetchMessages();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const markRead = async (teacherId) => {
    try { await api.put(`/parent/messages/read/${teacherId}`); } catch { }
  };

  if (loading) return <FullPageLoader message="Loading messages..." />;

  const messages = data.messages || [];
  const teachers = data.teachers || [];
  const parentId = user?.id || user?._id;

  // Group messages by teacher conversation partner
  const conversationMap = {};
  messages.forEach(m => {
    const partnerId = m.sender_id === parentId ? m.receiver_id : m.sender_id;
    const partnerName = m.sender_id === parentId ? m.receiver_name : m.sender_name;
    if (!conversationMap[partnerId]) {
      conversationMap[partnerId] = { partnerId, partnerName, messages: [], unreadCount: 0 };
    }
    conversationMap[partnerId].messages.push(m);
    if (!m.is_read && m.receiver_id === parentId) conversationMap[partnerId].unreadCount++;
  });
  const conversations = Object.values(conversationMap).sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.created_at || 0;
    const bLast = b.messages[b.messages.length - 1]?.created_at || 0;
    return new Date(bLast) - new Date(aLast);
  });

  // Thread messages for selected teacher
  const threadMessages = viewThread
    ? messages.filter(m =>
        (m.sender_id === parentId && m.receiver_id === viewThread.partnerId) ||
        (m.receiver_id === parentId && m.sender_id === viewThread.partnerId)
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={viewThread ? viewThread.partnerName : 'Messages'}
        subtitle={viewThread ? 'Teacher' : `${conversations.length} conversations`}
        rightAction={
          !viewThread ? (
            <TouchableOpacity style={styles.composeBtn} onPress={() => setShowCompose(true)}>
              <MessageSquare size={18} color={colors.parent} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.composeBtn} onPress={() => setViewThread(null)}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )
        }
        showLogout={false}
      />

      {!viewThread ? (
        // Conversation list
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partnerId?.toString()}
          renderItem={({ item }) => {
            const lastMsg = item.messages[item.messages.length - 1];
            return (
              <TouchableOpacity
                style={[styles.convCard, shadows.sm]}
                onPress={() => { setViewThread(item); markRead(item.partnerId); }}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, { backgroundColor: colors.parent + '22' }]}>
                  <MessageSquare size={20} color={colors.parent} />
                </View>
                <View style={styles.convInfo}>
                  <Text style={styles.convName}>{item.partnerName}</Text>
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {lastMsg?.message || '—'}
                  </Text>
                </View>
                <View style={styles.convRight}>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                  <ChevronRight size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.parent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageSquare size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <TouchableOpacity style={styles.composeEmptyBtn} onPress={() => setShowCompose(true)}>
                <Text style={styles.composeEmptyText}>Send First Message</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        // Thread view
        <ScrollView contentContainerStyle={styles.threadContent}>
          {threadMessages.map((msg, i) => {
            const isMine = msg.sender_id === parentId;
            return (
              <View key={i} style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                {msg.subject && !isMine && <Text style={styles.bubbleSubject}>{msg.subject}</Text>}
                <Text style={[styles.bubbleText, { color: isMine ? '#fff' : colors.textPrimary }]}>{msg.message}</Text>
                <Text style={[styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
            );
          })}

          {/* Quick reply */}
          <View style={styles.replyRow}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type a reply..."
              placeholderTextColor={colors.textMuted}
              value={form.message}
              onChangeText={v => setForm(f => ({ ...f, message: v }))}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!form.message.trim() || sending) && { opacity: 0.5 }]}
              onPress={() => {
                setSelectedTeacher({ id: viewThread.partnerId });
                handleSend();
              }}
              disabled={!form.message.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Compose Modal */}
      <Modal visible={showCompose} transparent animationType="slide" onRequestClose={() => setShowCompose(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCompose(false)}>
          <ScrollView style={styles.sheet} onStartShouldSetResponder={() => true} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>New Message</Text>

            <Text style={styles.label}>To (Teacher) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherRow}>
              {teachers.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.teacherChip, selectedTeacher?.id === t.id && styles.teacherChipActive]}
                  onPress={() => setSelectedTeacher(t)}
                >
                  <Text style={[styles.teacherChipText, selectedTeacher?.id === t.id && { color: colors.parent }]}>
                    {t.name}
                  </Text>
                  {t.subjects && <Text style={styles.teacherSubjects}>{t.subjects}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Subject</Text>
            <TextInput style={styles.input} value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} placeholder="General Inquiry" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Message *</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.message} onChangeText={v => setForm(f => ({ ...f, message: v }))} placeholder="Type your message here..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />

            <TouchableOpacity style={[styles.sendModalBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendModalBtnText}>Send Message</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  composeBtn: { padding: spacing.sm, backgroundColor: colors.parent + '22', borderRadius: radius.md },
  list: { padding: spacing.md },
  convCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  convInfo: { flex: 1 },
  convName: { ...typography.base, ...typography.semibold, color: colors.textPrimary },
  convPreview: { ...typography.sm, color: colors.textMuted },
  convRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadBadge: { backgroundColor: colors.parent, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.base, color: colors.textMuted },
  composeEmptyBtn: { backgroundColor: colors.parent + '22', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  composeEmptyText: { color: colors.parent, ...typography.sm, ...typography.semibold },
  // Thread
  threadContent: { padding: spacing.md, paddingBottom: spacing.xl },
  bubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: radius.lg, marginBottom: spacing.sm },
  myBubble: { backgroundColor: colors.parent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.bgCard, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleSubject: { ...typography.xs, color: colors.textMuted, marginBottom: 3 },
  bubbleText: { ...typography.sm },
  bubbleTime: { ...typography.xs, marginTop: 4, textAlign: 'right' },
  replyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-end' },
  replyInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.sm, paddingHorizontal: spacing.md, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.parent, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  // Compose Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.xl, ...typography.bold, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  teacherRow: { marginBottom: spacing.md },
  teacherChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, minWidth: 100 },
  teacherChipActive: { borderColor: colors.parent, backgroundColor: colors.parent + '22' },
  teacherChipText: { ...typography.sm, color: colors.textSecondary, fontWeight: '600' },
  teacherSubjects: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md },
  textarea: { height: 100, textAlignVertical: 'top' },
  sendModalBtn: { backgroundColor: colors.parent, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  sendModalBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default ParentMessagesScreen;

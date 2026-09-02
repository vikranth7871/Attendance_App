import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageSquare, Send, User, ChevronLeft, Search, Check,
  Clock, Sparkles
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const TeacherMessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
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

  useEffect(() => { fetchMessages(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchMessages(); }, []);

  // Group messages by parent
  const conversations = React.useMemo(() => {
    const map = {};
    messages.forEach(m => {
      const isMe = m.sender_id === user?.id;
      const partnerId = isMe ? m.receiver_id : m.sender_id;
      const partnerName = isMe ? m.receiver_name : m.sender_name;
      if (!map[partnerId]) {
        map[partnerId] = {
          partnerId,
          partnerName: partnerName || 'Parent',
          studentName: m.student_name,
          lastMessage: m.message,
          lastDate: m.created_at,
          messages: [],
        };
      }
      map[partnerId].messages.push(m);
      map[partnerId].lastMessage = m.message;
      map[partnerId].lastDate = m.created_at;
    });
    return Object.values(map);
  }, [messages, user]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedParent) return;
    setSending(true);
    try {
      const activeConvo = conversations.find(c => c.partnerId === selectedParent.partnerId);
      const studentId = activeConvo?.messages[0]?.student_id || null;

      await api.post('/teacher/messages/reply', {
        receiverId: selectedParent.partnerId,
        studentId,
        subject: 'Reply from Teacher',
        message: replyText.trim(),
      });
      setReplyText('');
      fetchMessages();
    } catch (err) {
      Alert.alert('Send Error', err.response?.data?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.partnerName?.toLowerCase().includes(q) ||
      c.studentName?.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q);
  });

  /* ── Thread View ── */
  if (selectedParent) {
    const activeConvo = conversations.find(c => c.partnerId === selectedParent.partnerId);
    const threadMessages = activeConvo?.messages || [];

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Thread Header */}
        <View style={styles.threadHeader}>
          <TouchableOpacity onPress={() => setSelectedParent(null)} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.threadPartnerInfo}>
            <Text style={styles.threadPartnerName}>{selectedParent.partnerName}</Text>
            {activeConvo?.studentName && (
              <Text style={styles.threadStudentTag}>Parent of {activeConvo.studentName}</Text>
            )}
          </View>
        </View>

        {/* Message bubbles */}
        <FlatList
          ref={flatListRef}
          data={threadMessages}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            return (
              <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  {item.subject && item.subject !== 'Reply from Teacher' && (
                    <Text style={[styles.bubbleSubject, isMe && { color: 'rgba(255,255,255,0.85)' }]}>
                      {item.subject}
                    </Text>
                  )}
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextRight]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeRight]}>
                    {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.threadList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Reply Input Bar */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Message ${selectedParent.partnerName}...`}
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!replyText.trim() || sending) && { opacity: 0.5 }]}
              onPress={handleSendReply}
              disabled={!replyText.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ── Conversation List View ── */
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Parent Communications"
        subtitle={`${conversations.length} active conversations`}
        navigation={navigation}
      />

      {/* Search Row */}
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parents or students..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} style={{ marginBottom: spacing.sm }} />)}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.partnerId?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.convoCard, shadows.sm]}
              onPress={() => setSelectedParent(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.avatar, { backgroundColor: colors.parent + '22' }]}>
                <User size={22} color={colors.parent} />
              </View>
              <View style={styles.convoInfo}>
                <View style={styles.convoTop}>
                  <Text style={styles.convoName}>{item.partnerName}</Text>
                  <Text style={styles.convoTime}>
                    {item.lastDate ? new Date(item.lastDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                  </Text>
                </View>
                {item.studentName && (
                  <Text style={styles.convoStudent}>Parent of {item.studentName}</Text>
                )}
                <Text style={styles.convoSnippet} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teacher} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageSquare size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySub}>Messages from parents will appear here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, ...typography.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  convoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  convoInfo: { flex: 1 },
  convoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convoName: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  convoTime: { ...typography.xs, color: colors.textMuted },
  convoStudent: { ...typography.xs, color: colors.parent, fontWeight: '600', marginBottom: 2 },
  convoSnippet: { ...typography.xs, color: colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.base, ...typography.semibold, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textMuted },
  // Thread
  threadHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { paddingRight: spacing.sm },
  threadPartnerInfo: { flex: 1 },
  threadPartnerName: { ...typography.base, ...typography.bold, color: colors.textPrimary },
  threadStudentTag: { ...typography.xs, color: colors.parent },
  threadList: { padding: spacing.md },
  bubbleWrap: { marginVertical: 4, flexDirection: 'row' },
  bubbleWrapLeft: { justifyContent: 'flex-start' },
  bubbleWrapRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', padding: spacing.md, borderRadius: radius.lg },
  bubbleLeft: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleRight: { backgroundColor: colors.teacher, borderBottomRightRadius: 4 },
  bubbleSubject: { ...typography.xs, ...typography.bold, color: colors.parent, marginBottom: 4 },
  bubbleText: { ...typography.sm, color: colors.textPrimary, lineHeight: 20 },
  bubbleTextRight: { color: '#fff' },
  bubbleTime: { ...typography.xs, color: colors.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.7)' },
  replyBar: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs },
  replyInput: { flex: 1, backgroundColor: colors.bgInput, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8, color: colors.textPrimary, ...typography.sm, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.teacher, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default TeacherMessagesScreen;

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Sparkles, X, Brain, Plus, Tag, Check, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/client';
import { colors, spacing, radius, typography, shadows } from '../styles/theme';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
const QUESTION_COUNTS = [5, 10, 15, 20];

const AIQuizGeneratorModal = ({ visible, onClose, onGenerated, defaultSubject = '' }) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [syllabus, setSyllabus] = useState('');
  const [difficulty, setDifficulty] = useState('mixed');
  const [count, setCount] = useState(10);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleGenerate = async () => {
    if (!subject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject or topic for the quiz.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/quiz/generate-ai', {
        subject: subject.trim(),
        syllabus: syllabus.trim(),
        difficulty,
        count,
        tags: JSON.stringify(tags),
      });

      const questions = Array.isArray(data) ? data : data.questions || [];
      if (questions.length > 0) {
        onGenerated({
          title: `${subject} Quiz`,
          subject,
          difficulty,
          questions,
          tags,
        });
        onClose();
        Alert.alert('✨ AI Quiz Generated', `Generated ${questions.length} questions successfully!`);
      } else {
        Alert.alert('Generation Notice', 'No questions were returned. Please try with more specific topic details.');
      }
    } catch (err) {
      console.error('AI quiz generation error:', err);
      Alert.alert('AI Error', err.response?.data?.message || 'Could not generate AI questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>AI Quiz Generator</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Subject Input */}
            <Text style={styles.label}>Subject / Core Topic *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Data Structures & Algorithms, React Native"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            {/* Syllabus / Focus Prompt */}
            <Text style={styles.label}>Syllabus / Focus Areas (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Provide key topics or syllabus chapters to guide question generation..."
              placeholderTextColor={colors.textMuted}
              value={syllabus}
              onChangeText={setSyllabus}
              multiline
              numberOfLines={4}
            />

            {/* Difficulty Selector */}
            <Text style={styles.label}>Difficulty Level</Text>
            <View style={styles.pillRow}>
              {DIFFICULTIES.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.pill, difficulty === d && styles.pillActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.pillText, difficulty === d && styles.pillTextActive]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Question Count */}
            <Text style={styles.label}>Number of Questions</Text>
            <View style={styles.pillRow}>
              {QUESTION_COUNTS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, count === c && styles.pillActive]}
                  onPress={() => setCount(c)}
                >
                  <Text style={[styles.pillText, count === c && styles.pillTextActive]}>
                    {c} Questions
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags */}
            <Text style={styles.label}>Tags (Optional)</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add focus tag..."
                placeholderTextColor={colors.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((t, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{t}</Text>
                    <TouchableOpacity onPress={() => removeTag(t)}>
                      <X size={12} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateBtn, loading && { opacity: 0.6 }]}
              onPress={handleGenerate}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={colors.gradientPrimary} style={styles.generateBtnGradient}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.generateBtnText}>Generating Questions with AI...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Sparkles size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate with Gemini AI</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.lg, ...typography.bold, color: colors.textPrimary },
  closeBtn: { padding: 4 },
  content: { padding: spacing.md },
  label: { ...typography.sm, ...typography.semibold, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, ...typography.base, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.xs },
  textarea: { height: 90, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  pill: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  pillActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  pillText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  pillTextActive: { color: colors.primary },
  tagInputRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  addTagBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgElevated, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  tagBadgeText: { ...typography.xs, color: colors.textSecondary },
  generateBtn: { borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.md },
  generateBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generateBtnText: { ...typography.base, ...typography.bold, color: '#fff' },
});

export default AIQuizGeneratorModal;

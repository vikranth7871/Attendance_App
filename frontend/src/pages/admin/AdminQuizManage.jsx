import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Sparkles, Trash2, Edit, CheckCircle, XCircle, Eye, Loader2, Award, Brain, Trophy, Building } from 'lucide-react';
import axios from 'axios';
import AIQuizGeneratorModal from '../../components/shared/AIQuizGeneratorModal';
import QuizResultsModal from '../../components/shared/QuizResultsModal';
import QuizFormModal from '../../components/shared/QuizFormModal';
import { useAuth } from '../../context/AuthContext';

const AdminQuizManage = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quizTypeTab, setQuizTypeTab] = useState('practice'); // 'practice' or 'university'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [resultsQuiz, setResultsQuiz] = useState(null);

    const [editingQuiz, setEditingQuiz] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subjectId: '',
        type: 'practice',
        timeLimit: 30,
        passingScore: 80,
        difficulty: 'mixed',
        maxAttempts: 3,
        questions: []
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchQuizzes();
        fetchSubjects();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const { data } = await axios.get('/quiz/admin/manage');
            setQuizzes(data);
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data } = await axios.get('/admin/subjects');
            setSubjects(data);
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingQuiz(null);
        setFormData({ title: '', description: '', subjectId: '', type: quizTypeTab, timeLimit: 30, passingScore: 80, difficulty: 'mixed', maxAttempts: 3, questions: [] });
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (quiz) => {
        setEditingQuiz(quiz);
        setFormData({
            title: quiz.title || '',
            description: quiz.description || '',
            subjectId: quiz.subjectId?._id || quiz.subjectId?.id || quiz.subject_id || '',
            type: quiz.type || 'practice',
            timeLimit: quiz.timeLimit || quiz.time_limit || 30,
            passingScore: quiz.passingScore || quiz.passing_score || 80,
            difficulty: quiz.difficulty || 'mixed',
            maxAttempts: quiz.maxAttempts || quiz.max_attempts || 3,
            questions: quiz.questions || []
        });
        setIsCreateModalOpen(true);
    };

    const handleAIGenerated = (result) => {
        setEditingQuiz(null);
        setFormData(prev => ({
            ...prev,
            title: prev.title || result.title,
            type: quizTypeTab,
            questions: result.questions,
            difficulty: result.difficulty
        }));
        setIsCreateModalOpen(true);
    };

    const handleSaveQuiz = async (quizPayload) => {
        setSubmitting(true);
        try {
            if (editingQuiz) {
                await axios.put(`/quiz/${editingQuiz._id || editingQuiz.id}`, quizPayload);
            } else {
                await axios.post('/quiz/create', quizPayload);
            }
            setIsCreateModalOpen(false);
            setEditingQuiz(null);
            setFormData({ title: '', description: '', subjectId: '', type: 'practice', timeLimit: 30, passingScore: 80, difficulty: 'mixed', maxAttempts: 3, questions: [] });
            fetchQuizzes();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePublish = async (id) => {
        try {
            await axios.put(`/quiz/${id}/publish`);
            fetchQuizzes();
        } catch (error) {
            console.error('Failed to toggle publish status', error);
        }
    };

    const deleteQuiz = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quiz? All attempts will be lost.')) return;
        try {
            await axios.delete(`/quiz/${id}`);
            fetchQuizzes();
        } catch (error) {
            console.error('Failed to delete quiz', error);
        }
    };

    const filteredQuizzes = quizzes.filter(quiz => {
        if (quizTypeTab === 'practice') return quiz.type === 'practice' || !quiz.type;
        if (quizTypeTab === 'university') return quiz.type === 'university' || quiz.type === 'official';
        return true;
    });

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Subject Wise Quizzes</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage and generate quizzes for your institution.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setIsAIModalOpen(true)}
                        style={{
                            padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
                        }}
                    >
                        <Sparkles size={16} /> Generate with AI
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleOpenCreateModal}
                        style={{
                            padding: '0.75rem 1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Plus size={16} /> Manual Create
                    </motion.button>
                </div>
            </div>

            {/* Quiz Type Tab Pills */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                    display: 'inline-flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '0.25rem',
                    gap: '0.25rem'
                }}>
                    <button
                        onClick={() => setQuizTypeTab('practice')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 1.4rem',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: quizTypeTab === 'practice' ? 'var(--brand-primary)' : 'transparent',
                            color: quizTypeTab === 'practice' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: quizTypeTab === 'practice' ? '0 4px 14px rgba(91, 80, 230, 0.35)' : 'none'
                        }}
                    >
                        <Brain size={18} /> Practice Quizzes
                    </button>

                    <button
                        onClick={() => setQuizTypeTab('university')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 1.4rem',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: quizTypeTab === 'university' ? 'var(--brand-primary)' : 'transparent',
                            color: quizTypeTab === 'university' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: quizTypeTab === 'university' ? '0 4px 14px rgba(91, 80, 230, 0.35)' : 'none'
                        }}
                    >
                        <Trophy size={18} /> University Quizzes
                    </button>
                </div>
            </div>

            {/* Quizzes List */}
            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--brand-primary)', margin: '0 auto' }} />
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                        No {quizTypeTab === 'practice' ? 'Practice' : 'University'} quizzes created yet.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Use the AI generator or create one manually.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filteredQuizzes.map(quiz => (
                        <div key={quiz._id || quiz.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                            {/* Top Right Corner Quiz Type Badge */}
                            {quiz.type === 'university' || quiz.type === 'official' ? (
                                <div style={{
                                    position: 'absolute', top: 0, right: 0,
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: 'white', fontSize: '0.6rem', fontWeight: '800',
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    padding: '0.25rem 0.75rem', borderRadius: '0 16px 0 12px',
                                    display: 'flex', alignItems: 'center', gap: '3px', zIndex: 1
                                }}>
                                    <Building size={11} /> University
                                </div>
                            ) : (
                                <div style={{
                                    position: 'absolute', top: 0, right: 0,
                                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                    color: 'white', fontSize: '0.6rem', fontWeight: '800',
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    padding: '0.25rem 0.75rem', borderRadius: '0 16px 0 12px',
                                    display: 'flex', alignItems: 'center', gap: '3px', zIndex: 1
                                }}>
                                    <Brain size={11} /> Practice
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '0.35rem' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{quiz.title}</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-secondary)', background: 'rgba(139,92,246,0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: '600' }}>
                                        {quiz.subjectId?.subjectName || quiz.subjectName || 'General'}
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem 0.6rem', borderRadius: '999px',
                                    background: quiz.isPublished ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: quiz.isPublished ? '#10b981' : '#f59e0b'
                                }}>
                                    {quiz.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <span>{quiz.questionCount || quiz.questions?.length || 0} Questions</span>
                                <span>•</span>
                                <span>{quiz.totalAttempts || 0} Attempts</span>
                                <span>•</span>
                                <span>{quiz.difficulty || 'Mixed'}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button
                                    onClick={() => setResultsQuiz(quiz)}
                                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                >
                                    <Award size={14} /> Results
                                </button>
                                <button
                                    onClick={() => togglePublish(quiz._id || quiz.id)}
                                    style={{ padding: '0.5rem 0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}
                                >
                                    {quiz.isPublished ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                    onClick={() => handleOpenEditModal(quiz)}
                                    style={{ padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Edit Quiz Parameters & Questions"
                                >
                                    <Edit size={15} />
                                </button>
                                <button
                                    onClick={() => deleteQuiz(quiz._id || quiz.id)}
                                    style={{ padding: '0.5rem 0.65rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Delete Quiz"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* AI Generator Modal */}
            <AIQuizGeneratorModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onGenerated={handleAIGenerated}
                defaultSubject={subjects.length > 0 ? (subjects[0].subjectName || subjects[0].name) : 'General Knowledge'}
            />

            {/* Results/Leaderboard Modal */}
            <QuizResultsModal
                isOpen={!!resultsQuiz}
                onClose={() => setResultsQuiz(null)}
                quiz={resultsQuiz}
            />

            {/* Manual Create / Quiz Form Modal */}
            <QuizFormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveQuiz}
                initialData={formData}
                subjects={subjects}
                isTeacher={false}
            />
        </div>
    );
};

export default AdminQuizManage;

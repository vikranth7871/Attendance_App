import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, CheckCircle2, HelpCircle, BookOpen, Clock, Award, ShieldCheck, Sparkles } from 'lucide-react';

const QuizFormModal = ({ isOpen, onClose, onSave, initialData = {}, subjects = [], isTeacher = false }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subjectId: '',
        type: isTeacher ? 'practice' : 'university',
        timeLimit: 30,
        passingScore: 80,
        difficulty: 'mixed',
        maxAttempts: 1,
        questions: []
    });

    const [submitting, setSubmitting] = useState(false);
    const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
    const [showQuestionForm, setShowQuestionForm] = useState(false);

    // Question form state
    const [qText, setQText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [qDifficulty, setQDifficulty] = useState('medium');

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                subjectId: initialData.subjectId || '',
                type: initialData.type || (isTeacher ? 'practice' : 'university'),
                timeLimit: initialData.timeLimit || 30,
                passingScore: initialData.passingScore || 80,
                difficulty: initialData.difficulty || 'mixed',
                maxAttempts: initialData.maxAttempts || 1,
                questions: initialData.questions || []
            });
            setShowQuestionForm(false);
            setEditingQuestionIdx(null);
        }
    }, [isOpen, initialData, isTeacher]);

    const resetQuestionForm = () => {
        setQText('');
        setOptions(['', '', '', '']);
        setCorrectIdx(0);
        setExplanation('');
        setQDifficulty('medium');
        setEditingQuestionIdx(null);
        setShowQuestionForm(false);
    };

    const handleSaveQuestion = (e) => {
        e.preventDefault();
        if (!qText.trim()) return alert('Question text is required.');
        if (options.some(o => !o.trim())) return alert('All 4 option choices are required.');

        const formattedOptions = options.map((optText, idx) => ({
            text: optText,
            isCorrect: idx === correctIdx
        }));

        const newQuestionObj = {
            questionText: qText,
            options: formattedOptions,
            explanation,
            difficulty: qDifficulty
        };

        if (editingQuestionIdx !== null) {
            const updated = [...formData.questions];
            updated[editingQuestionIdx] = newQuestionObj;
            setFormData({ ...formData, questions: updated });
        } else {
            setFormData({ ...formData, questions: [...formData.questions, newQuestionObj] });
        }

        resetQuestionForm();
    };

    const handleEditQuestion = (idx) => {
        const q = formData.questions[idx];
        setQText(q.questionText);
        setOptions(q.options.map(o => o.text || ''));
        const correct = q.options.findIndex(o => o.isCorrect);
        setCorrectIdx(correct >= 0 ? correct : 0);
        setExplanation(q.explanation || '');
        setQDifficulty(q.difficulty || 'medium');
        setEditingQuestionIdx(idx);
        setShowQuestionForm(true);
    };

    const handleDeleteQuestion = (idx) => {
        setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== idx) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return alert('Quiz title is required.');
        if (formData.questions.length === 0) return alert('Please add at least one question to the quiz.');

        setSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999,
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem 1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 15 }}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '20px',
                            width: '100%',
                            maxWidth: '750px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                            position: 'relative',
                            zIndex: 100000
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    padding: '0.6rem',
                                    borderRadius: '12px',
                                    background: 'rgba(79, 70, 229, 0.1)',
                                    color: 'var(--brand-primary)'
                                }}>
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                        {initialData.title ? 'Edit Quiz Parameters' : 'Create New Quiz'}
                                    </h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        Configure quiz parameters and manage question choices.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '0.4rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content Scroll Body */}
                        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            <form id="quiz-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                {/* Quiz Title */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                                        Quiz Title *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Data Structures Mid-Term Quiz"
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            padding: '0 1rem',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Subject & Type Selection */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                    {subjects.length > 0 && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                                                Subject *
                                            </label>
                                            <select
                                                required
                                                value={formData.subjectId}
                                                onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '42px',
                                                    padding: '0 1rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.9rem',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="">Select a Subject...</option>
                                                {subjects.map(s => (
                                                    <option key={s._id || s.id} value={s._id || s.id}>
                                                        {s.subjectName || s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                                            Quiz Type
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                padding: '0 1rem',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="university">University (Certificates Issued)</option>
                                            <option value="practice">Practice (No Certificates)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Settings Grid: Time limit, passing score, attempts, difficulty */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Time Limit (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.timeLimit}
                                            onChange={e => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 30 })}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                padding: '0 0.8rem',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Passing Score (%)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={formData.passingScore}
                                            onChange={e => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 80 })}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                padding: '0 0.8rem',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Max Attempts
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.maxAttempts}
                                            onChange={e => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) || 1 })}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                padding: '0 0.8rem',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                                            Difficulty
                                        </label>
                                        <select
                                            value={formData.difficulty}
                                            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                            style={{
                                                width: '100%',
                                                height: '42px',
                                                padding: '0 0.8rem',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="mixed">Mixed</option>
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                </div>
                            </form>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.2rem 0' }} />

                            {/* Section: Question Management */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                            Questions ({formData.questions.length})
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                            Review questions generated by AI or add manual questions below.
                                        </p>
                                    </div>
                                    {!showQuestionForm && (
                                        <button
                                            type="button"
                                            onClick={() => setShowQuestionForm(true)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '10px',
                                                background: 'rgba(79, 70, 229, 0.1)',
                                                color: 'var(--brand-primary)',
                                                border: '1px solid rgba(79, 70, 229, 0.2)',
                                                fontWeight: '600',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            <Plus size={16} /> Add Question
                                        </button>
                                    )}
                                </div>

                                {/* Question Input Form (when adding / editing) */}
                                {showQuestionForm && (
                                    <div style={{
                                        padding: '1.25rem',
                                        borderRadius: '14px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--brand-primary)',
                                        marginBottom: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', fontWeight: '700' }}>
                                                {editingQuestionIdx !== null ? `Editing Question #${editingQuestionIdx + 1}` : 'New Question'}
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={resetQuestionForm}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                                                Question Text *
                                            </label>
                                            <input
                                                type="text"
                                                value={qText}
                                                onChange={e => setQText(e.target.value)}
                                                placeholder="Enter question prompt..."
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    padding: '0 0.8rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.85rem'
                                                }}
                                            />
                                        </div>

                                        {/* Options A, B, C, D */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                                Answer Options (Select the correct radio choice) *
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {options.map((opt, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <input
                                                            type="radio"
                                                            name="correct-option"
                                                            checked={correctIdx === i}
                                                            onChange={() => setCorrectIdx(i)}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                                                        />
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', width: '20px', color: correctIdx === i ? '#10b981' : 'var(--text-secondary)' }}>
                                                            {String.fromCharCode(65 + i)}:
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => {
                                                                const updated = [...options];
                                                                updated[i] = e.target.value;
                                                                setOptions(updated);
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                            style={{
                                                                flex: 1,
                                                                height: '36px',
                                                                padding: '0 0.75rem',
                                                                borderRadius: '8px',
                                                                border: correctIdx === i ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                                                                background: 'var(--bg-primary)',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                                                Explanation (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={explanation}
                                                onChange={e => setExplanation(e.target.value)}
                                                placeholder="Brief explanation for why the correct option is right..."
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '0 0.8rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.85rem'
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={resetQuestionForm}
                                                style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveQuestion}
                                                style={{ padding: '0.4rem 1rem', background: 'var(--brand-primary)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}
                                            >
                                                {editingQuestionIdx !== null ? 'Update Question' : 'Save Question'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Question List Display */}
                                {formData.questions.length === 0 ? (
                                    <div style={{
                                        padding: '2rem',
                                        borderRadius: '12px',
                                        border: '2px dashed var(--border-color)',
                                        textAlign: 'center',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <HelpCircle size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '500' }}>No questions loaded yet.</p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
                                            Click "+ Add Question" above or generate with AI to populate questions.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                                        {formData.questions.map((q, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', gap: '0.4rem' }}>
                                                        <span style={{ color: 'var(--brand-primary)' }}>Q{idx + 1}.</span> {q.questionText}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditQuestion(idx)}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteQuestion(idx)}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Options display */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    {q.options.map((opt, oIdx) => (
                                                        <div
                                                            key={oIdx}
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '0.35rem 0.6rem',
                                                                borderRadius: '6px',
                                                                background: opt.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-primary)',
                                                                color: opt.isCorrect ? '#10b981' : 'var(--text-secondary)',
                                                                fontWeight: opt.isCorrect ? '700' : '400',
                                                                border: opt.isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <span>{String.fromCharCode(65 + oIdx)}: {opt.text}</span>
                                                            {opt.isCorrect && <CheckCircle2 size={12} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                        }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                style={{
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '10px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="quiz-form"
                                disabled={submitting || formData.questions.length === 0}
                                style={{
                                    padding: '0.65rem 1.5rem',
                                    borderRadius: '10px',
                                    background: 'var(--brand-primary)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    opacity: submitting || formData.questions.length === 0 ? 0.6 : 1,
                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                                }}
                            >
                                {submitting ? 'Saving Quiz...' : `Save Quiz (${formData.questions.length} Qs)`}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default QuizFormModal;

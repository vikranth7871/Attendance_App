import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Upload, Tag, Brain, Image as ImageIcon, Plus } from 'lucide-react';
import axios from 'axios';

const AIQuizGeneratorModal = ({ isOpen, onClose, onGenerated, defaultSubject = '' }) => {
    const [subject, setSubject] = useState(defaultSubject);
    const [promptBox, setPromptBox] = useState('');
    const [tags, setTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');
    const [count, setCount] = useState(10);
    const [difficulty, setDifficulty] = useState('mixed');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    const handleAddTag = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            if (currentTag.trim() && !tags.includes(currentTag.trim())) {
                setTags([...tags, currentTag.trim()]);
                setCurrentTag('');
            }
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerate = async () => {
        if (!subject.trim()) {
            setError('Subject is required.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('count', count);
            formData.append('difficulty', difficulty);
            formData.append('promptBox', promptBox);
            formData.append('tags', JSON.stringify(tags));
            
            if (image) {
                formData.append('image', image);
            }

            const { data } = await axios.post('/quiz/generate-ai', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.questions && data.questions.length > 0) {
                onGenerated({
                    title: `${subject} Quiz`,
                    questions: data.questions,
                    tags,
                    difficulty
                });
                onClose();
            } else {
                setError('AI returned no questions. Please try again.');
            }
        } catch (err) {
            console.error('AI Generation Error:', err);
            setError(err.response?.data?.message || 'Failed to generate quiz with AI.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 3000,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '90vh',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.4)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Sparkles size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                        AI Quiz Generator
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        Provide context, tags, or an image to generate questions.
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} style={{
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
                            }}><X size={20} /></button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {error && (
                                <div style={{ padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', fontSize: '0.85rem' }}>
                                    {error}
                                </div>
                            )}

                            {/* Subject & Difficulty */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: '2 1 300px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Subject Name *</label>
                                    <input
                                        type="text" value={subject} onChange={e => setSubject(e.target.value)}
                                        placeholder="e.g. Data Structures, ReactJS..."
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: '1 1 120px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Difficulty</label>
                                    <select
                                        value={difficulty} onChange={e => setDifficulty(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                    >
                                        <option value="mixed">Mixed</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div style={{ flex: '1 1 100px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Questions</label>
                                    <input
                                        type="number" min="1" max="20" value={count} onChange={e => setCount(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Instructions Box */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Instructions / Syllabus (Optional)</label>
                                <textarea
                                    value={promptBox} onChange={e => setPromptBox(e.target.value)}
                                    placeholder="Paste syllabus, specific topics to cover, or formatting instructions..."
                                    rows={4}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Focus Tags</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                    {tags.map(tag => (
                                        <div key={tag} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                                            padding: '0.3rem 0.6rem', background: 'var(--brand-primary)', color: 'white',
                                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600'
                                        }}>
                                            <Tag size={12} /> {tag}
                                            <X size={14} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => removeTag(tag)} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text" value={currentTag} onChange={e => setCurrentTag(e.target.value)}
                                        onKeyDown={handleAddTag} placeholder="Add a tag..."
                                        style={{ flex: 1, padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                    />
                                    <button onClick={handleAddTag} style={{
                                        padding: '0 1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer'
                                    }}><Plus size={16} /></button>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '0.4rem' }}>Context Image (Optional)</label>
                                {!imagePreview ? (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ 
                                            border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '2rem',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        <ImageIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <p style={{ fontSize: '0.9rem', margin: '0 0 0.25rem 0', fontWeight: '600', color: 'var(--text-primary)' }}>Click to upload an image</p>
                                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Analyze diagrams, code snippets, or notes</p>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', width: 'fit-content' }}>
                                        <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', maxWidth: '100%', display: 'block' }} />
                                        <button onClick={removeImage} style={{
                                            position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white',
                                            border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                        }}><X size={16} /></button>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/jpeg, image/png" style={{ display: 'none' }} />
                            </div>

                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '1rem'
                        }}>
                            <button onClick={onClose} disabled={loading} style={{
                                padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                            }}>Cancel</button>
                            <button onClick={handleGenerate} disabled={loading} style={{
                                padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1
                            }}>
                                {loading ? (
                                    <>Generating <span className="loader" style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span></>
                                ) : (
                                    <><Sparkles size={16} /> Generate Questions</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AIQuizGeneratorModal;

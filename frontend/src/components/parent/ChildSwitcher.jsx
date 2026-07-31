import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Check, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChildSwitcher = ({ childrenList, selectedChildId, onSelectChild }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!childrenList || childrenList.length <= 1) {
        const singleChild = childrenList && childrenList.length === 1 ? childrenList[0] : null;
        if (!singleChild) return null;
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 1.25rem', background: 'var(--bg-secondary)',
                borderRadius: '1rem', border: '1px solid var(--border-color)'
            }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.9rem'
                }}>
                    {singleChild.name?.charAt(0) || 'C'}
                </div>
                <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{singleChild.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {singleChild.classInfo?.name || singleChild.classInfo?.className || 'Class Student'} • Sec {singleChild.section || 'A'}
                    </div>
                </div>
            </div>
        );
    }

    const selectedChild = childrenList.find(c => c.studentId === selectedChildId) || childrenList[0];

    return (
        <div ref={dropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    padding: '0.6rem 1.25rem', background: 'var(--bg-secondary)',
                    borderRadius: '1rem', border: '1px solid var(--brand-primary)',
                    cursor: 'pointer', color: 'var(--text-primary)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.2s'
                }}
            >
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.9rem'
                }}>
                    {selectedChild.name?.charAt(0) || 'C'}
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedChild.name}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {selectedChild.classInfo?.name || selectedChild.classInfo?.className || 'Class Student'} • Sec {selectedChild.section || 'A'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: '700' }}>
                    Switch <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{
                            position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                            minWidth: '260px', background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)', borderRadius: '1rem',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)', backdropFilter: 'blur(12px)',
                            padding: '0.5rem', overflow: 'hidden'
                        }}
                    >
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Linked Students ({childrenList.length})
                        </div>
                        {childrenList.map((child) => {
                            const isSelected = child.studentId === selectedChild.studentId;
                            return (
                                <button
                                    key={child.studentId}
                                    onClick={() => {
                                        onSelectChild(child.studentId);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                                        border: 'none', background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: isSelected ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                        color: isSelected ? 'white' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '0.85rem'
                                    }}>
                                        {child.name?.charAt(0) || 'C'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{child.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                            {child.classInfo?.name || child.classInfo?.className || 'Class Student'} • {child.rollNumber}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={16} color="var(--brand-primary)" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChildSwitcher;

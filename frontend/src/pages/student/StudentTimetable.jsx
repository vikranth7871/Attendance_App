import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BookOpen, Download } from 'lucide-react';
import TimetableGrid from '../../components/shared/TimetableGrid';

const StudentTimetable = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const timetableRef = useRef(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const { data } = await axios.get('/student/subjects');
                setSubjects(data);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    const handleDownloadTimetable = async () => {
        if (!timetableRef.current || downloading) return;
        setDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(timetableRef.current, {
                backgroundColor: '#1a1a2e',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `my_timetable_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to download timetable:', err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading timetable...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '1rem', width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>My Weekly Timetable</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Your complete weekly class schedule at a glance.</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(91, 80, 230, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadTimetable}
                    disabled={downloading || subjects.length === 0}
                    style={{
                        padding: '0.6rem 1.25rem',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: downloading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        opacity: downloading || subjects.length === 0 ? 0.6 : 1,
                        boxShadow: '0 4px 15px rgba(91, 80, 230, 0.3)'
                    }}
                >
                    <Download size={16} />
                    {downloading ? 'Downloading...' : 'Download PNG'}
                </motion.button>
            </div>

            {subjects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    <p>No subjects have been assigned to your class yet.</p>
                </div>
            ) : (
                <div ref={timetableRef}>
                    <TimetableGrid subjects={subjects} />
                </div>
            )}
        </div>
    );
};

export default StudentTimetable;

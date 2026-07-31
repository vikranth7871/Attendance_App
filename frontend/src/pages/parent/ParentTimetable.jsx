import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { Clock, Download } from 'lucide-react';
import TimetableGrid from '../../components/shared/TimetableGrid';

const ParentTimetable = ({ selectedChildId }) => {
    const [academicData, setAcademicData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const timetableRef = useRef(null);

    useEffect(() => {
        const fetchAcademic = async () => {
            setLoading(true);
            try {
                const url = selectedChildId ? `/parent/student-academic?studentId=${selectedChildId}` : '/parent/student-academic';
                const { data } = await axios.get(url);
                setAcademicData(data);
            } catch (err) {
                console.error('Failed to fetch academic timetable', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAcademic();
    }, [selectedChildId]);

    const handleDownloadTimetable = async () => {
        if (!timetableRef.current || downloading) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(timetableRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null
            });
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `Timetable_${academicData?.student?.name?.replace(/\s+/g, '_') || 'Student'}.png`;
            link.click();
        } catch (err) {
            console.error('Failed to download timetable:', err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading timetable...</div>;

    const subjects = academicData?.subjects || academicData?.timetable || [];
    const student = academicData?.student || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Clock size={28} className="text-brand-primary" /> Weekly Class Timetable
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Official weekly class timetable grid for {student.name || 'Student'} ({student.classInfo?.className || student.classInfo?.name || 'Class VIII-A'}).
                    </p>
                </div>

                <button
                    onClick={handleDownloadTimetable}
                    disabled={downloading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem' }}
                >
                    <Download size={18} />
                    {downloading ? 'Downloading...' : 'Download Timetable'}
                </button>
            </div>

            {/* Interactive Timetable Grid View */}
            <div ref={timetableRef}>
                <TimetableGrid subjects={subjects} hideTeacher={false} />
            </div>
        </div>
    );
};

export default ParentTimetable;

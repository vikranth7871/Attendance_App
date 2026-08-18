import React, { useState, useEffect, useRef } from 'react';
import { Search, X, GraduationCap, UserCheck, Building, Layers, BookOpen, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Close results on outside click or Escape key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setResults(null);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setResults(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const performSearch = async (val) => {
        if (!val || !val.trim()) {
            setResults(null);
            return;
        }
        setIsSearching(true);
        try {
            const { data } = await axios.get(`/search?q=${encodeURIComponent(val.trim())}`);
            setResults(data);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounced live search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query && query.trim()) performSearch(query);
            else setResults(null);
        }, 250);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (query && query.trim()) performSearch(query);
    };

    const handleResultClick = (path) => {
        navigate(path);
        setResults(null);
        setQuery('');
    };

    const hasResults = results && (
        (results.students && results.students.length > 0) ||
        (results.teachers && results.teachers.length > 0) ||
        (results.classes && results.classes.length > 0) ||
        (results.subjects && results.subjects.length > 0) ||
        (results.departments && results.departments.length > 0)
    );

    const headerStyle = {
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        fontWeight: '700',
        padding: '0.4rem 0.6rem 0.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '0.25rem'
    };

    const itemStyle = {
        fontSize: '0.85rem',
        padding: '0.55rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderRadius: '8px',
        transition: 'all 0.15s ease',
        margin: '0.15rem 0'
    };

    return (
        <div ref={searchRef} style={{ position: 'relative', width: '320px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', pointerEvents: 'none' }} />
                
                <input
                    type="text"
                    placeholder="Search students, classes..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => query.trim() && performSearch(query)}
                    style={{
                        width: '100%',
                        padding: '0.55rem 2.2rem 0.55rem 2.5rem',
                        borderRadius: '999px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setResults(null); }}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '50%'
                        }}
                    >
                        <X size={14} />
                    </button>
                )}
            </form>

            {/* Results Dropdown */}
            {query.trim() && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '100%',
                        padding: '0.5rem',
                        zIndex: 1000,
                        maxHeight: '380px',
                        overflowY: 'auto',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)'
                    }}
                >
                    {isSearching ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <Loader2 size={16} className="animate-spin" /> Searching institution database...
                        </div>
                    ) : hasResults ? (
                        <div>
                            {/* Students */}
                            {results.students?.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={headerStyle}>
                                        <GraduationCap size={13} color="var(--brand-primary)" /> Students ({results.students.length})
                                    </div>
                                    {results.students.map(s => (
                                        <div
                                            key={s.id || s._id}
                                            onClick={() => handleResultClick('/admin/users')}
                                            style={itemStyle}
                                            className="hover-bg"
                                        >
                                            <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.rollNumber || s.email}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                {s.className && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>{s.className}{s.section ? ` - ${s.section}` : ''}</span>}
                                                {s.departmentName && <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary)', fontWeight: '700' }}>{s.departmentName}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Faculty / Teachers */}
                            {results.teachers?.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={headerStyle}>
                                        <UserCheck size={13} color="#10b981" /> Faculty ({results.teachers.length})
                                    </div>
                                    {results.teachers.map(t => (
                                        <div
                                            key={t.id || t._id}
                                            onClick={() => handleResultClick('/admin/users')}
                                            style={itemStyle}
                                            className="hover-bg"
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{t.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.email}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '600' }}>{t.departmentName || 'Faculty'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Classes */}
                            {results.classes?.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={headerStyle}>
                                        <Layers size={13} color="#f59e0b" /> Classes ({results.classes.length})
                                    </div>
                                    {results.classes.map(c => (
                                        <div
                                            key={c.id || c._id}
                                            onClick={() => handleResultClick('/admin/academic')}
                                            style={itemStyle}
                                            className="hover-bg"
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.className} {c.section ? `(Sec ${c.section})` : ''}</div>
                                                {c.departmentName && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.departmentName}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700' }}>Manage →</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Subjects */}
                            {results.subjects?.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={headerStyle}>
                                        <BookOpen size={13} color="#8b5cf6" /> Subjects ({results.subjects.length})
                                    </div>
                                    {results.subjects.map(sub => (
                                        <div
                                            key={sub.id || sub._id}
                                            onClick={() => handleResultClick('/admin/subjects')}
                                            style={itemStyle}
                                            className="hover-bg"
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{sub.subjectName}</div>
                                                {sub.subjectCode && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Code: {sub.subjectCode}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: '700' }}>{sub.departmentName || 'Subject'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Departments */}
                            {results.departments?.length > 0 && (
                                <div>
                                    <div style={headerStyle}>
                                        <Building size={13} color="#ec4899" /> Departments ({results.departments.length})
                                    </div>
                                    {results.departments.map(d => (
                                        <div
                                            key={d.id || d._id}
                                            onClick={() => handleResultClick('/admin/academic')}
                                            style={itemStyle}
                                            className="hover-bg"
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{d.departmentName}</div>
                                                {d.code && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Code: {d.code}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: '700' }}>Manage →</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 1rem' }}>
                            No students, faculty, or classes found matching "<strong>{query}</strong>".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;

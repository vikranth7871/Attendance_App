import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

const DocumentModal = ({ url, title = 'Supporting Document', onClose }) => {
    if (!url) return null;

    const isDataUri = url.startsWith('data:');
    const isImage = isDataUri ? url.startsWith('data:image/') : (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url) || url.includes('/document/'));
    const isPdf = isDataUri ? url.startsWith('data:application/pdf') : /\.pdf($|\?)/i.test(url);

    const handleDownload = async () => {
        try {
            if (isDataUri) {
                const link = document.createElement('a');
                link.href = url;
                let ext = 'png';
                if (url.startsWith('data:application/pdf')) ext = 'pdf';
                else if (url.startsWith('data:image/jpeg')) ext = 'jpg';
                else if (url.startsWith('data:image/png')) ext = 'png';
                link.download = `supporting_document_${Date.now()}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const res = await fetch(url);
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `supporting_document_${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        maxWidth: '850px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'rgba(91, 80, 230, 0.12)',
                                color: 'var(--brand-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                                    {title}
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                    Attached Leave Evidence / Proof Document
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={handleDownload}
                                style={{
                                    padding: '0.45rem 0.9rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 4px 12px rgba(91, 80, 230, 0.25)'
                                }}
                            >
                                <Download size={14} /> Download
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Preview Content Body */}
                    <div style={{
                        padding: '1.5rem',
                        overflowY: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-primary)',
                        minHeight: '300px'
                    }}>
                        {isPdf ? (
                            <iframe
                                src={url}
                                title="PDF Preview"
                                style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '12px' }}
                            />
                        ) : isImage || isDataUri ? (
                            <img
                                src={url}
                                alt="Supporting Document"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    borderRadius: '12px',
                                    objectFit: 'contain',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    border: '1px solid var(--border-color)'
                                }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <FileText size={48} style={{ color: 'var(--brand-primary)', marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    File preview not supported inline.
                                </p>
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '10px',
                                        background: 'var(--brand-primary)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <ExternalLink size={16} /> Open Document
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DocumentModal;

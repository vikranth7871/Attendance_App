import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Download, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentFees = ({ selectedChildId }) => {
    const [feesData, setFeesData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFees = async () => {
            setLoading(true);
            try {
                const url = selectedChildId ? `/parent/student-fees?studentId=${selectedChildId}` : '/parent/student-fees';
                const { data } = await axios.get(url);
                setFeesData(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFees();
    }, [selectedChildId]);

    const handleDownloadReceipt = (payment) => {
        const studentName = feesData?.student?.name || 'Student';
        let txt = `=========================================\n`;
        txt += `       FEE PAYMENT RECEIPT\n`;
        txt += `=========================================\n\n`;
        txt += `Receipt No: ${payment.receipt_no}\n`;
        txt += `Student Name: ${studentName}\n`;
        txt += `Amount Paid: ₹${payment.amount_paid}\n`;
        txt += `Payment Method: ${payment.payment_method}\n`;
        txt += `Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}\n`;
        txt += `Transaction Ref: ${payment.transaction_ref}\n`;
        txt += `Status: SUCCESSFUL\n`;
        txt += `=========================================\n`;

        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${payment.receipt_no}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading fee details...</div>;

    const feeSummary = feesData?.feeSummary || {};
    const paymentHistory = feesData?.paymentHistory || [];
    const student = feesData?.student || {};

    const isPaidInFull = parseFloat(feeSummary.pending_amount) <= 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CreditCard size={28} className="text-brand-primary" /> Fee Details & Receipts
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    View fee summary, upcoming due dates, payment history, and download official receipts for {student.name}.
                </p>
            </div>

            {/* Fee Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Academic Fee</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>₹{feeSummary.total_amount || '45,000'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Academic Year 2026</div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Amount Paid</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.25rem' }}>₹{feeSummary.paid_amount || '30,000'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Cleared Transactions</div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pending Amount</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: isPaidInFull ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>
                        ₹{feeSummary.pending_amount || '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                        {isPaidInFull ? 'No Dues Remaining' : `Due by ${new Date(feeSummary.due_date).toLocaleDateString()}`}
                    </div>
                </div>
            </div>

            {/* Payment History Table */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                    Payment History & Receipts
                </h3>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Receipt No</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Payment Method</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Amount Paid</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Receipt Download</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map((p, idx) => (
                                <tr key={idx} style={{ background: 'var(--bg-secondary)' }}>
                                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--brand-primary)' }}>{p.receipt_no}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.payment_method}</td>
                                    <td style={{ padding: '1rem', fontWeight: '800', color: 'var(--success)' }}>₹{p.amount_paid}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDownloadReceipt(p)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                        >
                                            <Download size={14} /> Receipt TXT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ParentFees;

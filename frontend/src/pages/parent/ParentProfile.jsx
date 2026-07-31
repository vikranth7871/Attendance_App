import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Mail, Phone, MapPin, ShieldCheck, Check, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const ParentProfile = () => {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState('+91 98765 43210');
    const [address, setAddress] = useState('123 University Green Avenue, Tech City');
    const [relationship, setRelationship] = useState('Parent / Guardian');
    const [emergencyContact, setEmergencyContact] = useState('+91 98765 00000');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [profileMsg, setProfileMsg] = useState(null);
    const [passMsg, setPassMsg] = useState(null);
    const [passErr, setPassErr] = useState(null);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMsg(null);
        try {
            await axios.put('/parent/profile', { name, phone, address, emergencyContact, relationship });
            setProfileMsg('Profile updated successfully!');
        } catch (err) {
            console.error(err);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPassMsg(null);
        setPassErr(null);

        if (newPassword !== confirmPassword) {
            setPassErr('New password and confirm password do not match.');
            return;
        }

        try {
            await axios.put('/parent/change-password', { currentPassword, newPassword });
            setPassMsg('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPassErr(err.response?.data?.message || 'Failed to update password.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <User size={28} className="text-brand-primary" /> Profile & Security Settings
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Manage your contact information, relationship details, and account security.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                {/* Profile Details Form */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={20} className="text-brand-primary" /> Parent Profile Information
                    </h3>

                    {profileMsg && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700' }}>
                            ✓ {profileMsg}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Email Address (Account ID)</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-light)', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Emergency Contact</label>
                            <input
                                type="text"
                                value={emergencyContact}
                                onChange={(e) => setEmergencyContact(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Residential Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ padding: '0.75rem', borderRadius: '0.75rem', marginTop: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <Save size={16} /> Save Profile Changes
                        </button>
                    </form>
                </div>

                {/* Password Change Form */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={20} className="text-brand-secondary" /> Change Security Password
                    </h3>

                    {passMsg && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700' }}>
                            ✓ {passMsg}
                        </div>
                    )}
                    {passErr && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', borderRadius: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700' }}>
                            ⚠️ {passErr}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password..."
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password..."
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password..."
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ padding: '0.75rem', borderRadius: '0.75rem', marginTop: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <ShieldCheck size={16} /> Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ParentProfile;

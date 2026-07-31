import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import './Login.css';
import illustration from '../assets/login-illustration.png';
import shieldIcon from '../assets/shield-check.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            redirectUser(user.role);
        }
    }, [user, navigate]);

    const redirectUser = (role) => {
        switch (role) {
            case 'admin': navigate('/admin'); break;
            case 'teacher': navigate('/teacher'); break;
            case 'student': navigate('/student'); break;
            case 'parent': navigate('/parent'); break;
            default: navigate('/');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await login(email, password);
            setIsLoading(false);

            if (res.success) {
                redirectUser(res.role);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setIsLoading(false);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side: Illustration */}
                <div className="login-illustration-section">
                    <motion.img
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        src={illustration}
                        alt="Classroom Illustration"
                        className="login-illustration"
                    />
                </div>

                {/* Right Side: Login Form */}
                <div className="login-form-section">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="login-card"
                    >
                        <div className="shield-icon-container">
                            <img src={shieldIcon} alt="Shield Check" className="shield-icon" />
                        </div>

                        <div className="login-header">
                            <h1>Welcome Back!</h1>
                            <p>Login to Student Attendance System</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="error-message"
                            >
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="input-group">
                                <div className="input-wrapper">
                                    <Mail className="input-icon" size={20} />
                                    <input
                                        type="email"
                                        className="login-input"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="login-input"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* BUG-23 Fix: Removed dead 'Forgot Password' link that called e.preventDefault() and did nothing */}

                            <button type="submit" className="login-btn" disabled={isLoading}>
                                {isLoading ? 'Signing in...' : 'Login'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Login;

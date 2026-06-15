import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader, Briefcase } from 'lucide-react';
import { request } from '../api/client';

export default function SignupView({ onSignupSuccess, onBackToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Warm up CSRF token first
      await request('/api/csrf/');
      
      const res = await request('/api/auth/signup/', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          org_name: orgName || 'My Workspace'
        }),
      });

      if (res.status === 'success' || res.user) {
        onSignupSuccess(res.user);
      } else {
        setError('Signup failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please ensure username is not taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard} className="animate-fade">
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Mail size={32} color="var(--color-primary)" />
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Get your custom self-hosted mail workspace live</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address or Username</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Workspace Name</label>
            <div style={styles.inputWrapper}>
              <Briefcase size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password (min. 8 chars)</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader size={20} className="animate-spin" style={styles.spinner} />
            ) : (
              'Create Workspace'
            )}
          </button>
        </form>

        <div style={styles.toggleFooter}>
          Already have an account?{' '}
          <span onClick={onBackToLogin} style={styles.link}>
            Sign In
          </span>
        </div>

        <div style={styles.footer}>
          <p>Dovecot IMAP • Postfix SMTP • PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-secondary)',
    backgroundImage: 'radial-gradient(circle at 50% -20%, #e8f0fe, transparent 75%)',
  },
  glassCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-soft)',
    marginBottom: '1rem',
    border: '1px solid rgba(26, 115, 232, 0.2)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(244, 63, 94, 0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 40px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)',
    transition: 'background-color var(--transition-fast)',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  toggleFooter: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--color-primary)',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '1.25rem',
  },
};

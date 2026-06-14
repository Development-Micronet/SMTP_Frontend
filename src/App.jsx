import React, { useState, useEffect } from 'react';
import { RefreshCw, Mail } from 'lucide-react';
import { request } from './api/client';
import LoginView from './views/LoginView';
import SignupView from './views/SignupView';
import WebmailView from './views/WebmailView';
import TenantDashboardView from './views/TenantDashboardView';
import AdminDashboardView from './views/AdminDashboardView';

export default function App() {
  const [user, setUser] = useState(null);
  const [isSignupView, setIsSignupView] = useState(false);
  const [isTenantView, setIsTenantView] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await request('/api/auth/me/');
        if (res && res.username) {
          setUser(res);
        }
      } catch (err) {
        console.log('Not authenticated:', err.message);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loaderWrapper}>
          <Mail size={40} color="#6366f1" className="animate-pulse" />
          <RefreshCw size={24} className="animate-spin" color="var(--color-primary)" style={{ marginTop: '15px' }} />
          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Connecting to MailStack...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (isSignupView) {
      return (
        <SignupView 
          onSignupSuccess={(u) => {
            setUser(u);
            setIsSignupView(false);
          }}
          onBackToLogin={() => setIsSignupView(false)}
        />
      );
    }
    return (
      <LoginView 
        onLoginSuccess={(u) => setUser(u)} 
        onNavigateToSignup={() => setIsSignupView(true)}
      />
    );
  }

  if (isTenantView) {
    return (
      <TenantDashboardView 
        onBackToWebmail={() => setIsTenantView(false)}
        onLogout={() => {
          setUser(null);
          setIsTenantView(false);
        }}
      />
    );
  }

  if (isAdminView && user.is_staff) {
    return (
      <AdminDashboardView 
        onBackToWebmail={() => setIsAdminView(false)} 
      />
    );
  }

  return (
    <WebmailView 
      user={user} 
      onLogout={() => {
        setUser(null);
        setIsAdminView(false);
        setIsTenantView(false);
      }} 
      onNavigateToAdmin={() => setIsAdminView(true)}
      onNavigateToTenant={() => setIsTenantView(true)}
    />
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  },
  loaderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SurveyList from './pages/SurveyList';
import AdminDashboard from './pages/AdminDashboard';
import ResponseViewer from './pages/ResponseViewer';
import AdminGate from './components/AdminGate';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { isAdminSession } from './utils/adminAuth';

// Configure your target AWS Cognito client attributes here
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
    }
  }
});

function AccountDashboard({ signOut, user }) {
  const displayName = user?.signInDetails?.loginId || 'a registered participant';
  
  return (
    <div className="review-container" style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
      <h2>Welcome to Sky Survey Platform</h2>
      <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
        You are successfully signed in as <strong>{displayName}</strong>.
      </p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>Take a Survey</Link>
        <button type="button" className="btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const clearActiveSurvey = () => {
    sessionStorage.removeItem('survey_active');
    sessionStorage.removeItem('survey_answers');
    sessionStorage.removeItem('survey_step');
  };

  const checkAuth = () => {
    fetchAuthSession().then(session => {
      setIsLoggedIn(!!session.tokens?.idToken);
      setIsAdmin(isAdminSession(session));
    }).catch(() => {
      setIsLoggedIn(false);
      setIsAdmin(false);
    });
  };

  useEffect(() => {
    checkAuth();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        checkAuth();
      } else if (payload.event === 'signedOut') {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: 'none' }} onClick={clearActiveSurvey}>
        <div className="nav-brand">Sky Survey Platform</div>
      </Link>
      <div className="nav-links">
        <Link to="/" onClick={clearActiveSurvey}>Available Surveys</Link>
        {isAdmin && <Link to="/admin">Manage Surveys</Link>}
        {isLoggedIn ? (
          <Link to="/login">My Account</Link>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<SurveyList />} />
            
            <Route path="/login" element={
              <ThemeProvider colorMode="dark">
                <Authenticator>
                  {({ signOut, user }) => (
                    <AccountDashboard signOut={signOut} user={user} />
                  )}
                </Authenticator>
              </ThemeProvider>
            } />

            <Route path="/admin" element={
              <ThemeProvider colorMode="dark">
                <Authenticator>
                  {({ signOut, user }) => (
                    <AdminGate signOut={signOut} user={user} loginId={user?.signInDetails?.loginId || 'Admin'}>
                      <AdminDashboard />
                    </AdminGate>
                  )}
                </Authenticator>
              </ThemeProvider>
            } />
            <Route path="/admin/responses/:surveyId" element={
              <ThemeProvider colorMode="dark">
                <Authenticator>
                  {({ signOut, user }) => (
                    <AdminGate signOut={signOut} user={user} loginId={user?.signInDetails?.loginId || 'Admin'}>
                      <ResponseViewer />
                    </AdminGate>
                  )}
                </Authenticator>
              </ThemeProvider>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { isAdminSession } from '../utils/adminAuth';

export default function AdminGate({ children, signOut, user }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchAuthSession()
      .then((session) => {
        if (isMounted) {
          setIsAdmin(isAdminSession(session));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAdmin(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setChecking(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) {
    return <div className="spinner">Checking admin access...</div>;
  }

  if (!isAdmin) {
    const displayName = user?.signInDetails?.loginId || 'a registered participant';
    
    return (
      <div className="review-container" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Admin Access Required</h2>
        <p style={{ marginBottom: '24px' }}>
          Signed in as {displayName}, but this account is not in an admin Cognito group.
        </p>
        <button type="button" className="btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  const displayName = user?.signInDetails?.loginId || 'Admin';

  return (
    <>
      <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
        Signed in as {displayName} <button onClick={signOut} className="btn-secondary" style={{ marginLeft: '10px' }}>Sign out</button>
      </div>
      {children}
    </>
  );
}

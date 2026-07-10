import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SurveyList from './pages/SurveyList';
import AdminDashboard from './pages/AdminDashboard';
import ResponseViewer from './pages/ResponseViewer';
import { Amplify } from 'aws-amplify';

// Configure your target AWS Cognito client attributes here
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
    }
  }
});

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">Sky Survey Platform</div>
          <div className="nav-links">
            <Link to="/">Available Surveys</Link>
            <Link to="/admin">Manage Surveys</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<SurveyList />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/responses/:surveyId" element={<ResponseViewer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
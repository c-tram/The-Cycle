import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faLock, 
  faSignInAlt,
  faBaseball
} from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet-async';
import '../styles/Login.css';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    onLogin(username, password);
  };

  return (
    <div className="login-container">
      <Helmet>
        <meta charSet="utf-8" />
        <title>MLB Statcast | Login</title>
        <meta name="description" content="Login to MLB Statcast analytics platform" />
      </Helmet>
      <div className="login-form">
        <div className="login-logo">
          <FontAwesomeIcon icon={faBaseball} className="logo-icon" />
          <h1>MLB STATCAST</h1>
        </div>
        
        <h2>Sign In</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-icon-wrapper">
              <FontAwesomeIcon icon={faUser} className="input-icon" />
              <input 
                type="text" 
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="input-icon-wrapper">
              <FontAwesomeIcon icon={faLock} className="input-icon" />
              <input 
                type="password" 
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" defaultChecked />
              <label htmlFor="remember">Remember me</label>
            </div>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>
          
          <button type="submit" className="login-button">
            <FontAwesomeIcon icon={faSignInAlt} className="button-icon" />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

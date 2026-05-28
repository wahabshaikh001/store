import { useState } from 'react';
import { setSession } from '../utils/storage';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Please fill in all fields.'); return; }

    const userDocId = username.trim().toLowerCase();
    if (userDocId !== 'admin' && userDocId !== 'sales') {
      setError('Incorrect username or password.');
      return;
    }

    try {
      const userRef = doc(db, 'users', userDocId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password === password) {
          const session = { username: userData.username, role: userDocId };
          setSession(session);
          onLogin(session);
        } else {
          setError('Incorrect username or password.');
        }
      } else {
        setError('Incorrect username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to log in. Please check your internet connection.');
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">🛒</div>
        <div className="login-header">
          <h2>StoreManager</h2>
          <p>Sign in to your account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-control"
              placeholder="admin or sales"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function ChangePasswordModal({ isOpen, onClose, onChangePassword }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  function reset() { setOldPwd(''); setNewPwd(''); setError(''); setSuccess(''); }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!oldPwd || !newPwd) { setError('Both fields are required.'); return; }
    if (newPwd.length < 4) { setError('New password must be at least 4 characters.'); return; }
    try {
      const result = await onChangePassword(oldPwd, newPwd);
      if (result.success) {
        setSuccess(result.message);
        setOldPwd(''); setNewPwd('');
        setTimeout(() => { handleClose(); }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while updating the password.');
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔑 Change Password</h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        {error   && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPwd">Current Password</label>
            <input
              id="oldPwd"
              type="password"
              className="form-control"
              placeholder="Enter current password"
              value={oldPwd}
              onChange={e => setOldPwd(e.target.value)}
              disabled={!!success}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPwd">New Password</label>
            <input
              id="newPwd"
              type="password"
              className="form-control"
              placeholder="Enter new password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              disabled={!!success}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={!!success}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!!success}>Update Password</button>
          </div>
        </form>
      </div>
    </div>
  );
}

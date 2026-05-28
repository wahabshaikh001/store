import { useState, useEffect } from 'react';
import { getSession, setSession } from './utils/storage';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SalesDashboard from './components/SalesDashboard';
import AdminDashboard from './components/AdminDashboard';
import ChangePasswordModal from './components/ChangePasswordModal';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function App() {
  const [user, setUser]       = useState(() => getSession());
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const s = getSession();
    return s?.role === 'admin' ? 'records' : 'add';
  });
  const [pwdOpen, setPwdOpen] = useState(false);

  // Seed default users if they do not exist
  useEffect(() => {
    async function seedDefaultUsers() {
      try {
        const adminRef = doc(db, 'users', 'admin');
        const salesRef = doc(db, 'users', 'sales');

        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            username: 'admin',
            password: '1234',
            role: 'admin'
          });
        }

        const salesSnap = await getDoc(salesRef);
        if (!salesSnap.exists()) {
          await setDoc(salesRef, {
            username: 'sales',
            password: '1234',
            role: 'sales'
          });
        }
      } catch (error) {
        console.error('Error seeding users: ', error);
      }
    }
    seedDefaultUsers();
  }, []);

  // Listen to active orders real-time
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setRecords(list);
    });
    return () => unsubscribe();
  }, []);

  function handleLogin(session) {
    setUser(session);
    setActiveTab(session.role === 'admin' ? 'records' : 'add');
  }

  function handleLogout() {
    setSession(null);
    setUser(null);
  }

  async function handleAddRecord(data) {
    try {
      await addDoc(collection(db, 'orders'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error adding record: ', err);
    }
  }

  async function handleApprove(id) {
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      console.error('Error approving record: ', err);
    }
  }

  async function handleChangePassword(oldPwd, newPwd) {
    if (!user) return { success: false, message: 'No session.' };
    try {
      const userRef = doc(db, 'users', user.role);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: 'User profile not found in database.' };
      }
      const data = userSnap.data();
      if (data.password !== oldPwd) {
        return { success: false, message: 'Current password is incorrect.' };
      }
      await updateDoc(userRef, { password: newPwd });
      return { success: true, message: 'Password updated successfully!' };
    } catch (err) {
      console.error('Error updating password: ', err);
      return { success: false, message: 'Failed to update password.' };
    }
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onChangePassword={() => setPwdOpen(true)}
        onLogout={handleLogout}
      />

      {user.role === 'admin'
        ? <AdminDashboard records={records} onApproveRecord={handleApprove} />
        : <SalesDashboard records={records} onAddRecord={handleAddRecord} activeTab={activeTab} />
      }

      <ChangePasswordModal
        isOpen={pwdOpen}
        onClose={() => setPwdOpen(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
}


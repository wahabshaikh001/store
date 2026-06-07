import { useState, useEffect } from 'react';
import { getSession, setSession } from './utils/storage';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SalesDashboard from './components/SalesDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProductsSection from './components/ProductsSection';
import ApprovedOrders from './components/ApprovedOrders';
import ProductHistory from './components/ProductHistory';
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
  getDocs,
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';

export default function App() {
  const [user, setUser]               = useState(() => getSession());
  const [records, setRecords]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [activeTab, setActiveTab]     = useState('products');
  const [pwdOpen, setPwdOpen]         = useState(false);

  // Seed default users if they do not exist
  useEffect(() => {
    async function seedDefaultUsers() {
      try {
        const adminRef = doc(db, 'users', 'admin');
        const salesRef = doc(db, 'users', 'sales');
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, { username: 'admin', password: '1234', role: 'admin' });
        }
        const salesSnap = await getDoc(salesRef);
        if (!salesSnap.exists()) {
          await setDoc(salesRef, { username: 'sales', password: '1234', role: 'sales' });
        }
      } catch (error) {
        console.error('Error seeding users: ', error);
      }
    }
    seedDefaultUsers();
  }, []);

  // Listen to pending orders real-time
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      
      // Sort client-side: oldest first, newest last
      list.sort((a, b) => {
        const getTime = (o) => {
          if (!o) return 0;
          if (o.createdAt) {
            if (typeof o.createdAt === 'string') {
              const parsed = Date.parse(o.createdAt);
              if (!isNaN(parsed)) return parsed;
            }
            if (typeof o.createdAt.toMillis === 'function') {
              return o.createdAt.toMillis();
            }
            if (o.createdAt.seconds) {
              return o.createdAt.seconds * 1000;
            }
            if (typeof o.createdAt === 'number') {
              return o.createdAt;
            }
          }
          if (o.date && typeof o.date === 'string') {
            const parsed = Date.parse(o.date);
            if (!isNaN(parsed)) return parsed;
          }
          return 0;
        };

        const timeA = getTime(a);
        const timeB = getTime(b);
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        const idA = String(a.id || '');
        const idB = String(b.id || '');
        return idA.localeCompare(idB);
      });
      
      setRecords(list);
    });
    return () => unsubscribe();
  }, []);

  // Listen to approved orders real-time
  useEffect(() => {
    const q = query(collection(db, 'approvedOrders'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setApprovedOrders(list);
    });
    return () => unsubscribe();
  }, []);

  // Listen to products real-time
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setProducts(list);
    });
    return () => unsubscribe();
  }, []);

  // Listen to product history real-time
  useEffect(() => {
    const q = query(collection(db, 'productHistory'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setHistoryRecords(list);
    });
    return () => unsubscribe();
  }, []);

  function handleLogin(session) {
    setUser(session);
    setActiveTab('products');
  }

  function handleLogout() {
    setSession(null);
    setUser(null);
  }

  // ── PRODUCT ACTIONS ──────────────────────────────────────
  async function handleAddProduct(data) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      await runTransaction(db, async (transaction) => {
        const existingLocal = products.find(
          (p) => p.name.toLowerCase() === data.name.trim().toLowerCase()
        );

        let targetProductRef;
        let isNew = true;
        let newQty = data.quantity;
        let finalProductName = data.name.trim();

        if (existingLocal) {
          targetProductRef = doc(db, 'products', existingLocal.id);
          const docSnap = await transaction.get(targetProductRef);
          if (docSnap.exists()) {
            isNew = false;
            const currentQty = docSnap.data().quantity || 0;
            newQty = Number((currentQty + data.quantity).toFixed(4));
            finalProductName = docSnap.data().name || finalProductName;
          }
        }

        if (isNew) {
          const newProdRef = doc(collection(db, 'products'));
          transaction.set(newProdRef, {
            name: finalProductName,
            quantity: data.quantity,
            createdAt: serverTimestamp()
          });
        } else {
          transaction.update(targetProductRef, {
            quantity: newQty
          });
        }

        const historyRef = doc(collection(db, 'productHistory'));
        transaction.set(historyRef, {
          productName: finalProductName,
          quantityAdded: data.quantity,
          date: dateStr,
          createdAt: new Date().toISOString()
        });
      });
    } catch (err) {
      console.error('Error adding product: ', err);
    }
  }

  async function handleEditProduct(id, data) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'products', id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) throw new Error('Product not found.');

        const prevData = prodSnap.data();
        const prevQty = prevData.quantity || 0;
        const newQty = data.quantity || 0;

        transaction.update(prodRef, data);

        if (newQty > prevQty) {
          const qtyAdded = Number((newQty - prevQty).toFixed(4));
          const historyRef = doc(collection(db, 'productHistory'));
          transaction.set(historyRef, {
            productName: data.name || prevData.name,
            quantityAdded: qtyAdded,
            date: dateStr,
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      console.error('Error updating product: ', err);
    }
  }

  async function handleDeleteProduct(id) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      console.error('Error deleting product: ', err);
    }
  }

  // ── PRODUCT HISTORY ACTIONS ───────────────────────────────
  async function handleDeleteHistory(id) {
    try {
      await deleteDoc(doc(db, 'productHistory', id));
    } catch (err) {
      console.error('Error deleting history record: ', err);
    }
  }

  async function handleDeleteAllHistory() {
    try {
      const snapshot = await getDocs(collection(db, 'productHistory'));
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error('Error deleting all history: ', err);
    }
  }

  // ── ORDER ACTIONS ─────────────────────────────────────────
  async function handleAddRecord(data) {
    try {
      await addDoc(collection(db, 'orders'), {
        ...data,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error adding record: ', err);
    }
  }

  async function handleApprove(orderId) {
    const order = records.find(r => r.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    const prod = products.find(p => p.name.toLowerCase() === order.productName.toLowerCase());
    if (!prod) return { success: false, message: 'Product not found in inventory.' };

    try {
      const result = await runTransaction(db, async (transaction) => {
        const prodRef  = doc(db, 'products', prod.id);
        const orderRef = doc(db, 'orders', orderId);
        const approvedRef = doc(collection(db, 'approvedOrders'));

        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) throw new Error('Product not found in database.');

        const currentQty = prodSnap.data().quantity;

        // Deduct stock (negative values allowed)
        transaction.update(prodRef, {
          quantity: Number((currentQty - order.quantity).toFixed(4))
        });

        // Write the order to approvedOrders collection
        transaction.set(approvedRef, {
          date:        order.date        || '',
          productName: order.productName || '',
          quantity:    order.quantity    || 0,
          status:      'approved',
          approvedAt:  new Date().toISOString()
        });

        // Remove from pending orders
        transaction.delete(orderRef);

        return { success: true };
      });

      return result;
    } catch (err) {
      console.error('Approval transaction failed: ', err);
      return { success: false, message: err.message || 'Approval failed.' };
    }
  }

  async function handleDeleteOrder(id) {
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      console.error('Error deleting order: ', err);
    }
  }

  async function handleEditOrder(id, updatedData) {
    try {
      await updateDoc(doc(db, 'orders', id), updatedData);
    } catch (err) {
      console.error('Error updating order: ', err);
    }
  }

  // ── APPROVED ORDER ACTIONS ────────────────────────────────
  async function handleDeleteApproved(id) {
    try {
      await deleteDoc(doc(db, 'approvedOrders', id));
    } catch (err) {
      console.error('Error deleting approved order: ', err);
    }
  }

  async function handleDeleteAllApproved() {
    try {
      const snapshot = await getDocs(collection(db, 'approvedOrders'));
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error('Error deleting all approved orders: ', err);
    }
  }

  // ── PASSWORD ──────────────────────────────────────────────
  async function handleChangePassword(oldPwd, newPwd) {
    if (!user) return { success: false, message: 'No session.' };
    try {
      const userRef  = doc(db, 'users', user.role);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return { success: false, message: 'User profile not found in database.' };
      const data = userSnap.data();
      if (data.password !== oldPwd) return { success: false, message: 'Current password is incorrect.' };
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

      {activeTab === 'products' ? (
        <ProductsSection
          user={user}
          products={products}
          onAddProduct={handleAddProduct}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      ) : activeTab === 'add' ? (
        <SalesDashboard
          products={products}
          records={records}
          onAddRecord={handleAddRecord}
          activeTab={activeTab}
        />
      ) : activeTab === 'approved' ? (
        <ApprovedOrders
          user={user}
          approvedOrders={approvedOrders}
          onDeleteApproved={handleDeleteApproved}
          onDeleteAllApproved={handleDeleteAllApproved}
        />
      ) : activeTab === 'history' ? (
        <ProductHistory
          user={user}
          historyRecords={historyRecords}
          onDeleteHistory={handleDeleteHistory}
          onDeleteAllHistory={handleDeleteAllHistory}
        />
      ) : user.role === 'admin' ? (
        <AdminDashboard
          records={records}
          products={products}
          onApproveRecord={handleApprove}
          onDeleteRecord={handleDeleteOrder}
          onEditRecord={handleEditOrder}
        />
      ) : (
        <SalesDashboard
          products={products}
          records={records}
          onAddRecord={handleAddRecord}
          activeTab={activeTab}
        />
      )}

      <ChangePasswordModal
        isOpen={pwdOpen}
        onClose={() => setPwdOpen(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
}

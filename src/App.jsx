import { useState, useEffect } from 'react';
import { getSession, setSession } from './utils/storage';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SalesDashboard from './components/SalesDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProductsSection from './components/ProductsSection';
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
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';

export default function App() {
  const [user, setUser]       = useState(() => getSession());
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
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

  // Listen to products real-time
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setProducts(list);
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

  // PRODUCT ACTIONS
  async function handleAddProduct(data) {
    try {
      await addDoc(collection(db, 'products'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error adding product: ', err);
    }
  }

  async function handleEditProduct(id, data) {
    try {
      await updateDoc(doc(db, 'products', id), data);
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

  // ORDER ACTIONS
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

  async function handleApprove(orderId) {
    const order = records.find(r => r.id === orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    const prod = products.find(p => p.name.toLowerCase() === order.productName.toLowerCase());
    if (!prod) {
      return { success: false, message: 'Product not found in inventory.' };
    }

    try {
      const result = await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'products', prod.id);
        const orderRef = doc(db, 'orders', orderId);

        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error('Product not found in database.');
        }

        const currentQty = prodSnap.data().quantity;
        if (currentQty < order.quantity) {
          throw new Error('Insufficient stock');
        }

        // Deduct stock and round to avoid float inaccuracies
        transaction.update(prodRef, {
          quantity: Number((currentQty - order.quantity).toFixed(4))
        });

        // Delete approved order
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

      {user.role === 'admin' ? (
        activeTab === 'products' ? (
          <ProductsSection
            user={user}
            products={products}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        ) : (
          <AdminDashboard
            records={records}
            products={products}
            onApproveRecord={handleApprove}
            onDeleteRecord={handleDeleteOrder}
            onEditRecord={handleEditOrder}
          />
        )
      ) : activeTab === 'products' ? (
        <ProductsSection
          user={user}
          products={products}
          onAddProduct={handleAddProduct}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
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

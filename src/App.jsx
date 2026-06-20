import { useState, useEffect } from 'react';
import { getSession, setSession } from './utils/storage';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SalesDashboard from './components/SalesDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProductsSection from './components/ProductsSection';
import ApprovedOrders from './components/ApprovedOrders';
import ProductHistory from './components/ProductHistory';
import ProductApprovals from './components/ProductApprovals';
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
  const [approvals, setApprovals]     = useState([]);
  const [activeTab, setActiveTab]     = useState('products');
  const [pwdOpen, setPwdOpen]         = useState(false);

  // Seed default users if they do not exist
  useEffect(() => {
    if (localStorage.getItem('seed_users_done') === 'true') {
      return;
    }
    async function seedDefaultUsers() {
      try {
        console.log('[Firestore] Checking if default users exist...');
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
        localStorage.setItem('seed_users_done', 'true');
        console.log('[Firestore] Default users check complete.');
      } catch (error) {
        console.error('Error seeding users: ', error);
      }
    }
    seedDefaultUsers();
  }, []);

  // ── MANUAL DATA MIGRATION: Patch existing orders/approvedOrders with bookType ──
  async function handleRunMigration() {
    try {
      console.log('[Firestore] Starting manual bookType data migration...');
      // Migrate pending orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const orderBatch = writeBatch(db);
      let orderUpdates = 0;
      ordersSnap.forEach((d) => {
        if (!d.data().bookType) {
          orderBatch.update(d.ref, { bookType: 'Large Book' });
          orderUpdates++;
        }
      });
      if (orderUpdates > 0) await orderBatch.commit();

      // Migrate approved orders
      const approvedSnap = await getDocs(collection(db, 'approvedOrders'));
      const approvedBatch = writeBatch(db);
      let approvedUpdates = 0;
      approvedSnap.forEach((d) => {
        const data = d.data();
        const patch = {};
        if (!data.bookType) {
          patch.bookType = 'Large Book';
        }
        // Backfill approvedAt for legacy records that lack it
        if (!data.approvedAt) {
          patch.approvedAt = data.date || new Date(0).toISOString();
        }
        if (Object.keys(patch).length > 0) {
          approvedBatch.update(d.ref, patch);
          approvedUpdates++;
        }
      });
      if (approvedUpdates > 0) await approvedBatch.commit();

      localStorage.setItem('migration_bookType_done', 'true');
      console.log(`[Firestore] Migration complete: ${orderUpdates} orders, ${approvedUpdates} approved orders patched.`);
      return { success: true, message: `Migration complete: ${orderUpdates} orders, ${approvedUpdates} approved orders patched.` };
    } catch (error) {
      console.error('Book type migration error:', error);
      return { success: false, message: error.message || 'Migration failed.' };
    }
  }

  // Listen to pending orders real-time (only when logged in)
  useEffect(() => {
    if (!user) return;
    console.log('[Firestore] Attaching real-time listener for pending orders');
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Firestore] Pending orders update received: ${snapshot.size} records`);
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
    return () => {
      console.log('[Firestore] Detaching real-time listener for pending orders');
      unsubscribe();
    };
  }, [user]);

  // Listen to products real-time (only when logged in)
  useEffect(() => {
    if (!user) return;
    console.log('[Firestore] Attaching real-time listener for products');
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Firestore] Products update received: ${snapshot.size} products`);
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setProducts(list);
    });
    return () => {
      console.log('[Firestore] Detaching real-time listener for products');
      unsubscribe();
    };
  }, [user]);

  // Listen to product approvals real-time (only when logged in)
  useEffect(() => {
    if (!user) return;
    console.log('[Firestore] Attaching real-time listener for product approvals');
    const q = query(collection(db, 'productApprovals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Firestore] Product approvals update received: ${snapshot.size} records`);
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setApprovals(list);
    });
    return () => {
      console.log('[Firestore] Detaching real-time listener for product approvals');
      unsubscribe();
    };
  }, [user]);

  function handleLogin(session) {
    setUser(session);
    setActiveTab('products');
  }

  function handleLogout() {
    setSession(null);
    setUser(null);
    setRecords([]);
    setProducts([]);
    setApprovals([]);
  }

  // ── PRODUCT APPROVAL ACTIONS ──────────────────────────────
  async function handleAddProduct(data) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      console.log('[Firestore] Submitting product request for approval...');
      await addDoc(collection(db, 'productApprovals'), {
        productName: data.name.trim(),
        quantity: data.quantity,
        actionType: 'New Product',
        date: dateStr,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error creating product approval request: ', err);
    }
  }

  async function handleEditProduct(id, data) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      console.log('[Firestore] Submitting product update request for approval...');
      await addDoc(collection(db, 'productApprovals'), {
        productId: id,
        productName: data.name.trim(),
        quantity: data.quantity,
        actionType: 'Product Update',
        date: dateStr,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error creating product update request: ', err);
    }
  }

  async function handleApproveProduct(approvalId) {
    try {
      const approvalRef = doc(db, 'productApprovals', approvalId);
      
      const result = await runTransaction(db, async (transaction) => {
        const approvalSnap = await transaction.get(approvalRef);
        if (!approvalSnap.exists()) {
          throw new Error('Approval request not found.');
        }
        
        const reqData = approvalSnap.data();
        const actionType = reqData.actionType;
        const reqName = reqData.productName;
        const reqQty = reqData.quantity;
        const reqDate = reqData.date || new Date().toISOString().split('T')[0];

        if (actionType === 'New Product') {
          const existingLocal = products.find(
            (p) => p.name.toLowerCase() === reqName.toLowerCase()
          );

          let targetProductRef;
          let isNew = true;
          let newQty = reqQty;
          let finalProductName = reqName;

          if (existingLocal) {
            targetProductRef = doc(db, 'products', existingLocal.id);
            const docSnap = await transaction.get(targetProductRef);
            if (docSnap.exists()) {
              isNew = false;
              const currentQty = docSnap.data().quantity || 0;
              newQty = Number((currentQty + reqQty).toFixed(4));
              finalProductName = docSnap.data().name || finalProductName;
            }
          }

          if (isNew) {
            const newProdRef = doc(collection(db, 'products'));
            transaction.set(newProdRef, {
              name: finalProductName,
              quantity: reqQty,
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
            quantityAdded: reqQty,
            date: reqDate,
            createdAt: new Date().toISOString()
          });

        } else if (actionType === 'Product Update') {
          const prodId = reqData.productId;
          if (!prodId) throw new Error('Product ID missing in update request.');

          const prodRef = doc(db, 'products', prodId);
          const prodSnap = await transaction.get(prodRef);
          if (!prodSnap.exists()) {
            throw new Error('Original product not found.');
          }

          const prevData = prodSnap.data();
          const prevQty = prevData.quantity || 0;
          
          transaction.update(prodRef, {
            name: reqName,
            quantity: reqQty
          });

          if (reqQty > prevQty) {
            const qtyAdded = Number((reqQty - prevQty).toFixed(4));
            const historyRef = doc(collection(db, 'productHistory'));
            transaction.set(historyRef, {
              productName: reqName,
              quantityAdded: qtyAdded,
              date: reqDate,
              createdAt: new Date().toISOString()
            });
          }
        }

        transaction.delete(approvalRef);
        return { success: true };
      });

      return result;
    } catch (err) {
      console.error('Error approving product request:', err);
      return { success: false, message: err.message || 'Approval failed.' };
    }
  }

  async function handleDeleteProductApproval(approvalId) {
    try {
      await deleteDoc(doc(db, 'productApprovals', approvalId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting product approval request:', err);
      return { success: false, message: err.message || 'Deletion failed.' };
    }
  }

  async function handleBulkApproveProducts(approvalIds) {
    if (!approvalIds || approvalIds.length === 0) return { success: false, message: 'No requests selected.' };

    try {
      const result = await runTransaction(db, async (transaction) => {
        const approvalRefs = approvalIds.map(id => doc(db, 'productApprovals', id));
        const approvalSnaps = await Promise.all(approvalRefs.map(ref => transaction.get(ref)));

        const approvalsData = [];
        for (const snap of approvalSnaps) {
          if (!snap.exists()) {
            throw new Error('One or more selected requests were not found.');
          }
          approvalsData.push({ id: snap.id, ...snap.data() });
        }

        const productIdsToGet = new Set();
        const productNamesToCheck = new Set();
        
        approvalsData.forEach(req => {
          if (req.actionType === 'Product Update' && req.productId) {
            productIdsToGet.add(req.productId);
          } else if (req.actionType === 'New Product') {
            productNamesToCheck.add(req.productName.toLowerCase());
          }
        });

        products.forEach(p => {
          if (productNamesToCheck.has(p.name.toLowerCase())) {
            productIdsToGet.add(p.id);
          }
        });

        const productRefsList = Array.from(productIdsToGet).map(id => doc(db, 'products', id));
        const productSnaps = await Promise.all(productRefsList.map(ref => transaction.get(ref)));

        const productMap = {};
        productSnaps.forEach(snap => {
          if (snap.exists()) {
            const data = snap.data();
            productMap[snap.id] = { ref: snap.ref, data: { ...data } };
            productMap[data.name.toLowerCase()] = { ref: snap.ref, data: { ...data } };
          }
        });

        for (const req of approvalsData) {
          const reqName = req.productName;
          const reqQty = req.quantity;
          const reqDate = req.date || new Date().toISOString().split('T')[0];

          if (req.actionType === 'New Product') {
            const nameLower = reqName.toLowerCase();
            const existingProduct = productMap[nameLower];

            if (existingProduct) {
              const currentQty = existingProduct.data.quantity || 0;
              const newQty = Number((currentQty + reqQty).toFixed(4));
              existingProduct.data.quantity = newQty;
              
              transaction.update(existingProduct.ref, { quantity: newQty });

              const historyRef = doc(collection(db, 'productHistory'));
              transaction.set(historyRef, {
                productName: existingProduct.data.name || reqName,
                quantityAdded: reqQty,
                date: reqDate,
                createdAt: new Date().toISOString()
              });
            } else {
              const newProdRef = doc(collection(db, 'products'));
              const newProductData = {
                name: reqName,
                quantity: reqQty,
                createdAt: serverTimestamp()
              };
              transaction.set(newProdRef, newProductData);
              productMap[nameLower] = { ref: newProdRef, data: newProductData };

              const historyRef = doc(collection(db, 'productHistory'));
              transaction.set(historyRef, {
                productName: reqName,
                quantityAdded: reqQty,
                date: reqDate,
                createdAt: new Date().toISOString()
              });
            }
          } else if (req.actionType === 'Product Update') {
            const prodId = req.productId;
            const existingProduct = productMap[prodId];
            if (!existingProduct) {
              throw new Error(`Original product for "${reqName}" not found.`);
            }

            const prevQty = existingProduct.data.quantity || 0;
            existingProduct.data.quantity = reqQty;
            existingProduct.data.name = reqName;

            transaction.update(existingProduct.ref, {
              name: reqName,
              quantity: reqQty
            });

            if (reqQty > prevQty) {
              const qtyAdded = Number((reqQty - prevQty).toFixed(4));
              const historyRef = doc(collection(db, 'productHistory'));
              transaction.set(historyRef, {
                productName: reqName,
                quantityAdded: qtyAdded,
                date: reqDate,
                createdAt: new Date().toISOString()
              });
            }
          }

          const reqRef = doc(db, 'productApprovals', req.id);
          transaction.delete(reqRef);
        }

        return { success: true };
      });

      return result;
    } catch (err) {
      console.error('Bulk approval failed:', err);
      return { success: false, message: err.message || 'Bulk approval failed.' };
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

        // Verify the pending order still exists (prevents double approval)
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('This order has already been approved or deleted.');
        }

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
          bookType:    order.bookType    || 'Large Book',
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

  async function handleBulkApprove(orderIds) {
    if (!orderIds || orderIds.length === 0) return { success: false, message: 'No orders selected.' };

    try {
      const result = await runTransaction(db, async (transaction) => {
        const orderRefs = orderIds.map(id => doc(db, 'orders', id));
        const orderSnaps = await Promise.all(orderRefs.map(ref => transaction.get(ref)));

        for (const snap of orderSnaps) {
          if (!snap.exists()) {
            throw new Error('One or more selected orders have already been approved or deleted.');
          }
        }

        const ordersData = orderSnaps.map(snap => ({ id: snap.id, ...snap.data() }));
        const uniqueProductNames = [...new Set(ordersData.map(o => o.productName.toLowerCase()))];

        const productRefsMap = {};
        for (const name of uniqueProductNames) {
          const matchedProd = products.find(p => p.name.toLowerCase() === name);
          if (!matchedProd) {
            throw new Error(`Product "${name}" not found in inventory.`);
          }
          productRefsMap[name] = doc(db, 'products', matchedProd.id);
        }

        const uniqueProductNamesList = Object.keys(productRefsMap);
        const productRefs = uniqueProductNamesList.map(name => productRefsMap[name]);
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        const productQtyMap = {};
        for (let i = 0; i < uniqueProductNamesList.length; i++) {
          const name = uniqueProductNamesList[i];
          const snap = productSnaps[i];
          if (!snap.exists()) {
            throw new Error(`Product "${name}" does not exist in database.`);
          }
          productQtyMap[name] = snap.data().quantity || 0;
        }

        for (const order of ordersData) {
          const pName = order.productName.toLowerCase();
          const currentQty = productQtyMap[pName];
          productQtyMap[pName] = Number((currentQty - order.quantity).toFixed(4));
        }

        for (const name of uniqueProductNamesList) {
          transaction.update(productRefsMap[name], {
            quantity: productQtyMap[name]
          });
        }

        for (const order of ordersData) {
          const approvedRef = doc(collection(db, 'approvedOrders'));
          transaction.set(approvedRef, {
            date:        order.date        || '',
            productName: order.productName || '',
            quantity:    order.quantity    || 0,
            bookType:    order.bookType    || 'Large Book',
            status:      'approved',
            approvedAt:  new Date().toISOString()
          });

          const orderRef = doc(db, 'orders', order.id);
          transaction.delete(orderRef);
        }

        return { success: true };
      });

      return result;
    } catch (err) {
      console.error('Bulk approval transaction failed: ', err);
      return { success: false, message: err.message || 'Bulk approval failed.' };
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

  async function handleDeleteAllOrdersByBookType(bookType) {
    try {
      const snapshot = await getDocs(collection(db, 'orders'));
      const batch = writeBatch(db);
      snapshot.forEach((d) => {
        const data = d.data();
        if ((data.bookType || 'Large Book') === bookType) {
          batch.delete(d.ref);
        }
      });
      await batch.commit();
    } catch (err) {
      console.error(`Error deleting all ${bookType} orders: `, err);
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
          onDeleteApproved={handleDeleteApproved}
          onDeleteAllApproved={handleDeleteAllApproved}
        />
      ) : activeTab === 'approvals' ? (
        <ProductApprovals
          user={user}
          approvals={approvals}
          onApprove={handleApproveProduct}
          onDelete={handleDeleteProductApproval}
          onApproveBulk={handleBulkApproveProducts}
        />
      ) : activeTab === 'history' ? (
        <ProductHistory
          user={user}
          onDeleteHistory={handleDeleteHistory}
          onDeleteAllHistory={handleDeleteAllHistory}
        />
      ) : user.role === 'admin' ? (
        <AdminDashboard
          records={records}
          products={products}
          onApproveRecord={handleApprove}
          onApproveBulkRecords={handleBulkApprove}
          onDeleteRecord={handleDeleteOrder}
          onEditRecord={handleEditOrder}
          onDeleteAllOrdersByBookType={handleDeleteAllOrdersByBookType}
          onRunMigration={handleRunMigration}
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

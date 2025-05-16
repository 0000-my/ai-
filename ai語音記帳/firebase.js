// Firebase 配置和初始化

// Firebase 配置
// 注意：在實際部署時，您需要將下面的配置替換為您自己的Firebase項目配置
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCHum_i4bciKIifnwbd8-HVc-yMitgjxvc",
  authDomain: "aimoney-41903.firebaseapp.com",
  databaseURL: "https://aimoney-41903-default-rtdb.firebaseio.com",
  projectId: "aimoney-41903",
  storageBucket: "aimoney-41903.firebasestorage.app",
  messagingSenderId: "684247770695",
  appId: "1:684247770695:web:b7800a6377fbd654327362",
  measurementId: "G-CRFZN3BFJJ"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 獲取 Firestore 實例
const db = firebase.firestore();

// 獲取 Auth 實例
const auth = firebase.auth();

// 設置 Google 驗證供應商
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 當前用戶
let currentUser = null;

// 監聽用戶登入狀態
auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    console.log('用戶已登入:', user.email);
    // 觸發自定義事件，通知應用用戶已登入
    document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
  } else {
    console.log('用戶未登入');
    // 觸發自定義事件，通知應用用戶已登出
    document.dispatchEvent(new CustomEvent('userLoggedOut'));
  }
});

// 用戶使用 Google 登入
async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google 登入失敗:', error);
    return { success: false, error: error.message };
  }
}

// 用戶註冊
async function registerUser(email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('註冊失敗:', error);
    return { success: false, error: error.message };
  }
}

// 用戶登入
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('登入失敗:', error);
    return { success: false, error: error.message };
  }
}

// 用戶登出
async function logoutUser() {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('登出失敗:', error);
    return { success: false, error: error.message };
  }
}

// 保存記帳記錄
async function saveExpense(expense) {
  if (!currentUser) {
    return { success: false, error: '用戶未登入' };
  }

  try {
    const docRef = await db.collection('users').doc(currentUser.uid).collection('expenses').add({
      ...expense,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('保存記帳失敗:', error);
    return { success: false, error: error.message };
  }
}

// 獲取記帳記錄
async function getExpenses() {
  if (!currentUser) {
    return { success: false, error: '用戶未登入', expenses: [] };
  }

  try {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('expenses')
      .orderBy('createdAt', 'desc')
      .get();
    
    const expenses = [];
    snapshot.forEach(doc => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp || doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, expenses };
  } catch (error) {
    console.error('獲取記帳失敗:', error);
    return { success: false, error: error.message, expenses: [] };
  }
}

// 刪除記帳記錄
async function deleteExpense(expenseId) {
  if (!currentUser) {
    return { success: false, error: '用戶未登入' };
  }

  try {
    await db.collection('users').doc(currentUser.uid).collection('expenses').doc(expenseId).delete();
    return { success: true };
  } catch (error) {
    console.error('刪除記帳失敗:', error);
    return { success: false, error: error.message };
  }
}

// 保存用戶設定
async function saveUserSettings(settings) {
  if (!currentUser) {
    return { success: false, error: '用戶未登入' };
  }

  try {
    await db.collection('users').doc(currentUser.uid).set({
      settings: settings
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('保存設定失敗:', error);
    return { success: false, error: error.message };
  }
}

// 獲取用戶設定
async function getUserSettings() {
  if (!currentUser) {
    return { success: false, error: '用戶未登入', settings: {} };
  }

  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const data = doc.data() || {};
    
    return { success: true, settings: data.settings || {} };
  } catch (error) {
    console.error('獲取設定失敗:', error);
    return { success: false, error: error.message, settings: {} };
  }
}

// 導出函數
window.firebaseAuth = {
  registerUser,
  loginUser,
  logoutUser,
  signInWithGoogle,
  getCurrentUser: () => currentUser
};

window.firebaseDB = {
  saveExpense,
  getExpenses,
  deleteExpense,
  saveUserSettings,
  getUserSettings
};
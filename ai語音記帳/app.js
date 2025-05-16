// 全局變數
let apiKey = localStorage.getItem('gemini_api_key') || '';
let recognition;
let isRecording = false;
let currentExpense = null;
let expenseChart = null;
let settlementDate = localStorage.getItem('settlement_date') || '1';
let budgetAmount = localStorage.getItem('budget_amount') || 0;
let recognitionLang = localStorage.getItem('recognition_lang') || 'zh-TW';
let isUserLoggedIn = false;

// DOM元素
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiStatus = document.getElementById('api-status');
const startRecordBtn = document.getElementById('start-record');
const recordingStatus = document.getElementById('recording-status');
const transcript = document.getElementById('transcript');
const expenseDetails = document.getElementById('expense-details');
const saveExpenseBtn = document.getElementById('save-expense');
const historyList = document.getElementById('history-list');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const navItems = document.querySelectorAll('.nav-item');
const totalExpenseEl = document.getElementById('total-expense');
const totalIncomeEl = document.getElementById('total-income');
const balanceEl = document.getElementById('balance');
const categorySummaryEl = document.getElementById('category-summary');
const expenseChartEl = document.getElementById('expense-chart');
const themeSelect = document.getElementById('theme-select');
const languageSelect = document.getElementById('language-select');
const settlementDateSelect = document.getElementById('settlement-date');
const budgetAmountInput = document.getElementById('budget-amount');
const saveBudgetBtn = document.getElementById('save-budget');
// 認證相關DOM元素
const loginForm = document.getElementById('login-form');
const userInfo = document.getElementById('user-info');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authStatus = document.getElementById('auth-status');
const userEmailEl = document.querySelector('.user-email');

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    // 載入已保存的API Key
    if (apiKey) {
        apiKeyInput.value = apiKey;
        apiStatus.textContent = 'API Key已設置';
        apiStatus.className = 'success';
    }

    // 初始化Firebase認證
    initAuth();

    // 初始化語音識別
    initSpeechRecognition();
    
    // 初始化標籤頁切換
    initTabSwitching();
    
    // 載入主題設定
    initThemeSettings();
    
    // 載入語言設定
    initLanguageSettings();
    
    // 載入結算設定
    initSettlementSettings();
});

// 初始化認證系統
function initAuth() {
    console.log('初始化認證系統');
    console.log('loginForm元素:', loginForm);
    console.log('userInfo元素:', userInfo);
    console.log('loginBtn元素:', loginBtn);
    console.log('logoutBtn元素:', logoutBtn);
    
    // 監聽用戶登入狀態變化
    document.addEventListener('userLoggedIn', (e) => {
        const user = e.detail;
        isUserLoggedIn = true;
        userEmailEl.textContent = user.email;
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        console.log('用戶登入後UI更新 - 登入表單隱藏，用戶信息顯示');
        
        // 載入用戶數據
        loadExpenseHistory();
        updateStatistics();
    });
    
    document.addEventListener('userLoggedOut', () => {
        isUserLoggedIn = false;
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
        console.log('用戶登出後UI更新 - 登入表單顯示，用戶信息隱藏');
        
        // 清空用戶相關數據
        historyList.innerHTML = '<div class="placeholder">尚無記帳記錄</div>';
        categorySummaryEl.innerHTML = '<div class="placeholder">尚無支出記錄</div>';
        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
    });
    
    // 註冊按鈕事件
    registerBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            showAuthStatus('請輸入電子郵件和密碼', 'error');
            return;
        }
        
        const result = await window.firebaseAuth.registerUser(email, password);
        if (result.success) {
            showAuthStatus('註冊成功！您已登入', 'success');
        } else {
            showAuthStatus(`註冊失敗: ${result.error}`, 'error');
        }
    });
    
    // 登入按鈕事件
    loginBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
            showAuthStatus('請輸入電子郵件和密碼', 'error');
            return;
        }
        
        const result = await window.firebaseAuth.loginUser(email, password);
        if (result.success) {
            showAuthStatus('登入成功！', 'success');
        } else {
            showAuthStatus(`登入失敗: ${result.error}`, 'error');
        }
    });
    
    // Google登入按鈕事件
    googleLoginBtn.addEventListener('click', async () => {
        const result = await window.firebaseAuth.signInWithGoogle();
        if (result.success) {
            showAuthStatus('Google登入成功！', 'success');
        } else {
            showAuthStatus(`Google登入失敗: ${result.error}`, 'error');
        }
    });
    
    // 登出按鈕事件
    logoutBtn.addEventListener('click', async () => {
        const result = await window.firebaseAuth.logoutUser();
        if (result.success) {
            showAuthStatus('已成功登出', 'success');
        } else {
            showAuthStatus(`登出失敗: ${result.error}`, 'error');
        }
    });
}

// 顯示認證狀態訊息
function showAuthStatus(message, type) {
    authStatus.textContent = message;
    authStatus.className = type;
    
    // 5秒後自動清除狀態訊息
    setTimeout(() => {
        authStatus.textContent = '';
        authStatus.className = '';
    }, 5000);
}

// 保存API Key
saveApiKeyBtn.addEventListener('click', () => {
    const newApiKey = apiKeyInput.value.trim();
    if (newApiKey) {
        apiKey = newApiKey;
        localStorage.setItem('gemini_api_key', apiKey);
        apiStatus.textContent = 'API Key已成功保存';
        apiStatus.className = 'success';
    } else {
        apiStatus.textContent = '請輸入有效的API Key';
        apiStatus.className = 'error';
    }
});

// 初始化語音識別
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        // 創建語音識別對象
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = recognitionLang; // 使用保存的語言設定

        // 語音識別事件處理
        recognition.onstart = () => {
            isRecording = true;
            startRecordBtn.classList.add('recording');
            startRecordBtn.textContent = '停止錄音';
            recordingStatus.textContent = '正在錄音...';
            transcript.textContent = '';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            transcript.textContent = finalTranscript || interimTranscript;
        };

        recognition.onend = () => {
            isRecording = false;
            startRecordBtn.classList.remove('recording');
            startRecordBtn.textContent = '開始語音輸入';
            recordingStatus.textContent = '語音識別完成';

            // 處理語音識別結果
            if (transcript.textContent) {
                processExpenseWithGemini(transcript.textContent);
            }
        };

        recognition.onerror = (event) => {
            console.error('語音識別錯誤:', event.error);
            recordingStatus.textContent = `錯誤: ${event.error}`;
            isRecording = false;
            startRecordBtn.classList.remove('recording');
            startRecordBtn.textContent = '開始語音輸入';
        };

        // 綁定錄音按鈕事件
        startRecordBtn.addEventListener('click', toggleRecording);
    } else {
        startRecordBtn.disabled = true;
        recordingStatus.textContent = '您的瀏覽器不支持語音識別功能';
    }
}

// 切換錄音狀態
function toggleRecording() {
    if (!apiKey) {
        alert('請先設置Gemini API Key');
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// 使用Gemini API處理語音內容
async function processExpenseWithGemini(text) {
    if (!apiKey) {
        expenseDetails.innerHTML = '<div class="error">請先設置Gemini API Key</div>';
        return;
    }

    expenseDetails.innerHTML = '<div class="placeholder">正在處理語音內容...</div>';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `請分析以下語音輸入的記帳內容，並提取以下信息：
                        1. 金額
                        2. 類別（例如：食物、交通、娛樂等）
                        3. 日期（如果有提及）
                        4. 描述
                        
                        請以JSON格式回覆，格式如下：
                        {
                            "amount": 數字,
                            "category": "類別",
                            "date": "YYYY-MM-DD",
                            "description": "描述",
                            "type": "expense"或"income"
                        }
                        
                        語音內容：${text}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API請求失敗: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        // 嘗試從回應中提取JSON
        try {
            // 尋找JSON格式的內容
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const expenseData = JSON.parse(jsonMatch[0]);
                displayExpenseResult(expenseData);
                currentExpense = expenseData;
                saveExpenseBtn.disabled = false;
            } else {
                throw new Error('無法解析回應中的JSON格式');
            }
        } catch (parseError) {
            console.error('解析JSON錯誤:', parseError);
            expenseDetails.innerHTML = `<div class="error">無法解析AI回應: ${parseError.message}</div>`;
        }
    } catch (error) {
        console.error('Gemini API錯誤:', error);
        expenseDetails.innerHTML = `<div class="error">處理失敗: ${error.message}</div>`;
    }
}

// 顯示記帳結果
function displayExpenseResult(expense) {
    // 如果沒有日期，使用今天的日期
    if (!expense.date) {
        const today = new Date();
        expense.date = today.toISOString().split('T')[0];
    }

    // 格式化金額
    const formattedAmount = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD'
    }).format(expense.amount);

    // 顯示記帳詳情
    expenseDetails.innerHTML = `
        <div class="expense-item">
            <div><span class="label">類型:</span> <span class="value ${expense.type}">${expense.type === 'income' ? '收入' : '支出'}</span></div>
        </div>
        <div class="expense-item">
            <div><span class="label">金額:</span> <span class="value">${formattedAmount}</span></div>
        </div>
        <div class="expense-item">
            <div><span class="label">類別:</span> <span class="value">${expense.category}</span></div>
        </div>
        <div class="expense-item">
            <div><span class="label">日期:</span> <span class="value">${expense.date}</span></div>
        </div>
        <div class="expense-item">
            <div><span class="label">描述:</span> <span class="value">${expense.description}</span></div>
        </div>
    `;
}

// 儲存記帳按鈕點擊事件
saveExpenseBtn.addEventListener('click', async () => {
    if (!currentExpense) return;
    
    if (!isUserLoggedIn) {
        alert('請先登入再儲存記帳記錄');
        return;
    }
    
    // 使用Firebase儲存記帳
    const result = await window.firebaseDB.saveExpense(currentExpense);
    
    if (result.success) {
        // 清空當前記帳
        currentExpense = null;
        saveExpenseBtn.disabled = true;
        expenseDetails.innerHTML = '<div class="success">記帳已成功儲存！</div>';
        
        // 重新載入記帳歷史
        loadExpenseHistory();
    } else {
        expenseDetails.innerHTML = `<div class="error">儲存失敗: ${result.error}</div>`;
    }
});

// 初始化標籤頁切換
function initTabSwitching() {
    // 桌面版標籤切換
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // 更新標籤狀態
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 更新底部導航狀態
            navItems.forEach(item => {
                if (item.getAttribute('data-tab') === tabId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            // 更新內容區域
            tabContents.forEach(content => {
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // 如果切換到統計頁面，更新圖表
            if (tabId === 'stats') {
                updateStatistics();
            }
        });
    });
    
    // 移動版底部導航切換
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            
            // 更新底部導航狀態
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // 更新標籤狀態
            tabs.forEach(tab => {
                if (tab.getAttribute('data-tab') === tabId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            // 更新內容區域
            tabContents.forEach(content => {
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // 如果切換到統計頁面，更新圖表
            if (tabId === 'stats') {
                updateStatistics();
            }
        });
    });
}

// 初始化主題設定
function initThemeSettings() {
    // 檢查是否有保存的主題設定
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    
    // 監聽主題變更
    themeSelect.addEventListener('change', () => {
        const theme = themeSelect.value;
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    });
}

// 應用主題
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// 更新統計數據
async function updateStatistics() {
    if (!isUserLoggedIn) {
        totalExpenseEl.textContent = 'NT$0';
        totalIncomeEl.textContent = 'NT$0';
        balanceEl.textContent = 'NT$0';
        categorySummaryEl.innerHTML = '<div class="placeholder">請先登入以查看統計數據</div>';
        return;
    }
    
    // 從Firebase獲取記帳記錄
    const result = await window.firebaseDB.getExpenses();
    
    if (!result.success) {
        return;
    }
    
    const expenses = result.expenses;
    
    if (expenses.length === 0) {
        totalExpenseEl.textContent = 'NT$0';
        totalIncomeEl.textContent = 'NT$0';
        balanceEl.textContent = 'NT$0';
        categorySummaryEl.innerHTML = '<div class="placeholder">尚無記帳記錄</div>';
        
        // 清除圖表
        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
        return;
    }
    
    // 獲取當前日期
    const now = new Date();
    
    // 根據結算日計算當前結算週期
    let startDate, endDate;
    
    if (settlementDate === 'end') {
        // 如果結算日是月底
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // 上個月的結算日到這個月的結算日
        startDate = new Date(currentYear, currentMonth - 1, 1);
        startDate.setDate(startDate.getDate() + 1); // 上個月的第一天
        
        endDate = new Date(currentYear, currentMonth + 1, 0); // 當月的最後一天
    } else {
        // 如果結算日是固定日期
        const settlementDay = parseInt(settlementDate);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();
        
        if (currentDay >= settlementDay) {
            // 如果當前日期已過結算日，則計算當月結算日到下月結算日
            startDate = new Date(currentYear, currentMonth, settlementDay);
            endDate = new Date(currentYear, currentMonth + 1, settlementDay - 1);
        } else {
            // 如果當前日期未到結算日，則計算上月結算日到當月結算日
            startDate = new Date(currentYear, currentMonth - 1, settlementDay);
            endDate = new Date(currentYear, currentMonth, settlementDay - 1);
        }
    }
    
    // 篩選當前結算週期的記錄
    const currentPeriodExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.timestamp);
        return expenseDate >= startDate && expenseDate <= endDate;
    });
    
    // 計算總支出和總收入
    let totalExpense = 0;
    let totalIncome = 0;
    
    currentPeriodExpenses.forEach(expense => {
        if (expense.type === 'expense') {
            totalExpense += expense.amount;
        } else {
            totalIncome += expense.amount;
        }
    });
    
    // 計算結餘
    const balance = totalIncome - totalExpense;
    
    // 更新UI
    totalExpenseEl.textContent = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD'
    }).format(totalExpense);
    
    totalIncomeEl.textContent = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD'
    }).format(totalIncome);
    
    balanceEl.textContent = new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD'
    }).format(balance);
    
    balanceEl.className = 'card-value' + (balance >= 0 ? ' income' : '');
    
    // 顯示預算進度
    if (budgetAmount > 0) {
        const budgetProgress = Math.min(100, (totalExpense / budgetAmount) * 100);
        const budgetRemaining = Math.max(0, budgetAmount - totalExpense);
        
        // 決定進度條顏色
        let progressClass = '';
        if (budgetProgress >= 90) {
            progressClass = 'danger';
        } else if (budgetProgress >= 70) {
            progressClass = 'warning';
        }
        
        // 在統計卡片區域添加預算信息
        const budgetCard = document.createElement('div');
        budgetCard.className = 'summary-card';
        budgetCard.innerHTML = `
            <div class="card-title">預算剩餘</div>
            <div class="card-value ${budgetRemaining > 0 ? 'income' : ''}">${new Intl.NumberFormat('zh-TW', {
                style: 'currency',
                currency: 'TWD'
            }).format(budgetRemaining)}</div>
            <div class="budget-progress">
                <div class="progress-bar ${progressClass}" style="width: ${budgetProgress}%"></div>
            </div>
            <div class="budget-text">${budgetProgress.toFixed(0)}%</div>
        `;
        
        // 將預算卡片添加到摘要卡片區域
        document.querySelector('.summary-cards').appendChild(budgetCard);
    }
    
    // 按類別統計支出
    const categoryExpenses = {};
    const categoryColors = {};
    
    // 預設顏色
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC249', '#EA5F89', '#00D8B6', '#FFB6C1'
    ];
    
    currentPeriodExpenses.filter(e => e.type === 'expense').forEach((expense, index) => {
        if (!categoryExpenses[expense.category]) {
            categoryExpenses[expense.category] = 0;
            categoryColors[expense.category] = colors[Object.keys(categoryExpenses).length % colors.length];
        }
        categoryExpenses[expense.category] += expense.amount;
    });
    
    // 更新類別統計
    if (Object.keys(categoryExpenses).length > 0) {
        categorySummaryEl.innerHTML = '<h3>類別統計</h3>';
        
        // 按金額排序
        const sortedCategories = Object.entries(categoryExpenses)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => ({
                category,
                amount,
                color: categoryColors[category]
            }));
        
        sortedCategories.forEach(item => {
            const percentage = ((item.amount / totalExpense) * 100).toFixed(1);
            const formattedAmount = new Intl.NumberFormat('zh-TW', {
                style: 'currency',
                currency: 'TWD'
            }).format(item.amount);
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-name">
                    <div class="category-color" style="background-color: ${item.color}"></div>
                    ${item.category} (${percentage}%)
                </div>
                <div>${formattedAmount}</div>
            `;
            
            categorySummaryEl.appendChild(categoryItem);
        });
        
        // 更新圖表
        updateExpenseChart(sortedCategories);
    } else {
        categorySummaryEl.innerHTML = '<div class="placeholder">本月尚無支出記錄</div>';
        
        // 清除圖表
        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
    }
}

// 更新支出圖表
function updateExpenseChart(categories) {
    // 如果已有圖表，先銷毀
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    // 準備圖表數據
    const data = {
        labels: categories.map(c => c.category),
        datasets: [{
            data: categories.map(c => c.amount),
            backgroundColor: categories.map(c => c.color),
            borderWidth: 0
        }]
    };
    
    // 創建圖表
    expenseChart = new Chart(expenseChartEl, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// 初始化語言設定
function initLanguageSettings() {
    // 設置語言選擇器的值
    languageSelect.value = recognitionLang;
    
    // 監聽語言變更
    languageSelect.addEventListener('change', () => {
        recognitionLang = languageSelect.value;
        localStorage.setItem('recognition_lang', recognitionLang);
        
        // 更新語音識別的語言
        if (recognition) {
            recognition.lang = recognitionLang;
        }
    });
}

// 初始化結算設定
function initSettlementSettings() {
    // 設置結算日選擇器的值
    settlementDateSelect.value = settlementDate;
    
    // 設置預算輸入框的值
    if (budgetAmount > 0) {
        budgetAmountInput.value = budgetAmount;
    }
    
    // 監聽結算日變更
    settlementDateSelect.addEventListener('change', () => {
        settlementDate = settlementDateSelect.value;
        localStorage.setItem('settlement_date', settlementDate);
        
        // 更新統計數據
        updateStatistics();
    });
    
    // 監聽預算設定
    saveBudgetBtn.addEventListener('click', () => {
        const newBudget = parseFloat(budgetAmountInput.value);
        if (!isNaN(newBudget) && newBudget > 0) {
            budgetAmount = newBudget;
            localStorage.setItem('budget_amount', budgetAmount);
            
            // 更新統計數據
            updateStatistics();
        } else {
            alert('請輸入有效的預算金額');
        }
    });
}

// 載入記帳歷史
async function loadExpenseHistory() {
    if (!isUserLoggedIn) {
        historyList.innerHTML = '<div class="placeholder">請先登入以查看記帳記錄</div>';
        return;
    }
    
    // 從Firebase獲取記帳記錄
    const result = await window.firebaseDB.getExpenses();
    
    if (!result.success || result.expenses.length === 0) {
        historyList.innerHTML = '<div class="placeholder">尚無記帳記錄</div>';
        return;
    }
    
    // 按時間排序，最新的在前面
    const expenses = result.expenses;
    
    // 清空歷史列表
    historyList.innerHTML = '';
    
    // 顯示最近的10筆記錄
    const recentExpenses = expenses.slice(0, 10);
    
    recentExpenses.forEach((expense) => {
        const date = new Date(expense.timestamp).toLocaleDateString('zh-TW');
        const formattedAmount = new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD'
        }).format(expense.amount);
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div>
                <div>${expense.description}</div>
                <div class="date">${date} · ${expense.category}</div>
            </div>
            <div class="history-item-right">
                <div class="amount ${expense.type}">${expense.type === 'income' ? '+' : '-'}${formattedAmount}</div>
                <button class="delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
    
    // 添加刪除按鈕事件監聽
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            if (confirm('確定要刪除這筆記帳嗎？')) {
                deleteExpense(id);
            }
        });
    });
    
    // 更新統計數據
    updateStatistics();
}

// 刪除記帳記錄
async function deleteExpense(id) {
    if (!isUserLoggedIn) return;
    
    // 使用Firebase刪除記帳
    const result = await window.firebaseDB.deleteExpense(id);
    
    if (result.success) {
        // 更新UI
        loadExpenseHistory();
        updateStatistics();
    } else {
        alert(`刪除失敗: ${result.error}`);
    }
}
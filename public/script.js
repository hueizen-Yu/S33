document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    const formPage = document.getElementById('form-page');
    const listPage = document.getElementById('list-page');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const goToRegisterBtn = document.getElementById('go-to-register');
    const goToLoginBtn = document.getElementById('go-to-login');

    const form = document.getElementById('health-form');
    const viewRecordsBtn = document.getElementById('view-records-btn');
    const backBtn = document.getElementById('back-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    
    const recordsBody = document.getElementById('records-body');
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    
    // Navigation functions
    const showPage = (page) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        page.classList.add('active');
    };

    goToRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(registerPage);
    });

    goToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(loginPage);
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const gender = document.getElementById('reg-gender').value;

        const btn = registerForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = '註冊中...';

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, gender })
            });
            const data = await res.json();
            if (res.ok) {
                alert('註冊成功！請使用新帳號登入。');
                registerForm.reset();
                showPage(loginPage);
            } else {
                alert('註冊失敗：' + data.error);
            }
        } catch (err) {
            alert('無法連接到伺服器');
        } finally {
            btn.disabled = false;
            btn.textContent = '註冊';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const pwd = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = '登入中...';
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: pwd })
            });
            if (res.ok) {
                const data = await res.json();
                sessionStorage.setItem('token', data.token);
                showPage(formPage);
            } else {
                alert('密碼錯誤！請重新輸入。');
            }
        } catch (err) {
            alert('無法連接到伺服器');
        } finally {
            btn.disabled = false;
            btn.textContent = '登入';
        }
    });

    viewRecordsBtn.addEventListener('click', () => {
        showPage(listPage);
        fetchRecords();
    });

    backBtn.addEventListener('click', () => {
        showPage(formPage);
    });

    exportExcelBtn.addEventListener('click', () => {
        const table = document.getElementById('records-table');
        const wb = XLSX.utils.table_to_book(table, { sheet: "健康紀錄" });
        XLSX.writeFile(wb, "HealthRecords.xlsx");
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const height = parseFloat(document.getElementById('height').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const age = parseInt(document.getElementById('age').value);

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '儲存中...';

        try {
            const response = await fetch('/api/records', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify({ height, weight, age })
            });

            if (response.ok) {
                // Reset form
                form.reset();
                // Navigate to list and refresh data
                showPage(listPage);
                await fetchRecords();
            } else {
                alert('儲存失敗，請稍後再試。');
            }
        } catch (error) {
            console.error('Error saving record:', error);
            alert('無法連接到伺服器，請確認伺服器正在執行。');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '儲存並查看記錄';
        }
    });

    // Fetch and display records
    async function fetchRecords() {
        // Show loading state
        recordsBody.innerHTML = '';
        loadingIndicator.classList.remove('hidden');
        emptyState.classList.add('hidden');

        try {
            const response = await fetch('/api/records', {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            });
            
            if (response.status === 401) {
                alert('登入已過期或未授權，請重新登入');
                showPage(loginPage);
                return;
            }
            
            const result = await response.json();
            
            loadingIndicator.classList.add('hidden');
            
            if (result.data && result.data.length > 0) {
                renderRecords(result.data);
            } else {
                emptyState.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching records:', error);
            loadingIndicator.classList.add('hidden');
            recordsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">無法載入資料</td></tr>';
        }
    }

    function renderRecords(records) {
        recordsBody.innerHTML = records.map(record => {
            // Determine BMI category color
            let bmiColor = '#1f2937';
            if (record.bmi < 18.5) bmiColor = '#3b82f6'; // Blue for underweight
            else if (record.bmi >= 24) bmiColor = '#ef4444'; // Red for overweight/obese
            else bmiColor = '#10b981'; // Green for normal

            return `
                <tr>
                    <td>${record.date}</td>
                    <td>${record.username || '匿名'}</td>
                    <td>${record.height}</td>
                    <td>${record.weight}</td>
                    <td>${record.age}</td>
                    <td style="color: ${bmiColor}; font-weight: 600;">${record.bmi}</td>
                </tr>
            `;
        }).join('');
    }
});

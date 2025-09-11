
        // Import Firebase modules
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
        import { getFirestore, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

        // Firebase config
        const env = (typeof window !== 'undefined' && window.ENV) ? window.ENV : {};
        const firebaseConfig = {
            apiKey: env.FIREBASE_API_KEY || "AIzaSyDrXnTenv-nXC8AOgHePOuQZUOXnYUvhlk",
            authDomain: env.FIREBASE_AUTH_DOMAIN || "matkul-1c.firebaseapp.com",
            projectId: env.FIREBASE_PROJECT_ID || "matkul-1c",
            storageBucket: env.FIREBASE_STORAGE_BUCKET || "matkul-1c.appspot.com",
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "538741250564",
            appId: env.FIREBASE_APP_ID || "1:538741250564:web:c71c03f93b7ba0e607b351"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Global data
        let scheduleData = [];
        let tasksData = [];
        let currentFilter = 'all';
        let currentView = 'main';

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            initApp();
        });

        async function initApp() {
            createStars();
            updateTime();
            setInterval(updateTime, 1000);
            
            setupEventListeners();
            await loadAllData();
        }

        function createStars() {
            const stars = document.getElementById('stars');
            for (let i = 0; i < 30; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 4 + 's';
                stars.appendChild(star);
            }
        }

        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            document.getElementById('currentTime').textContent = timeString;
        }

        function updateConnectionStatus(status) {
            const statusElement = document.getElementById('firebaseStatus');
            statusElement.className = `status-dot ${status}`;
        }

        function getTaskDeadlineStatus(deadline) {
            const deadlineDate = new Date(deadline);
            const now = new Date();
            const timeDiff = deadlineDate - now;
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff < 0) {
                return { status: 'overdue', class: 'task-overdue', color: 'danger' };
            } else if (daysDiff === 0) {
                return { status: 'today', class: 'task-danger', color: 'danger' };
            } else if (daysDiff <= 1) {
                return { status: 'danger', class: 'task-danger', color: 'danger' };
            } else if (daysDiff <= 3) {
                return { status: 'warning', class: 'task-warning', color: 'warning' };
            } else if (daysDiff <= 7) {
                return { status: 'safe', class: 'task-warning', color: 'warning' };
            } else {
                return { status: 'safe', class: 'task-safe', color: 'info' };
            }
        }

        async function loadAllData() {
            try {
                updateConnectionStatus('loading');
                document.getElementById('systemStatus').textContent = 'connecting to firebase...';
                
                // Load schedule data
                const scheduleSnapshot = await getDocs(collection(db, "jadwal"));
                scheduleData = [];
                scheduleSnapshot.forEach((doc) => {
                    const data = doc.data();
                    scheduleData.push({
                        id: doc.id,
                        mata_kuliah: data.matkul || '',
                        dosen: data.dosen || '',
                        hari: data.hari || '',
                        waktu_masuk: data.waktu_masuk || '00:00',
                        waktu_keluar: data.waktu_keluar || '00:00',
                        ruang: data.ruang || 'TBA'
                    });
                });

                // Load tasks data
                const tasksSnapshot = await getDocs(collection(db, "tugas"));
                tasksData = [];
                tasksSnapshot.forEach((doc) => {
                    const data = doc.data();
                    tasksData.push({
                        id: doc.id,
                        tugas: data.tugas || '',
                        deadline: data.deadline || '',
                        matkul: data.matkul || '',
                        dosen: data.dosen || '',
                        catatan: data.catatan || '',
                        status: data.status || 'belum',
                        deskripsi: data.deskripsi || data.catatan || 'No description available'
                    });
                });

                updateConnectionStatus('connected');
                
                renderAllData();
                updateOverview();

            } catch (error) {
                console.error('Error loading data:', error);
                updateConnectionStatus('error');
                document.getElementById('systemStatus').textContent = 'connection failed: ' + error.message;
                showError('Failed to load data from Firebase');
            }
        }

        function renderAllData() {
            renderSchedule();
            renderTasks();
            renderCourses();
            renderTodayClasses();
            renderPendingTasks();
        }

        function renderSchedule() {
            const container = document.getElementById('scheduleList');
            const now = new Date();
            const currentDay = now.toLocaleDateString('id-ID', { weekday: 'long' });
            const currentTime = now.toTimeString().slice(0, 5);

            let filteredData = scheduleData;
            if (currentFilter !== 'all') {
                filteredData = scheduleData.filter(item => item.hari === currentFilter);
            }

            if (filteredData.length === 0) {
                container.innerHTML = '<div class="error">no classes found for selected day</div>';
                document.getElementById('scheduleBadge').textContent = '0 classes';
                return;
            }

            // Sort by day and time
            filteredData.sort((a, b) => {
                const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                const dayDiff = dayOrder.indexOf(a.hari) - dayOrder.indexOf(b.hari);
                if (dayDiff !== 0) return dayDiff;
                return a.waktu_masuk.localeCompare(b.waktu_masuk);
            });

            container.innerHTML = filteredData.map(item => {
                const isToday = item.hari === currentDay;
                const isActive = isToday && currentTime >= item.waktu_masuk && currentTime <= item.waktu_keluar;
                
                return `
                    <div class="list-item ${isActive ? 'active' : ''}" style="cursor: default;">
                        <div>
                            <div class="list-title">${item.mata_kuliah.toLowerCase()}</div>
                            <div class="list-meta">${item.hari.toLowerCase()} ${item.waktu_masuk}-${item.waktu_keluar} • ${item.ruang} • ${item.dosen}</div>
                        </div>
                        <div class="list-action">${isActive ? 'running' : isToday ? 'today' : ''}</div>
                    </div>
                `;
            }).join('');

            document.getElementById('scheduleBadge').textContent = `${filteredData.length} classes`;
        }

        function renderTasks() {
            const container = document.getElementById('tasksList');
            
            if (tasksData.length === 0) {
                container.innerHTML = '<div class="error">no tasks found</div>';
                document.getElementById('tasksBadge').textContent = '0 tasks';
                return;
            }

            // Sort by deadline and status
            const sortedTasks = [...tasksData].sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === 'belum' ? -1 : 1;
                }
                return new Date(a.deadline) - new Date(b.deadline);
            });

            container.innerHTML = sortedTasks.map(task => {
                const isCompleted = task.status === 'selesai';
                const deadlineStatus = getTaskDeadlineStatus(task.deadline);
                const deadline = new Date(task.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                
                let itemClass = `list-item ${deadlineStatus.class}`;
                let actionText = 'pending';
                let actionClass = `list-action ${deadlineStatus.color}`;
                
                if (isCompleted) {
                    itemClass = 'list-item task-completed';
                    actionText = 'completed';
                    actionClass = 'list-action';
                } else if (daysLeft < 0) {
                    actionText = `${Math.abs(daysLeft)}d overdue`;
                } else if (daysLeft === 0) {
                    actionText = 'due today';
                } else if (daysLeft <= 2) {
                    actionText = daysLeft === 1 ? '1d left' : `${daysLeft}d left`;
                } else if (daysLeft <= 7) {
                    actionText = `${daysLeft}d left`;
                } else {
                    actionText = `${daysLeft}d left`;
                }

                return `
                    <div class="${itemClass}" onclick="showTaskDetail('${task.id}')">
                        <div>
                            <div class="list-title">${task.tugas.toLowerCase()}</div>
                            <div class="list-meta">${task.matkul} • ${task.dosen} • ${task.deadline}</div>
                            ${task.catatan ? `<div class="task-notes-preview wrap-text">${task.catatan}</div>` : ''}
                        </div>
                        <div class="${actionClass}">${actionText}</div>
                    </div>
                `;
            }).join('');

            const pendingCount = tasksData.filter(t => t.status === 'belum').length;
            document.getElementById('tasksBadge').textContent = `${pendingCount} pending`;
        }

        function renderCourses() {
            const container = document.getElementById('coursesList');
            
            // Extract unique courses from schedule and tasks
            const coursesFromSchedule = [...new Set(scheduleData.map(s => s.mata_kuliah))];
            const coursesFromTasks = [...new Set(tasksData.map(t => t.matkul))];
            const allCourses = [...new Set([...coursesFromSchedule, ...coursesFromTasks])];

            if (allCourses.length === 0) {
                container.innerHTML = '<div class="error">no courses found</div>';
                document.getElementById('coursesBadge').textContent = '0 courses';
                return;
            }

            container.innerHTML = allCourses.map(course => {
                const scheduleCount = scheduleData.filter(s => s.mata_kuliah === course).length;
                const taskCount = tasksData.filter(t => t.matkul === course && t.status === 'belum').length;
                const instructor = scheduleData.find(s => s.mata_kuliah === course)?.dosen || 
                                tasksData.find(t => t.matkul === course)?.dosen || 'TBA';

                return `
                    <div class="list-item" style="cursor: default;">
                        <div>
                            <div class="list-title">${course.toLowerCase()}</div>
                            <div class="list-meta">${instructor} • ${scheduleCount} sessions/week</div>
                        </div>
                        <div class="list-action ${taskCount > 0 ? 'warning' : ''}">${taskCount} tasks</div>
                    </div>
                `;
            }).join('');

            document.getElementById('coursesBadge').textContent = `${allCourses.length} enrolled`;
        }

        function renderTodayClasses() {
            const container = document.getElementById('todayClasses');
            const now = new Date();
            const currentDay = now.toLocaleDateString('id-ID', { weekday: 'long' });
            
            const todayClasses = scheduleData.filter(item => item.hari === currentDay);
            
            if (todayClasses.length === 0) {
                container.innerHTML = '<div class="terminal">no classes scheduled for today</div>';
                return;
            }

            container.innerHTML = todayClasses.map(item => `
                <div class="list-item" style="cursor: default;">
                    <div>
                        <div class="list-title">${item.mata_kuliah.toLowerCase()}</div>
                        <div class="list-meta">${item.waktu_masuk}-${item.waktu_keluar} • ${item.ruang}</div>
                    </div>
                    <div class="list-action">${item.dosen}</div>
                </div>
            `).join('');
        }

        function renderPendingTasks() {
            const container = document.getElementById('pendingTasks');
            const pendingTasks = tasksData.filter(task => task.status === 'belum');
            
            if (pendingTasks.length === 0) {
                container.innerHTML = '<div class="terminal">all tasks completed! great work</div>';
                return;
            }

            // Show only next 3 pending tasks
            const nextTasks = pendingTasks
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                .slice(0, 3);

            container.innerHTML = nextTasks.map(task => {
                const deadlineStatus = getTaskDeadlineStatus(task.deadline);
                const deadline = new Date(task.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                
                let actionText = `${daysLeft}d left`;
                if (daysLeft < 0) {
                    actionText = `${Math.abs(daysLeft)}d overdue`;
                } else if (daysLeft === 0) {
                    actionText = 'due today';
                }
                
                return `
                    <div class="list-item ${deadlineStatus.class}" onclick="showTaskDetail('${task.id}')">
                        <div>
                            <div class="list-title">${task.tugas.toLowerCase()}</div>
                            <div class="list-meta">${task.matkul} • due ${task.deadline}</div>
                        </div>
                        <div class="list-action ${deadlineStatus.color}">${actionText}</div>
                    </div>
                `;
            }).join('');
        }

        function updateOverview() {
            const todayCount = scheduleData.filter(s => 
                s.hari === new Date().toLocaleDateString('id-ID', { weekday: 'long' })
            ).length;
            const pendingCount = tasksData.filter(t => t.status === 'belum').length;
            
            // Calculate progress (example: completed tasks / total tasks)
            const totalTasks = tasksData.length;
            const completedTasks = tasksData.filter(t => t.status === 'selesai').length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            
            document.getElementById('overviewBadge').textContent = `${Math.round(progress)}% done`;
            document.getElementById('progressBar').style.width = progress + '%';
            
            let statusText = `${scheduleData.length} classes loaded, ${pendingCount} tasks pending`;
            if (todayCount > 0) {
                statusText += `, ${todayCount} classes today`;
            }
            document.getElementById('systemStatus').textContent = statusText;
        }

        function showTaskDetail(taskId) {
            const task = tasksData.find(t => t.id === taskId);
            if (!task) return;

            // Hide main navigation and show back button
            document.getElementById('mainNav').classList.add('section-hidden');
            document.getElementById('backBtn').classList.add('show');
            
            // Hide all tabs and show task detail
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById('taskDetail').classList.add('active');
            
            // Populate task details
            document.getElementById('taskDetailTitle').textContent = task.tugas;
            document.getElementById('taskDetailTask').textContent = task.tugas;
            document.getElementById('taskDetailDescription').textContent = task.deskripsi || task.catatan || 'No description available';
            document.getElementById('taskDetailDeadline').textContent = task.deadline;
            document.getElementById('taskDetailCourse').textContent = task.matkul;
            document.getElementById('taskDetailInstructor').textContent = task.dosen;
            document.getElementById('taskDetailNotes').textContent = task.catatan || 'No additional notes';
            
            currentView = 'taskDetail';
        }

        function goBack() {
            // Show main navigation and hide back button
            document.getElementById('mainNav').classList.remove('section-hidden');
            document.getElementById('backBtn').classList.remove('show');
            
            // Show tasks tab (where we came from)
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById('tasks').classList.add('active');
            
            // Update navigation state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('.nav-item[onclick="switchTab(\'tasks\')"]').classList.add('active');
            
            currentView = 'main';
        }

        function setupEventListeners() {
            // Day filter buttons for schedule
            const dayButtons = document.querySelectorAll('.day-btn');
            dayButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons
                    dayButtons.forEach(btn => btn.classList.remove('active'));
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Update filter and re-render schedule
                    currentFilter = button.dataset.day;
                    renderSchedule();
                });
            });

            // Set up real-time listeners for data changes
            setupRealtimeListeners();
        }

        function setupRealtimeListeners() {
            // Real-time listener for schedule changes
            onSnapshot(collection(db, "jadwal"), (snapshot) => {
                scheduleData = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    scheduleData.push({
                        id: doc.id,
                        mata_kuliah: data.matkul || '',
                        dosen: data.dosen || '',
                        hari: data.hari || '',
                        waktu_masuk: data.waktu_masuk || '00:00',
                        waktu_keluar: data.waktu_keluar || '00:00',
                        ruang: data.ruang || 'TBA'
                    });
                });
                
                if (currentView === 'main') {
                    renderAllData();
                    updateOverview();
                }
            });

            // Real-time listener for tasks changes
            onSnapshot(collection(db, "tugas"), (snapshot) => {
                tasksData = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    tasksData.push({
                        id: doc.id,
                        tugas: data.tugas || '',
                        deadline: data.deadline || '',
                        matkul: data.matkul || '',
                        dosen: data.dosen || '',
                        catatan: data.catatan || '',
                        status: data.status || 'belum',
                        deskripsi: data.deskripsi || data.catatan || 'No description available'
                    });
                });
                
                if (currentView === 'main') {
                    renderAllData();
                    updateOverview();
                }
            });
        }

        function switchTab(tabId) {
            if (currentView !== 'main') return; // Don't switch tabs if not in main view
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabId).classList.add('active');
            
            // Update navigation items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Activate the clicked navigation item
            event.target.classList.add('active');
            
            // If switching to schedule tab, ensure proper rendering
            if (tabId === 'schedule') {
                renderSchedule();
            }
        }

        function refreshData() {
            // Show loading state
            document.getElementById('systemStatus').textContent = 'refreshing data...';
            updateConnectionStatus('loading');
            
            // Animate the refresh button
            const fab = document.querySelector('.fab');
            fab.style.transform = 'rotate(360deg)';
            fab.style.transition = 'transform 0.5s ease';
            
            setTimeout(() => {
                fab.style.transform = 'rotate(0deg)';
                loadAllData();
            }, 500);
        }

        function showError(message) {
            // Create a temporary error notification
            const errorDiv = document.createElement('div');
            errorDiv.textContent = message;
            errorDiv.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: var(--accent-danger);
                color: white;
                padding: 1rem;
                border-radius: 4px;
                z-index: 1000;
                font-size: 0.9rem;
                max-width: 300px;
            `;
            
            document.body.appendChild(errorDiv);
            
            // Remove after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }

        // Make functions available globally for onclick handlers
        window.switchTab = switchTab;
        window.refreshData = refreshData;
        window.showTaskDetail = showTaskDetail;
        window.goBack = goBack;

        // Initialize the app
        initApp();
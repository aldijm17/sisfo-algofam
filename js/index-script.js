        // Import Firebase modules
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
        import { getFirestore, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

        // Firebase config
        const firebaseConfig = {
            apiKey: "AIzaSyDrXnTenv-nXC8AOgHePOuQZUOXnYUvhlk",
            authDomain: "matkul-1c.firebaseapp.com",
            projectId: "matkul-1c",
            storageBucket: "matkul-1c.appspot.com",
            messagingSenderId: "538741250564",
            appId: "1:538741250564:web:c71c03f93b7ba0e607b351"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Global data
        let scheduleData = [];
        let tasksData = [];
        let currentTab = 'beranda';
        let currentView = 'main';
        let isScrolling = false;

        // Icon array for dynamic icon
        const icons = ['🚀', '💻', '📚', '⚡', '🎯', '🌟', '🔥', '💡'];
        let currentIconIndex = 0;

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            initApp();
        });

        async function initApp() {
            updateTime();
            setInterval(updateTime, 1000);
            
            setupEventListeners();
            setupParallaxEffect();
            setupPullToRefresh();
            await loadAllData();
        }

        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            const dateString = now.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            document.getElementById('currentTime').textContent = timeString;
            document.getElementById('currentDate').textContent = dateString;
        }

        function setupEventListeners() {
            // Search functionality
            const searchBar = document.getElementById('searchBar');
            const searchResults = document.getElementById('searchResults');
            
            searchBar.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                if (query.length > 2) {
                    performSearch(query);
                } else {
                    searchResults.classList.remove('show');
                }
            });

            // Click outside to close search results
            document.addEventListener('click', (e) => {
                if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.remove('show');
                }
            });

            // Day indicator clicks for schedule
            document.querySelectorAll('.tab-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const day = dot.dataset.day;
                    filterScheduleByDay(day);
                    
                    // Update active indicator
                    document.querySelectorAll('.tab-dot').forEach(d => d.classList.remove('active'));
                    dot.classList.add('active');
                });
            });

            setupRealtimeListeners();
        }

        function setupParallaxEffect() {
            const header = document.getElementById('header');
            
            window.addEventListener('scroll', () => {
                const scrollY = window.scrollY;
                const headerRect = header.getBoundingClientRect();
                const headerTop = headerRect.top + scrollY;
                
                // Calculate when header should start transitioning
                const triggerPoint = headerTop - 100;
                
                if (scrollY > triggerPoint && !header.classList.contains('scrolled')) {
                    header.classList.add('scrolled');
                } else if (scrollY <= triggerPoint && header.classList.contains('scrolled')) {
                    header.classList.remove('scrolled');
                }
                
                // Enhanced parallax effect for header content
                const timeElement = document.getElementById('currentTime');
                const dateElement = document.getElementById('currentDate');
                
                // Calculate parallax based on distance from header
                const parallaxIntensity = Math.max(0, (scrollY - triggerPoint) * 0.1);
                
                if (scrollY > triggerPoint) {
                    timeElement.style.transform = `translateY(${parallaxIntensity}px) scale(${1 - parallaxIntensity * 0.01})`;
                    dateElement.style.transform = `translateY(${parallaxIntensity * 0.8}px)`;
                } else {
                    // Smooth reset when scrolling back up
                    timeElement.style.transform = 'translateY(0px) scale(1)';
                    dateElement.style.transform = 'translateY(0px)';
                }
            });
        }

        function setupPullToRefresh() {
            let startY = 0;
            let pullDistance = 0;
            const threshold = 100;
            const pullRefresh = document.getElementById('pullRefresh');
            
            document.addEventListener('touchstart', (e) => {
                if (window.scrollY === 0) {
                    startY = e.touches[0].clientY;
                }
            }, { passive: true });
            
            document.addEventListener('touchmove', (e) => {
                if (window.scrollY === 0 && startY > 0) {
                    pullDistance = e.touches[0].clientY - startY;
                    
                    if (pullDistance > 0) {
                        e.preventDefault();
                        const progress = Math.min(pullDistance / threshold, 1);
                        pullRefresh.style.transform = `translateY(${progress * 100 - 100}%)`;
                        
                        if (pullDistance > threshold) {
                            pullRefresh.textContent = 'Lepaskan untuk muat ulang';
                        } else {
                            pullRefresh.textContent = 'Tarik ke atas untuk muat ulang';
                        }
                    }
                }
            }, { passive: false });
            
            document.addEventListener('touchend', () => {
                if (pullDistance > threshold) {
                    pullRefresh.classList.add('show');
                    pullRefresh.textContent = 'Memuat ulang data...';
                    refreshData();
                }
                
                setTimeout(() => {
                    pullRefresh.style.transform = 'translateY(-100%)';
                    pullRefresh.classList.remove('show');
                }, 300);
                
                startY = 0;
                pullDistance = 0;
            });
        }

        function updateConnectionStatus(status) {
            const statusElement = document.getElementById('firebaseStatus');
            const statusText = document.getElementById('connectionText');
            
            statusElement.className = `status-dot ${status}`;
            
            switch(status) {
                case 'connected':
                    statusText.textContent = 'Terhubung';
                    break;
                case 'loading':
                    statusText.textContent = 'Memuat...';
                    break;
                case 'error':
                    statusText.textContent = 'Error';
                    break;
                default:
                    statusText.textContent = 'Menghubungkan...';
            }
        }

        async function loadAllData() {
            try {
                updateConnectionStatus('loading');
                showToast('Memuat data dari Firebase...', 'info');
                
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
                        deskripsi: data.deskripsi || data.catatan || 'Tidak ada deskripsi tersedia'
                    });
                });

                updateConnectionStatus('connected');
                renderAllData();
                updateStatistics();
                showToast('Data berhasil dimuat!', 'success');

            } catch (error) {
                console.error('Error loading data:', error);
                updateConnectionStatus('error');
                showError('Gagal memuat data: ' + error.message);
            }
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
                    updateStatistics();
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
                        deskripsi: data.deskripsi || data.catatan || 'Tidak ada deskripsi tersedia'
                    });
                });
                
                if (currentView === 'main') {
                    renderAllData();
                    updateStatistics();
                }
            });
        }

        function renderAllData() {
            renderTodaySchedule();
            renderPendingTasks();
            renderScheduleList();
            renderTasksList();
            renderCoursesList();
        }

        function renderTodaySchedule() {
            const container = document.getElementById('todaySchedule');
            const now = new Date();
            const currentDay = now.toLocaleDateString('id-ID', { weekday: 'long' });
            
            const todayClasses = scheduleData.filter(item => item.hari === currentDay);
            
            if (todayClasses.length === 0) {
                container.innerHTML = '<div class="error">Tidak ada kelas hari ini</div>';
                return;
            }

            container.innerHTML = todayClasses.map(item => `
                <div class="list-item" onclick="showScheduleDetail('${item.id}')">
                    <div>
                        <div class="list-title">${item.mata_kuliah}</div>
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
                container.innerHTML = '<div style="text-align: center; color: var(--accent-cyan); padding: 2rem;">🎉 Semua tugas selesai! Kerja bagus!</div>';
                return;
            }

            // Show only next 3 pending tasks
            const nextTasks = pendingTasks
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                .slice(0, 3);

            container.innerHTML = nextTasks.map(task => {
                const deadline = new Date(task.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                
                let statusClass = 'safe';
                let actionText = `${daysLeft} hari lagi`;
                
                if (daysLeft < 0) {
                    statusClass = 'danger';
                    actionText = `${Math.abs(daysLeft)} hari terlambat`;
                } else if (daysLeft === 0) {
                    statusClass = 'danger';
                    actionText = 'Jatuh tempo hari ini';
                } else if (daysLeft <= 2) {
                    statusClass = 'warning';
                    actionText = daysLeft === 1 ? '1 hari lagi' : `${daysLeft} hari lagi`;
                } else if (daysLeft <= 7) {
                    statusClass = 'warning';
                }
                
                return `
                    <div class="list-item ${statusClass}" onclick="showTaskDetail('${task.id}')">
                        <div>
                            <div class="list-title">${task.tugas}</div>
                            <div class="list-meta">${task.matkul} • ${task.deadline}</div>
                        </div>
                        <div class="list-action ${statusClass}">${actionText}</div>
                    </div>
                `;
            }).join('');
        }

        function renderScheduleList() {
            const container = document.getElementById('scheduleList');
            
            if (scheduleData.length === 0) {
                container.innerHTML = '<div class="error">Tidak ada jadwal ditemukan</div>';
                return;
            }

            // Sort by day and time
            const sortedSchedule = [...scheduleData].sort((a, b) => {
                const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                const dayDiff = dayOrder.indexOf(a.hari) - dayOrder.indexOf(b.hari);
                if (dayDiff !== 0) return dayDiff;
                return a.waktu_masuk.localeCompare(b.waktu_masuk);
            });

            container.innerHTML = sortedSchedule.map(item => `
                <div class="list-item" onclick="showScheduleDetail('${item.id}')">
                    <div>
                        <div class="list-title">${item.mata_kuliah}</div>
                        <div class="list-meta">${item.hari} ${item.waktu_masuk}-${item.waktu_keluar} • ${item.ruang}</div>
                    </div>
                    <div class="list-action">${item.dosen}</div>
                </div>
            `).join('');
        }

        function renderTasksList() {
            const container = document.getElementById('tasksList');
            
            if (tasksData.length === 0) {
                container.innerHTML = '<div class="error">Tidak ada tugas ditemukan</div>';
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
                const deadline = new Date(task.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                
                let statusClass = 'safe';
                let actionText = 'Tertunda';
                
                if (isCompleted) {
                    statusClass = '';
                    actionText = 'Selesai';
                } else if (daysLeft < 0) {
                    statusClass = 'danger';
                    actionText = `${Math.abs(daysLeft)}h terlambat`;
                } else if (daysLeft === 0) {
                    statusClass = 'danger';
                    actionText = 'Hari ini';
                } else if (daysLeft <= 2) {
                    statusClass = 'warning';
                    actionText = daysLeft === 1 ? '1 hari' : `${daysLeft} hari`;
                } else if (daysLeft <= 7) {
                    statusClass = 'warning';
                    actionText = `${daysLeft} hari`;
                } else {
                    actionText = `${daysLeft} hari`;
                }

                return `
                    <div class="list-item ${statusClass} ${isCompleted ? 'completed' : ''}" onclick="showTaskDetail('${task.id}')">
                        <div>
                            <div class="list-title">${task.tugas}</div>
                            <div class="list-meta">${task.matkul} • ${task.dosen} • ${task.deadline}</div>
                        </div>
                        <div class="list-action ${statusClass}">${actionText}</div>
                    </div>
                `;
            }).join('');
        }

        function renderCoursesList() {
            const container = document.getElementById('coursesList');
            
            // Extract unique courses
            const coursesFromSchedule = [...new Set(scheduleData.map(s => s.mata_kuliah))];
            const coursesFromTasks = [...new Set(tasksData.map(t => t.matkul))];
            const allCourses = [...new Set([...coursesFromSchedule, ...coursesFromTasks])];

            if (allCourses.length === 0) {
                container.innerHTML = '<div class="error">Tidak ada mata kuliah ditemukan</div>';
                return;
            }

            container.innerHTML = allCourses.map(course => {
                const scheduleCount = scheduleData.filter(s => s.mata_kuliah === course).length;
                const taskCount = tasksData.filter(t => t.matkul === course && t.status === 'belum').length;
                const totalTasks = tasksData.filter(t => t.matkul === course).length;
                const completedTasks = tasksData.filter(t => t.matkul === course && t.status === 'selesai').length;
                const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const instructor = scheduleData.find(s => s.mata_kuliah === course)?.dosen || 
                                tasksData.find(t => t.matkul === course)?.dosen || 'TBA';

                return `
                    <div class="list-item" onclick="showCourseDetail('${course}')">
                        <div>
                            <div class="list-title">${course}</div>
                            <div class="list-meta">${instructor} • ${scheduleCount} sesi/minggu • ${completion}% selesai</div>
                        </div>
                        <div class="list-action ${taskCount > 0 ? 'warning' : ''}">${taskCount} tugas</div>
                    </div>
                `;
            }).join('');
        }

        function updateStatistics() {
            const pendingCount = tasksData.filter(t => t.status === 'belum').length;
            const todayCount = scheduleData.filter(s => 
                s.hari === new Date().toLocaleDateString('id-ID', { weekday: 'long' })
            ).length;
            const totalCourses = [...new Set([
                ...scheduleData.map(s => s.mata_kuliah),
                ...tasksData.map(t => t.matkul)
            ])].length;
            
            const totalTasks = tasksData.length;
            const completedTasks = tasksData.filter(t => t.status === 'selesai').length;
            const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // Update statistics
            document.getElementById('pendingTasksCount').textContent = pendingCount;
            document.getElementById('todayClassesCount').textContent = todayCount;
            document.getElementById('totalCoursesCount').textContent = totalCourses;
            document.getElementById('completionPercentage').textContent = completion + '%';
            
            // Update progress bar
            document.getElementById('progressText').textContent = completion + '%';
            document.getElementById('progressFill').style.width = completion + '%';
        }

        function performSearch(query) {
    const results = [];

    // Search in tasks
    tasksData.forEach(task => {
        if ((task.tugas || '').toLowerCase().includes(query) || 
            (task.matkul || '').toLowerCase().includes(query) || 
            (task.dosen || '').toLowerCase().includes(query) ||
            (task.catatan || '').toLowerCase().includes(query)) {
            results.push({
                type: 'task',
                id: task.id,
                title: task.tugas,
                subtitle: (task.matkul || '') + ' • ' + (task.dosen || ''),
                data: task
            });
        }
    });
            
            // Search in schedule
             scheduleData.forEach(schedule => {
        if ((schedule.mata_kuliah || '').toLowerCase().includes(query) ||
            (schedule.dosen || '').toLowerCase().includes(query) ||
            (schedule.ruang || '').toLowerCase().includes(query)) {
            results.push({
                type: 'schedule',
                id: schedule.id,
                title: schedule.mata_kuliah,
                subtitle: schedule.hari + ' • ' + schedule.waktu_masuk + '-' + schedule.waktu_keluar,
                data: schedule
            });
        }
    });
            
            const searchResults = document.getElementById('searchResults');
            // --- Tambahkan delegated click listener di setupEventListeners() ---
// di dalam setupEventListeners(), setelah const searchResults = ... tambahkan:
            searchResults.addEventListener('click', (e) => {
                const item = e.target.closest('.search-item');
                if (!item) return;
                const type = item.dataset.type;
                const id = item.dataset.id;
                // Panggil fungsi module-scoped (langsung tersedia di sini)
                openSearchResult(type, id);
            });

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-item">Tidak ada hasil ditemukan</div>';
    } else {
        // build elements with data-* (no inline onclick)
        searchResults.innerHTML = results.slice(0, 8).map(result => `
            <div class="search-item" data-type="${result.type}" data-id="${result.id}">
                <div class="list-title">${result.title}</div>
                <div class="list-meta">${result.subtitle}</div>
            </div>
        `).join('');
    }

    searchResults.classList.add('show');
}

        function openSearchResult(type, id) {
    if (type === 'task') {
        showTaskDetail(id);
    } else if (type === 'schedule') {
        showScheduleDetail(id);
    }
    // Clear search UI
    document.getElementById('searchBar').value = '';
    document.getElementById('searchResults').classList.remove('show');
}

        function filterScheduleByDay(day) {
            const container = document.getElementById('scheduleList');
            const filteredData = scheduleData.filter(item => item.hari === day);
            
            if (filteredData.length === 0) {
                container.innerHTML = '<div class="error">Tidak ada kelas pada hari ' + day + '</div>';
                return;
            }
            
            container.innerHTML = filteredData.map(item => `
                <div class="list-item" onclick="showScheduleDetail('${item.id}')">
                    <div>
                        <div class="list-title">${item.mata_kuliah}</div>
                        <div class="list-meta">${item.waktu_masuk}-${item.waktu_keluar} • ${item.ruang}</div>
                    </div>
                    <div class="list-action">${item.dosen}</div>
                </div>
            `).join('');
        }

        function showTaskDetail(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;

    switchToDetailView();

    // hide all tab contents, show taskDetail
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('taskDetail').classList.add('active');

    // The HTML has .detail-title inside the header, and field ids:
    const detailTitleEl = document.querySelector('#taskDetail .detail-title');
    if (detailTitleEl) detailTitleEl.textContent = task.tugas || 'Detail Tugas';

    const descEl = document.getElementById('taskDetailDescription');
    if (descEl) descEl.textContent = task.deskripsi || task.catatan || 'Tidak ada deskripsi tersedia';

    const notesEl = document.getElementById('taskDetailNotes');
    if (notesEl) notesEl.textContent = task.catatan || 'Tidak ada catatan tambahan';

    currentView = 'taskDetail';
}
function showScheduleDetail(scheduleId) {
    const schedule = scheduleData.find(s => s.id === scheduleId);
    if (!schedule) return;

    switchToDetailView();

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('scheduleDetail').classList.add('active');

    // Populate fields that exist in scheduleDetail section
    document.getElementById('scheduleDetailCourse').textContent = schedule.mata_kuliah || '-';
    document.getElementById('scheduleDetailDay').textContent = schedule.hari || '-';
    document.getElementById('scheduleDetailTime').textContent = `${schedule.waktu_masuk || '-'} - ${schedule.waktu_keluar || '-'}`;
    document.getElementById('scheduleDetailRoom').textContent = schedule.ruang || '-';
    document.getElementById('scheduleDetailInstructor').textContent = schedule.dosen || '-';

    currentView = 'scheduleDetail';
}

        function showCourseDetail(courseName) {
            switchToDetailView();
            
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById('courseDetail').classList.add('active');
            
            const scheduleCount = scheduleData.filter(s => s.mata_kuliah === courseName).length;
            const taskCount = tasksData.filter(t => t.matkul === courseName && t.status === 'belum').length;
            const totalTasks = tasksData.filter(t => t.matkul === courseName).length;
            const completedTasks = tasksData.filter(t => t.matkul === courseName && t.status === 'selesai').length;
            const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const instructor = scheduleData.find(s => s.mata_kuliah === courseName)?.dosen || 
                            tasksData.find(t => t.matkul === courseName)?.dosen || 'TBA';
            
            document.getElementById('courseDetailName').textContent = courseName;
            document.getElementById('courseDetailInstructor').textContent = instructor;
            document.getElementById('courseDetailSessions').textContent = scheduleCount + ' sesi';
            document.getElementById('courseDetailTasks').textContent = taskCount + ' tugas';
            document.getElementById('courseDetailCompletion').textContent = completion + '%';
            
            currentView = 'courseDetail';
        }

        function switchToDetailView() {
            // Hide bottom navigation for detail view
            document.querySelector('.bottom-nav').style.display = 'none';
        }

        function switchTab(tabName) {
            if (currentView !== 'main') return;
            
            // Update current tab
            currentTab = tabName;
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Update navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            event.target.classList.add('active');
            
            // Scroll to top smoothly
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        function goBack() {
            // Show bottom navigation
            document.querySelector('.bottom-nav').style.display = 'flex';
            
            // Hide all detail views
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show the previous tab (or default to beranda)
            document.getElementById(currentTab).classList.add('active');
            
            currentView = 'main';
            
            // Scroll to top
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        function changeIcon() {
            currentIconIndex = (currentIconIndex + 1) % icons.length;
            document.getElementById('dynamicIcon').textContent = icons[currentIconIndex];
        }

        async function refreshData() {
            showToast('Memuat ulang data...', 'info');
            await loadAllData();
        }

        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        function showError(message) {
            showToast(message, 'error');
        }

        // Make functions global for onclick handlers
        window.switchTab = switchTab;
        window.goBack = goBack;
        window.changeIcon = changeIcon;
        window.refreshData = refreshData;
        window.showTaskDetail = showTaskDetail;
        window.showScheduleDetail = showScheduleDetail;
        window.showCourseDetail = showCourseDetail;
        window.openSearchResult = openSearchResult;
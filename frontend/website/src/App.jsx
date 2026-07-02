import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, ListTodo, Award, ShoppingBag, ShieldAlert, 
    Sun, Moon, LogOut, Plus, Trash2, Edit, ChevronRight, 
    Check, AlertCircle, Sparkles, User, Globe, Coins, CheckCircle, FolderOpen, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { api } from './api';
import './App.css';

function App() {
    // Auth State
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState('landing'); // 'landing' | 'login' | 'signup'
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authConfirmPassword, setAuthConfirmPassword] = useState('');
    const [authFirstName, setAuthFirstName] = useState('');
    const [authLastName, setAuthLastName] = useState('');

    // Layout/UI State
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'projects' | 'leaderboard' | 'rewards' | 'plans' | 'admin'
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [activeSkin, setActiveSkin] = useState(localStorage.getItem('activeSkin') || 'blue');
    const [toasts, setToasts] = useState([]);
    
    // Data State
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [myRewards, setMyRewards] = useState([]);
    
    // Form States
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskPriority, setTaskPriority] = useState('medium');
    const [taskCategory, setTaskCategory] = useState('general');
    const [taskProjectId, setTaskProjectId] = useState('');
    
    // AI states
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiSuggestingSubtasks, setAiSuggestingSubtasks] = useState(false);
    const [aiSuggestingDesc, setAiSuggestingDesc] = useState(false);
    const [aiTip, setAiTip] = useState('');
    const [suggestedSubtasksList, setSuggestedSubtasksList] = useState([]);

    // Subtasks Confirmation modal state
    const [showSubtaskConfirmModal, setShowSubtaskConfirmModal] = useState(false);
    const [confirmSubtasksList, setConfirmSubtasksList] = useState([]);
    const [confirmSubtaskTaskId, setConfirmSubtaskTaskId] = useState('');

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectCategory, setProjectCategory] = useState('general');
    const [projectAiSuggestingDesc, setProjectAiSuggestingDesc] = useState(false);

    const [showRewardModal, setShowRewardModal] = useState(false);
    const [rewardTitle, setRewardTitle] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [rewardCost, setRewardCost] = useState(50);
    const [rewardType, setRewardType] = useState('theme');
    const [rewardValue, setRewardValue] = useState('indigo'); // Skin identifier

    // Upgrade options modal
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedUpgradeTier, setSelectedUpgradeTier] = useState('pro'); // 'pro' | 'lifetime' | 'trial'

    // Filters
    const [filterCategory, setFilterCategory] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProjectId, setFilterProjectId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Admin Users State
    const [adminTab, setAdminTab] = useState('users'); // 'users' | 'rewards'
    const [usersList, setUsersList] = useState([]);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedAdminUser, setSelectedAdminUser] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [selectedType, setSelectedType] = useState('user');
    const [selectedSubscription, setSelectedSubscription] = useState('free');

    // Subtask input
    const [subtaskInputs, setSubtaskInputs] = useState({});

    // Arabic Layout toggle
    const isArabic = user?.language === 'ar';

    // Toast helpers
    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Apply Theme & Skin
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Clear old skins
        document.documentElement.className = '';
        if (activeSkin && activeSkin !== 'blue') {
            document.documentElement.classList.add(`skin-${activeSkin}`);
        }
        localStorage.setItem('activeSkin', activeSkin);
    }, [activeSkin]);

    // Load initial user session
    useEffect(() => {
        if (token) {
            fetchMe();
        }
    }, [token]);

    // Load data when view/filters change
    useEffect(() => {
        if (token) {
            if (view === 'dashboard') {
                loadTasks();
                loadProjects();
            } else if (view === 'projects') {
                loadProjects();
            } else if (view === 'leaderboard') {
                loadLeaderboard();
            } else if (view === 'rewards') {
                loadRewards();
                loadMyRewards();
            } else if (view === 'admin') {
                loadUsersList();
                loadRewards();
            }
        }
    }, [view, token, filterCategory, filterPriority, filterStatus, filterProjectId, searchQuery]);

    const fetchMe = async () => {
        try {
            const data = await api.getMe();
            setUser(data.user);
            localStorage.setItem('userType', data.user.type);
            if (data.user.settings?.activeSkin) {
                setActiveSkin(data.user.settings.activeSkin);
            }
        } catch (err) {
            addToast(err.message, 'error');
            handleLogout();
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = await api.login(authEmail, authPassword);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('userType', data.user.type);
            setToken(data.accessToken);
            setUser(data.user);
            addToast(data.user.language === 'ar' ? 'أهلاً بك مجدداً!' : 'Welcome back!', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (authPassword !== authConfirmPassword) {
            return addToast(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match', 'error');
        }
        try {
            await api.signup({
                firstName: authFirstName,
                lastName: authLastName,
                email: authEmail,
                password: authPassword,
                confirmPassword: authConfirmPassword,
                language: isArabic ? 'ar' : 'en'
            });
            addToast(isArabic ? 'تم إنشاء الحساب! يرجى تسجيل الدخول.' : 'Account created! Please check email or login.', 'success');
            setAuthMode('login');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        setToken('');
        setUser(null);
        setView('dashboard');
        setAuthMode('landing');
        addToast(isArabic ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
    };

    // Tasks API
    const loadTasks = async () => {
        try {
            const params = {};
            if (filterCategory) params.category = filterCategory;
            if (filterPriority) params.priority = filterPriority;
            if (filterStatus) params.status = filterStatus;
            if (filterProjectId) params.projectId = filterProjectId;
            if (searchQuery) params.search = searchQuery;

            const data = await api.getTasks(params);
            setTasks(data.tasks || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const taskData = {
                title: taskTitle,
                description: taskDesc,
                dueDate: taskDueDate,
                priority: taskPriority,
                category: taskCategory
            };
            if (taskProjectId) taskData.projectId = taskProjectId;

            let responseTask;
            if (editingTask) {
                const res = await api.updateTask(editingTask._id, taskData);
                responseTask = res.task;
                addToast(isArabic ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully', 'success');
            } else {
                const res = await api.createTask(taskData);
                responseTask = res.task;
                addToast(isArabic ? 'تم إنشاء المهمة بنجاح' : 'Task created successfully', 'success');
            }

            // If we have accepted AI suggested subtasks generated, automatically add them
            if (suggestedSubtasksList.length > 0 && responseTask) {
                for (const subTitle of suggestedSubtasksList) {
                    await api.createSubtask(responseTask._id, { title: subTitle });
                }
            }

            setShowTaskModal(false);
            setEditingTask(null);
            clearTaskForm();
            loadTasks();
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleEditTaskClick = (task) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setTaskDesc(task.description || '');
        setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setTaskPriority(task.priority);
        setTaskCategory(task.category);
        setTaskProjectId(task.projectId || '');
        setSuggestedSubtasksList([]);
        setShowTaskModal(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) return;
        try {
            await api.deleteTask(taskId);
            addToast(isArabic ? 'تم حذف المهمة' : 'Task deleted', 'success');
            loadTasks();
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleToggleTaskStatus = async (task) => {
        try {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            await api.updateTask(task._id, { status: newStatus });
            addToast(
                newStatus === 'completed' 
                    ? (isArabic ? 'تم إكمال المهمة! تم إضافة 25 عملة!' : 'Task completed! 25 Coins awarded!') 
                    : (isArabic ? 'تم إعادة المهمة للنشاط وتراجع النقاط' : 'Task returned to active, points reversed'), 
                'success'
            );
            loadTasks();
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const clearTaskForm = () => {
        setTaskTitle('');
        setTaskDesc('');
        setTaskDueDate('');
        setTaskPriority('medium');
        setTaskCategory('general');
        setTaskProjectId('');
        setAiTip('');
        setSuggestedSubtasksList([]);
    };

    // Subtask Logic
    const handleAddSubtask = async (taskId) => {
        const inputVal = subtaskInputs[taskId];
        if (!inputVal || !inputVal.trim()) return;

        try {
            await api.createSubtask(taskId, { title: inputVal });
            addToast(isArabic ? 'تم إضافة مهمة فرعية' : 'Subtask added', 'success');
            setSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
            loadTasks();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleToggleSubtask = async (subtask) => {
        try {
            const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
            await api.updateSubtaskStatus(subtask._id, newStatus);
            addToast(
                newStatus === 'completed' 
                    ? (isArabic ? 'تم إكمال المهمة الفرعية بنجاح' : 'Subtask completed successfully') 
                    : (isArabic ? 'تم إعادة المهمة الفرعية وتراجع النقاط' : 'Subtask returned to active, points reversed'), 
                'success'
            );
            loadTasks();
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        if (!window.confirm(isArabic ? 'حذف المهمة الفرعية؟' : 'Delete subtask?')) return;
        try {
            await api.deleteSubtask(subtaskId);
            addToast(isArabic ? 'تم الحذف' : 'Subtask deleted', 'success');
            loadTasks();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // AI suggestions & Prompts with Confirmation Dialogue
    const triggerAIAudit = async () => {
        if (!taskTitle) return addToast(isArabic ? 'يرجى كتابة عنوان للمهمة أولاً' : 'Please enter a task title first', 'warning');
        setAiAnalyzing(true);
        try {
            const response = await api.analyzeTaskAI({
                title: taskTitle,
                description: taskDesc,
                dueDate: taskDueDate || undefined
            });

            const { difficulty, category, aiTips } = response.analysis;
            setTaskPriority(difficulty);
            setTaskCategory(category);
            setAiTip(aiTips);
            addToast(isArabic ? 'اكتمل تحليل الذكاء الاصطناعي!' : 'Gemini AI analysis complete!', 'success');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const triggerAISubtasksSuggest = async (taskId = '') => {
        const titleToUse = taskId ? tasks.find(t => t._id === taskId)?.title : taskTitle;
        const descToUse = taskId ? tasks.find(t => t._id === taskId)?.description : taskDesc;
        if (!titleToUse) return addToast(isArabic ? 'يرجى كتابة عنوان للمهمة أولاً' : 'Please enter a task title first', 'warning');
        
        setAiSuggestingSubtasks(true);
        try {
            const response = await api.suggestSubtasksAI(titleToUse, descToUse);
            const list = response.subtasks || [];
            if (list.length > 0) {
                setConfirmSubtasksList(list.map(st => ({ text: st, selected: true })));
                setConfirmSubtaskTaskId(taskId);
                setShowSubtaskConfirmModal(true);
            } else {
                addToast(isArabic ? 'لم يتم العثور على اقتراحات' : 'No suggestions found', 'info');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setAiSuggestingSubtasks(false);
        }
    };

    const handleAcceptSubtaskSuggestions = async () => {
        try {
            if (confirmSubtaskTaskId) {
                // Main page existing card trigger
                for (const sub of confirmSubtasksList) {
                    if (sub.selected && sub.text.trim()) {
                        await api.createSubtask(confirmSubtaskTaskId, { title: sub.text });
                    }
                }
                addToast(isArabic ? 'تم إضافة المهام الفرعية المقترحة للمهمة!' : 'Suggested subtasks added successfully!', 'success');
                loadTasks();
            } else {
                // Adding/editing modal trigger
                setSuggestedSubtasksList(confirmSubtasksList.filter(s => s.selected && s.text.trim()).map(s => s.text));
                addToast(isArabic ? 'تم قبول الاقتراحات وسيتم حفظها مع المهمة' : 'Subtask suggestions accepted!', 'success');
            }
            setShowSubtaskConfirmModal(false);
            setConfirmSubtasksList([]);
            setConfirmSubtaskTaskId('');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const triggerAIDescSuggest = async (type = 'task') => {
        const titleToUse = type === 'task' ? taskTitle : projectName;
        if (!titleToUse) return addToast(isArabic ? 'يرجى كتابة عنوان أولاً' : 'Please enter a title first', 'warning');
        
        if (type === 'task') setAiSuggestingDesc(true);
        else setProjectAiSuggestingDesc(true);

        try {
            const response = await api.suggestDescriptionAI(titleToUse, type);
            const generatedDesc = response.description || '';
            
            if (window.confirm(isArabic ? `هل تقبل هذا الوصف المقترح من الذكاء الاصطناعي؟\n\n"${generatedDesc}"` : `Do you accept this suggested AI description?\n\n"${generatedDesc}"`)) {
                if (type === 'task') setTaskDesc(generatedDesc);
                else setProjectDesc(generatedDesc);
                addToast(isArabic ? 'تم حفظ الوصف المقترح!' : 'Description suggested successfully!', 'success');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            if (type === 'task') setAiSuggestingDesc(false);
            else setProjectAiSuggestingDesc(false);
        }
    };

    // Projects API
    const loadProjects = async () => {
        try {
            const data = await api.getProjects();
            setProjects(data.projects || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.createProject({
                name: projectName,
                description: projectDesc,
                category: projectCategory
            });
            addToast(isArabic ? 'تم إنشاء المشروع بنجاح' : 'Project created successfully', 'success');
            setShowProjectModal(false);
            setProjectName('');
            setProjectDesc('');
            loadProjects();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm(isArabic ? 'حذف هذا المشروع سيؤدي لحذف المهام التابعة له كلياً. هل تود المتابعة؟' : 'Deletetion will cascade delete all tasks in this project. Continue?')) return;
        try {
            await api.deleteProject(projectId);
            addToast(isArabic ? 'تم حذف المشروع والمهام التابعة له' : 'Project and cascading tasks deleted', 'success');
            loadProjects();
            if (view === 'dashboard') loadTasks();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // Rewards API
    const loadRewards = async () => {
        try {
            const data = await api.getRewards();
            setRewards(data.rewards || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const loadMyRewards = async () => {
        try {
            const data = await api.getMyRewards();
            setMyRewards(data.rewards || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleCreateReward = async (e) => {
        e.preventDefault();
        try {
            await api.createReward({
                title: rewardTitle,
                description: rewardDesc,
                cost: rewardCost,
                type: rewardType,
                value: rewardValue
            });
            addToast(isArabic ? 'تم إضافة المكافأة للمتجر' : 'Reward item created in catalog', 'success');
            setShowRewardModal(false);
            setRewardTitle('');
            setRewardDesc('');
            loadRewards();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handlePurchase = async (rewardId) => {
        try {
            const data = await api.purchaseReward(rewardId);
            addToast(data.message, 'success');
            loadMyRewards();
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleApplySkin = async (skinName) => {
        try {
            await api.updateProfile({ settings: { activeSkin: skinName } });
            setActiveSkin(skinName);
            addToast(isArabic ? 'تم تطبيق المظهر المخصص بنجاح!' : 'Skin applied successfully!', 'success');
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // Leaderboard
    const loadLeaderboard = async () => {
        try {
            const data = await api.getLeaderboard();
            setLeaderboard(data.leaderboard || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // Admin Panel Management
    const loadUsersList = async () => {
        try {
            const data = await api.getUsers();
            setUsersList(data.users || []);
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const openPermissions = (userItem) => {
        setSelectedAdminUser(userItem);
        setSelectedPermissions(userItem.adminPermissions || []);
        setSelectedType(userItem.type);
        setSelectedSubscription(userItem.subscriptionType || 'free');
        setShowPermissionsModal(true);
    };

    const handleSavePermissions = async (e) => {
        e.preventDefault();
        try {
            await api.updateAdminPermissions(selectedAdminUser._id, {
                type: selectedType,
                subscriptionType: selectedSubscription,
                adminPermissions: selectedPermissions
            });
            addToast(isArabic ? 'تم حفظ التعديلات' : 'User role and permissions updated', 'success');
            setShowPermissionsModal(false);
            loadUsersList();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handlePermissionCheckbox = (perm) => {
        if (selectedPermissions.includes(perm)) {
            setSelectedPermissions(prev => prev.filter(p => p !== perm));
        } else {
            setSelectedPermissions(prev => [...prev, perm]);
        }
    };

    const handleLanguageChange = async (lang) => {
        try {
            if (token) {
                await api.updateProfile({ language: lang });
                fetchMe();
            } else {
                setUser({ language: lang });
            }
            addToast(lang === 'ar' ? 'تم تحويل اللغة للعربية' : `Language updated to ${lang.toUpperCase()}`, 'success');
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    // Upgrade directly from plans page
    const handleUpgradeSelf = async (tier, method = 'cash') => {
        try {
            await api.upgradeSubscription(tier, method);
            addToast(
                tier === 'free'
                    ? (isArabic ? 'تم تغيير الباقة للباقة المجانية' : 'Subscription changed to Free tier')
                    : (isArabic ? 'تهانينا! تم تفعيل الاشتراك بنجاح!' : 'Congratulations! Subscription activated successfully!'),
                'success'
            );
            setShowUpgradeModal(false);
            fetchMe();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleUpgradeClick = (tier) => {
        setSelectedUpgradeTier(tier);
        setShowUpgradeModal(true);
    };

    // Helper for Subscription expiration timer
    const getRemainingTime = () => {
        if (!user || !user.subscriptionExpiresAt) return '';
        const diff = new Date(user.subscriptionExpiresAt) - new Date();
        if (diff <= 0) return isArabic ? 'منتهي' : 'Expired';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return isArabic ? `${days} يوم و ${hours} ساعة متبقية` : `${days}d ${hours}h left`;
    };

    // Render: Landing Page & Auth forms
    if (!token) {
        return (
            <div className="landing-container" dir={isArabic ? 'rtl' : 'ltr'}>
                {/* Navbar */}
                <header className="landing-nav">
                    <div className="logo-brand">
                        <CheckSquare size={30} />
                        <span>ListifyMe</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <select 
                            value={user?.language || 'en'} 
                            onChange={e => handleLanguageChange(e.target.value)}
                            className="lang-select-landing"
                        >
                            <option value="en">English</option>
                            <option value="ar">العربية</option>
                        </select>
                        <button className="btn btn-outline" onClick={() => setAuthMode('login')}>
                            {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                        </button>
                    </div>
                </header>

                {authMode === 'landing' && (
                    <main className="landing-hero-section">
                        <div className="hero-content">
                            <h1 className="hero-title">
                                {isArabic ? 'حول مهامك اليومية إلى مغامرة ممتعة!' : 'Turn Your Daily Tasks Into A Gamified Adventure!'}
                            </h1>
                            <p className="hero-subtitle">
                                {isArabic 
                                    ? 'أكمل المهام والمهام الفرعية، واكسب العملات المعدنية لشراء السمات الملونة وإطارات الصور الرمزية المخصصة. كل ذلك بدعم كامل من الذكاء الاصطناعي Gemini.' 
                                    : 'Complete tasks and subtasks, earn gold coins to unlock vibrant customization dashboard skins. Powered by smart Gemini AI assistants.'
                                }
                            </p>
                            <div className="hero-buttons">
                                <button className="btn btn-primary btn-hero" onClick={() => setAuthMode('signup')}>
                                    {isArabic ? 'ابدأ الآن مجاناً' : 'Get Started Free'} <ArrowRight size={18} />
                                </button>
                                <a href="#plans" className="btn btn-outline btn-hero">
                                    {isArabic ? 'عرض باقات الأسعار' : 'View Pricing Plans'}
                                </a>
                            </div>
                        </div>

                        {/* Features Grid */}
                        <section className="landing-features">
                            <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>
                                {isArabic ? 'لماذا تختار ListifyMe؟' : 'Why Choose ListifyMe?'}
                            </h2>
                            <div className="features-grid">
                                <div className="feature-card">
                                    <Sparkles className="feature-icon" />
                                    <h3>{isArabic ? 'مساعد الذكاء الاصطناعي' : 'Gemini AI Assistant'}</h3>
                                    <p>{isArabic ? 'توقع تلقائي للصعوبات، تصنيف ذكي للمهام، اقتراح مهام فرعية وكتابة الأوصاف.' : 'Auto difficulty prediction, smart categorizations, and detailed subtask generation outlines.'}</p>
                                </div>
                                <div className="feature-card">
                                    <Coins className="feature-icon" style={{ color: '#d97706' }} />
                                    <h3>{isArabic ? 'نظام التحفيز والعملات' : 'Gamified Rewards'}</h3>
                                    <p>{isArabic ? 'اكسب 25 عملة للمهام الكبيرة، وعملات إضافية للمهام الفرعية. طبق السمات التي تشتريها!' : 'Earn 25 coins baseline, bonus points for subtask lists, and apply visual color themes.'}</p>
                                </div>
                                <div className="feature-card">
                                    <ShieldCheck className="feature-icon" style={{ color: 'var(--color-success)' }} />
                                    <h3>{isArabic ? 'مساحات عمل مرنة' : 'Workspace Tiers'}</h3>
                                    <p>{isArabic ? 'قسم مهامك الشخصية والعملية والدراسية، وتابع حدود خطتك بكل يسر وسهولة.' : 'Divide clean workspaces for personal, work, and education goals to easily reach targets.'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Pricing Tiers Section */}
                        <section id="plans" className="landing-plans">
                            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>
                                {isArabic ? 'باقات الأسعار والخطط' : 'Simple Pricing Plans'}
                            </h2>
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                                {isArabic ? 'اختر الخطة المناسبة لك وابدأ بإنجاز مهامك' : 'Choose the best plan to level up your organization productivity.'}
                            </p>
                            <div className="plans-grid">
                                {/* Free plan card */}
                                <div className="plan-card">
                                    <div className="plan-header">
                                        <h3>{isArabic ? 'الخطة المجانية' : 'Free Tier'}</h3>
                                        <div className="plan-price">$0 <span>/ {isArabic ? 'شهرياً' : 'mo'}</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{isArabic ? 'الحد الأقصى 3 مشاريع' : 'Up to 3 active projects'}</li>
                                        <li><strong style={{ color: 'var(--color-danger)' }}>{isArabic ? 'الحد الأقصى 5 مهام نشطة فقط' : 'Strictly 5 active tasks limit'}</strong></li>
                                        <li>{isArabic ? 'مكافآت العملات الأساسية' : 'Baseline coins rewards'}</li>
                                        <li>{isArabic ? 'الذكاء الاصطناعي المبسط' : 'Local heuristics helpers only'}</li>
                                    </ul>
                                    <button className="btn btn-outline btn-block" onClick={() => setAuthMode('signup')}>
                                        {isArabic ? 'ابدأ مجاناً' : 'Get Started'}
                                    </button>
                                </div>

                                {/* Pro plan card */}
                                <div className="plan-card featured">
                                    <div className="plan-badge">{isArabic ? 'الموصى بها' : 'Popular'}</div>
                                    <div className="plan-header">
                                        <h3>{isArabic ? 'الخطة الاحترافية' : 'Pro Tier'}</h3>
                                        <div className="plan-price">$9.99 <span>/ {isArabic ? 'شهرياً' : 'mo'}</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{isArabic ? 'مشاريع غير محدودة' : 'Unlimited workspace projects'}</li>
                                        <li>{isArabic ? 'مهام غير محدودة' : 'Unlimited active tasks'}</li>
                                        <li>{isArabic ? 'مساعد الذكاء الاصطناعي Gemini الكامل' : 'Premium Gemini AI audit and checklists'}</li>
                                        <li>{isArabic ? 'تخصيص كامل للمظهر والسمات' : 'Apply custom reward themes and skin configurations'}</li>
                                    </ul>
                                    <button className="btn btn-primary btn-block" onClick={() => setAuthMode('signup')}>
                                        {isArabic ? 'اشترك الآن' : 'Upgrade to Pro'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </main>
                )}

                {/* Login View */}
                {authMode === 'login' && (
                    <div className="auth-container">
                        <div className="auth-card">
                            <div className="auth-logo">
                                <CheckSquare size={32} />
                                ListifyMe
                            </div>
                            <h2 className="auth-title">{isArabic ? 'تسجيل الدخول' : 'Welcome back'}</h2>
                            <p className="auth-subtitle">{isArabic ? 'سجل دخولك لمتابعة لوحة مهامك' : 'Login to manage your lists'}</p>
                            <form onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label className="form-label">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        placeholder="you@example.com"
                                        value={authEmail}
                                        onChange={e => setAuthEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{isArabic ? 'كلمة المرور' : 'Password'}</label>
                                    <input 
                                        type="password" 
                                        className="form-control" 
                                        placeholder="••••••••"
                                        value={authPassword}
                                        onChange={e => setAuthPassword(e.target.value)}
                                        required 
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-block">{isArabic ? 'تسجيل الدخول' : 'Sign In'}</button>
                            </form>
                            <div className="auth-toggle">
                                {isArabic ? 'ليس لديك حساب؟' : "Don't have an account?"} <span onClick={() => setAuthMode('signup')}>{isArabic ? 'أنشئ حساباً جديداً' : 'Sign up'}</span>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <span onClick={() => setAuthMode('landing')} style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                                    {isArabic ? '← العودة للرئيسية' : '← Back to Landing'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signup View */}
                {authMode === 'signup' && (
                    <div className="auth-container">
                        <div className="auth-card">
                            <div className="auth-logo">
                                <CheckSquare size={32} />
                                ListifyMe
                            </div>
                            <h2 className="auth-title">{isArabic ? 'إنشاء حساب جديد' : 'Create account'}</h2>
                            <p className="auth-subtitle">{isArabic ? 'ابدأ في إنجاز مهامك واكتساب العملات' : 'Start earning coins for completed tasks'}</p>
                            <form onSubmit={handleSignup}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">{isArabic ? 'الاسم الأول' : 'First Name'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="John"
                                            value={authFirstName}
                                            onChange={e => setAuthFirstName(e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">{isArabic ? 'اسم العائلة' : 'Last Name'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="Doe"
                                            value={authLastName}
                                            onChange={e => setAuthLastName(e.target.value)}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        placeholder="john@example.com"
                                        value={authEmail}
                                        onChange={e => setAuthEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{isArabic ? 'كلمة المرور' : 'Password'}</label>
                                    <input 
                                        type="password" 
                                        className="form-control" 
                                        placeholder="••••••••"
                                        value={authPassword}
                                        onChange={e => setAuthPassword(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                    <input 
                                        type="password" 
                                        className="form-control" 
                                        placeholder="••••••••"
                                        value={authConfirmPassword}
                                        onChange={e => setAuthConfirmPassword(e.target.value)}
                                        required 
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-block">{isArabic ? 'تسجيل جديد' : 'Sign Up'}</button>
                            </form>
                            <div className="auth-toggle">
                                {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'} <span onClick={() => setAuthMode('login')}>{isArabic ? 'سجل دخولك' : 'Sign in'}</span>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <span onClick={() => setAuthMode('landing')} style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                                    {isArabic ? '← العودة للرئيسية' : '← Back to Landing'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toasts overlay */}
                <div className="toast-container">
                    {toasts.map(t => (
                        <div key={t.id} className={`toast ${t.type}`}>
                            <AlertCircle size={18} />
                            {t.message}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" dir={isArabic ? 'rtl' : 'ltr'}>
            {/* Sidebar Navigation */}
            <div className="app-sidebar">
                <div className="sidebar-logo">
                    <CheckSquare size={28} />
                    ListifyMe
                </div>
                <div className="sidebar-nav">
                    <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
                        <ListTodo size={18} />
                        {isArabic ? 'المهام' : 'Tasks'}
                    </div>
                    <div className={`nav-item ${view === 'projects' ? 'active' : ''}`} onClick={() => setView('projects')}>
                        <FolderOpen size={18} />
                        {isArabic ? 'المشاريع' : 'Projects'}
                    </div>
                    <div className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => setView('leaderboard')}>
                        <Award size={18} />
                        {isArabic ? 'المتصدرين' : 'Leaderboard'}
                    </div>
                    <div className={`nav-item ${view === 'rewards' ? 'active' : ''}`} onClick={() => setView('rewards')}>
                        <ShoppingBag size={18} />
                        {isArabic ? 'متجر السمات' : 'Custom Skins Store'}
                    </div>
                    <div className={`nav-item ${view === 'plans' ? 'active' : ''}`} onClick={() => setView('plans')}>
                        <Zap size={18} />
                        {isArabic ? 'باقات الاشتراك' : 'Pricing Plans'}
                    </div>
                    {user?.type === 'admin' && (
                        <div className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
                            <ShieldAlert size={18} />
                            {isArabic ? 'لوحة الإدارة' : 'Admin Panel'}
                        </div>
                    )}
                </div>
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.firstName} {user?.lastName}</div>
                        <div className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>{user?.type}</span>
                            <span style={{ fontSize: '10px', background: 'var(--color-primary-light)', padding: '2px 6px', borderRadius: '8px', textTransform: 'uppercase', fontWeight: 800 }}>{user?.subscriptionType}</span>
                        </div>
                    </div>
                    <LogOut size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={handleLogout} />
                </div>
            </div>

            {/* Main view container */}
            <div className="app-content">
                <div className="app-header">
                    <div className="header-title">
                        {view === 'dashboard' && (isArabic ? 'لوحة التحكم للمهام' : 'My Tasks Dashboard')}
                        {view === 'projects' && (isArabic ? 'مساحات عمل المشاريع' : 'My Workspace Projects')}
                        {view === 'leaderboard' && (isArabic ? 'لوحة المتصدرين الأسبوعية' : 'Weekly Ranks Leaderboards')}
                        {view === 'rewards' && (isArabic ? 'متجر العملات والتخصيص' : 'Gamified Skin Store')}
                        {view === 'plans' && (isArabic ? 'باقات الاشتراك والترقية' : 'Upgrade Subscription Plans')}
                        {view === 'admin' && (isArabic ? 'مفاتيح التحكم بالنظام والمدراء' : 'System Administration controls')}
                    </div>
                    <div className="header-actions">
                        {/* Expiry/Trial Timer display */}
                        {user?.subscriptionExpiresAt && (user?.subscriptionType === 'pro') && (
                            <div style={{ fontSize: '11px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '20px', fontWeight: 700 }}>
                                {getRemainingTime()}
                            </div>
                        )}
                        {/* Coin Widget */}
                        <div className="coin-widget">
                            <Coins size={18} />
                            {user?.coins || 0} {isArabic ? 'عملة' : 'Coins'}
                        </div>
                        {/* Language Selector */}
                        <div className="lang-menu-wrapper">
                            <Globe size={14} />
                            <select 
                                value={user?.language || 'en'} 
                                onChange={e => handleLanguageChange(e.target.value)}
                                className="lang-select-menu"
                            >
                                <option value="en">English</option>
                                <option value="ar">العربية</option>
                            </select>
                        </div>
                        {/* Theme Toggle */}
                        <button 
                            className="btn btn-outline" 
                            style={{ padding: '8px', borderRadius: '50%' }}
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>

                <div className="page-body">
                    {/* View: Dashboard */}
                    {view === 'dashboard' && (
                        <div className="dashboard-grid">
                            <div className="left-panel">
                                <div className="card">
                                    <div className="card-title-bar">
                                        <h3>{isArabic ? 'قائمة المهام النشطة' : 'Active Tasks List'}</h3>
                                        <button className="btn btn-primary" onClick={() => { clearTaskForm(); setShowTaskModal(true); }}>
                                            <Plus size={16} /> {isArabic ? 'مهمة جديدة' : 'New Task'}
                                        </button>
                                    </div>
                                    
                                    {/* Filters Bar */}
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                        <select className="form-control" style={{ width: '130px', padding: '8px 12px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                            <option value="">{isArabic ? 'كل التصنيفات' : 'All Categories'}</option>
                                            <option value="general">General</option>
                                            <option value="work">Work</option>
                                            <option value="personal">Personal</option>
                                            <option value="education">Education</option>
                                            <option value="health">Health</option>
                                            <option value="finance">Finance</option>
                                            <option value="shopping">Shopping</option>
                                        </select>
                                        <select className="form-control" style={{ width: '130px', padding: '8px 12px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                            <option value="">{isArabic ? 'كل الأولويات' : 'All Priorities'}</option>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                        <select className="form-control" style={{ width: '130px', padding: '8px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="">{isArabic ? 'كل الحالات' : 'All Statuses'}</option>
                                            <option value="pending">Pending</option>
                                            <option value="in-progress">In-Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                        <select className="form-control" style={{ width: '150px', padding: '8px 12px' }} value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)}>
                                            <option value="">{isArabic ? 'كل المشاريع' : 'All Projects'}</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            placeholder={isArabic ? 'بحث بالمهام...' : 'Search tasks...'} 
                                            className="form-control" 
                                            style={{ flexGrow: 1, padding: '8px 12px', minWidth: '150px' }} 
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Task Cards List */}
                                    <div className="task-list">
                                        {tasks.length === 0 ? (
                                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>{isArabic ? 'لا توجد مهام مطابقة للمرشحات.' : 'No active tasks found matching filters.'}</p>
                                        ) : (
                                            tasks.map(task => (
                                                <div key={task._id} className="card" style={{ marginBottom: '15px', borderLeft: '4px solid var(--color-primary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                                            <div 
                                                                className={`task-checkbox ${task.status === 'completed' ? 'completed' : ''}`}
                                                                onClick={() => handleToggleTaskStatus(task)}
                                                            >
                                                                {task.status === 'completed' && <Check size={14} />}
                                                            </div>
                                                            <div>
                                                                <h4 className={`task-item-title ${task.status === 'completed' ? 'completed' : ''}`}>{task.title}</h4>
                                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{task.description}</p>
                                                                <div className="task-meta">
                                                                    <span className={`tag tag-priority-${task.priority}`}>{task.priority}</span>
                                                                    <span className="tag" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{task.category}</span>
                                                                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                                                    <span style={{ color: '#d97706', fontWeight: 700 }}>+25 {isArabic ? 'عملة' : 'Coins'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleEditTaskClick(task)}>
                                                                <Edit size={14} />
                                                            </button>
                                                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-danger)' }} onClick={() => handleDeleteTask(task._id)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Subtasks Block */}
                                                    <div style={{ marginTop: '15px', paddingLeft: '36px', paddingRight: '36px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                                    {isArabic ? 'المهام الفرعية التابعة للمهمة' : 'Subtasks Checklist'}
                                                                </div>
                                                                {/* AI suggest subtasks directly on task card */}
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-link-ai"
                                                                    onClick={() => triggerAISubtasksSuggest(task._id)}
                                                                    disabled={aiSuggestingSubtasks}
                                                                >
                                                                    <Sparkles size={11} /> {aiSuggestingSubtasks ? '...' : (isArabic ? 'اقتراح ذكي' : 'AI Suggest')}
                                                                </button>
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 800 }}>
                                                                {task.subtasks?.length >= 3 
                                                                    ? (isArabic ? `+15 نقطة إضافية (موزعة: ${(15 / task.subtasks.length).toFixed(1)} للمهمة)` : `+15 Bonus coins (Dynamic: ${(15 / task.subtasks.length).toFixed(1)}/subtask)`) 
                                                                    : (isArabic ? 'أضف 3 مهام فرعية أو أكثر لتنشيط مكافأة 15 عملة!' : 'Add 3+ subtasks to activate the 15-coin bonus!')}
                                                            </span>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {(task.subtasks || []).map(sub => {
                                                                const subtaskPointsVal = task.subtasks.length >= 3 ? Math.round((15 / task.subtasks.length) * 10) / 10 : 0;
                                                                return (
                                                                    <div key={sub._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                            <div 
                                                                                className={`task-checkbox ${sub.status === 'completed' ? 'completed' : ''}`}
                                                                                style={{ width: '16px', height: '16px', marginRight: '10px', marginLeft: '10px' }}
                                                                                onClick={() => handleToggleSubtask(sub)}
                                                                            >
                                                                                {sub.status === 'completed' && <Check size={10} />}
                                                                            </div>
                                                                            <span style={{ fontSize: '13px', textDecoration: sub.status === 'completed' ? 'line-through' : 'none', color: sub.status === 'completed' ? 'var(--text-secondary)' : 'inherit' }}>
                                                                                {sub.title}
                                                                            </span>
                                                                            {subtaskPointsVal > 0 && (
                                                                                <span style={{ fontSize: '11px', color: '#d97706', marginLeft: '8px', marginRight: '8px', fontWeight: 700 }}>
                                                                                    (+{subtaskPointsVal} Coins)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <Trash2 size={12} style={{ color: 'var(--color-danger)', cursor: 'pointer' }} onClick={() => handleDeleteSubtask(sub._id)} />
                                                                    </div>
                                                                );
                                                            })}
                                                            
                                                            {/* Add subtask mini input */}
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder={isArabic ? 'إضافة مهمة فرعية...' : 'Add subtask...'} 
                                                                    className="form-control" 
                                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                    value={subtaskInputs[task._id] || ''}
                                                                    onChange={e => setSubtaskInputs(prev => ({ ...prev, [task._id]: e.target.value }))}
                                                                />
                                                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleAddSubtask(task._id)}>
                                                                    {isArabic ? 'إضافة' : 'Add'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Side Info Cards */}
                            <div className="right-panel">
                                <div className="card">
                                    {user?.type === 'admin' ? (
                                        <>
                                            <h3>{isArabic ? 'التحكم الإداري الكامل' : 'Admin Full Bypass'}</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                                                {isArabic 
                                                    ? 'بصفتك مديراً للنظام، تم إلغاء كافة حدود المهام والمشاريع والميزات الإضافية تلقائياً من أجلك.' 
                                                    : 'As a system administrator, you have full features bypass. All task and project creation limits are disabled.'}
                                            </p>
                                            <div style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '10px', borderRadius: '8px', marginTop: '15px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                                                🛡️ Super Admin Powers Active
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3>{isArabic ? 'حدود باقتك الحالية' : 'Free Tier Limits'}</h3>
                                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                                        <span>{isArabic ? 'المهام النشطة:' : 'Active Tasks:'}</span>
                                                        <strong>{tasks.filter(t => t.status !== 'completed').length} / {user?.subscriptionType === 'free' ? '5' : '∞'}</strong>
                                                    </div>
                                                    <div style={{ background: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ background: 'var(--color-primary)', width: `${user?.subscriptionType !== 'free' ? 0 : Math.min((tasks.filter(t => t.status !== 'completed').length / 5) * 100, 100)}%`, height: '100%' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                                        <span>{isArabic ? 'المشاريع الجارية:' : 'Projects:'}</span>
                                                        <strong>{projects.length} / {user?.subscriptionType === 'free' ? '3' : '∞'}</strong>
                                                    </div>
                                                    <div style={{ background: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ background: 'var(--color-accent)', width: `${user?.subscriptionType !== 'free' ? 0 : Math.min((projects.length / 3) * 100, 100)}%`, height: '100%' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {user?.subscriptionType === 'free' && (
                                                <button className="btn btn-primary btn-block" style={{ marginTop: '20px' }} onClick={() => setView('plans')}>
                                                    {isArabic ? 'ترقية الباقة الآن' : 'Upgrade Subscription'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Projects */}
                    {view === 'projects' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                                <h2>{isArabic ? 'مساحة العمل للمشاريع' : 'Project Workspace'}</h2>
                                <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
                                    <Plus size={16} /> {isArabic ? 'إنشاء مشروع' : 'Create Project'}
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {projects.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', gridColumn: '1/-1', padding: '40px' }}>{isArabic ? 'لم تقم بإنشاء مشاريع بعد.' : "You haven't created any projects yet."}</p>
                                ) : (
                                    projects.map(proj => (
                                        <div key={proj._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                    <FolderOpen size={20} style={{ color: 'var(--color-primary)' }} />
                                                    <h3 style={{ fontSize: '18px' }}>{proj.name}</h3>
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>{proj.description}</p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                                <span className="tag" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{proj.category}</span>
                                                <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-danger)' }} onClick={() => handleDeleteProject(proj._id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: Leaderboard */}
                    {view === 'leaderboard' && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--color-primary-light)', borderColor: 'rgba(59,130,246,0.2)' }}>
                                <Award size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 15px' }} />
                                <h2>{isArabic ? 'لوحة المتصدرين الأسبوعية للمهام' : 'Weekly Task Leaderboard'}</h2>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '5px', fontSize: '14px' }}>
                                    {isArabic 
                                        ? 'المهام المنجزة تمنحك نقاطاً للمنافسة الأسبوعية. التصفير الأسبوعي يحدث كل سبت الساعة ٢٣:٥٩. المراكز الثلاث الأولى تفوز بعملات إضافية مكافأة!' 
                                        : 'Completed tasks earn weekly points. Weekly reset occurs on Saturday at 23:59. Top 3 users win bonus coins!'
                                    }
                                </p>
                            </div>
                            <div className="card">
                                <div className="leaderboard-list">
                                    {leaderboard.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{isArabic ? 'لا توجد مشاركات نشطة على لوحة المتصدرين بعد.' : 'No active participants on the leaderboard this week.'}</p>
                                    ) : (
                                        leaderboard.map((item, idx) => (
                                            <div key={item._id} className="leaderboard-item">
                                                <div className={`leaderboard-rank rank-${idx + 1}`}>#{idx + 1}</div>
                                                <div className="user-avatar" style={{ marginRight: '15px', marginLeft: '15px', width: '32px', height: '32px', fontSize: '12px' }}>
                                                    {item.firstName?.[0]}{item.lastName?.[0]}
                                                </div>
                                                <div style={{ flexGrow: 1, fontWeight: 600 }}>{item.firstName} {item.lastName}</div>
                                                <div style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{item.weeklyPoints} Pts</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Rewards Store */}
                    {view === 'rewards' && (
                        <div>
                            <div style={{ marginBottom: '30px' }}>
                                <h2>{isArabic ? 'متجر المظاهر والسمات' : 'Custom Skins Store'}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{isArabic ? 'اشترِ المظاهر الملونة للوحة التحكم وطبقها الآن!' : 'Use your earned coins to buy dashboard customization items!'}</p>
                            </div>
                            
                            <h3 style={{ marginBottom: '15px' }}>{isArabic ? 'المظاهر المتوفرة بالمتجر' : 'Available Items Catalog'}</h3>
                            <div className="store-grid">
                                {rewards.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'لا توجد عناصر مضافة لمتجر العملات حالياً.' : 'No items currently available in the rewards catalog.'}</p>
                                ) : (
                                    rewards.map(item => {
                                        const alreadyBought = myRewards.some(mr => mr._id === item._id);
                                        const isActive = activeSkin === item.value;
                                        return (
                                            <div key={item._id} className="store-item">
                                                <div>
                                                    <div className="store-item-icon" style={{ background: `var(--color-primary-light)` }}>
                                                        <ShoppingBag size={24} style={{ color: 'var(--color-primary)' }} />
                                                    </div>
                                                    <h4 style={{ fontSize: '15px', marginBottom: '4px' }}>{item.title}</h4>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.description}</p>
                                                </div>
                                                <div style={{ marginTop: '15px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: '#d97706', marginBottom: '10px' }}>
                                                        <Coins size={14} />
                                                        {item.cost} Coins
                                                    </div>
                                                    {alreadyBought ? (
                                                        isActive ? (
                                                            <button className="btn btn-outline btn-block" disabled style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                                                <CheckCircle size={14} /> {isArabic ? 'نشط حالياً' : 'Active Skin'}
                                                            </button>
                                                        ) : (
                                                            <button className="btn btn-primary btn-block" onClick={() => handleApplySkin(item.value)}>
                                                                {isArabic ? 'تطبيق المظهر' : 'Apply Theme'}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button className="btn btn-primary btn-block" onClick={() => handlePurchase(item._id)}>
                                                            {isArabic ? 'شراء الآن' : 'Buy Now'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: Subscription Plans */}
                    {view === 'plans' && (
                        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <h2>{isArabic ? 'تفاصيل باقات الاشتراك والترقيات' : 'Subscription Plans & Upgrades'}</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {isArabic 
                                        ? `باقة اشتراكك الحالية هي: ${user?.subscriptionType?.toUpperCase()}` 
                                        : `Your current active subscription: ${user?.subscriptionType?.toUpperCase()}`
                                    }
                                    {user?.subscriptionExpiresAt && ` (${getRemainingTime()})`}
                                </p>
                            </div>

                            {user?.type === 'admin' && (
                                <div style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', border: '1px solid var(--color-success)', fontWeight: 'bold' }}>
                                    🛡️ {isArabic 
                                        ? 'أنت مدير للنظام! جميع باقات الاشتراك والمميزات الاحترافية مفعلة بالكامل لك دون الحاجة للشراء.' 
                                        : 'You are an Administrator! All premium subscriptions and features are fully unlocked for you automatically.'}
                                </div>
                            )}

                            <div className="plans-grid" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                {/* Free plan card */}
                                <div className={`plan-card ${user?.subscriptionType === 'free' ? 'active-plan' : ''}`} style={{ minHeight: '480px' }}>
                                    {user?.subscriptionType === 'free' && <div className="plan-badge">{isArabic ? 'باقاتك الحالية' : 'Current Active'}</div>}
                                    <div className="plan-header">
                                        <h3>{isArabic ? 'الخطة المجانية' : 'Free Tier'}</h3>
                                        <div className="plan-price">$0 <span>/ {isArabic ? 'شهرياً' : 'mo'}</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{isArabic ? 'الحد الأقصى 3 مشاريع' : 'Up to 3 active projects'}</li>
                                        <li><strong style={{ color: 'var(--color-danger)' }}>{isArabic ? 'الحد الأقصى 5 مهام نشطة فقط' : 'Strictly 5 active tasks limit'}</strong></li>
                                        <li>{isArabic ? 'مكافآت العملات الأساسية' : 'Baseline coins rewards'}</li>
                                        <li>{isArabic ? 'الذكاء الاصطناعي المبسط' : 'Local heuristics helpers only'}</li>
                                    </ul>
                                    <button 
                                        className="btn btn-outline btn-block" 
                                        onClick={() => handleUpgradeSelf('free')}
                                        disabled={user?.subscriptionType === 'free' || user?.type === 'admin'}
                                    >
                                        {user?.subscriptionType === 'free' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'تغيير للمجانية' : 'Switch to Free')}
                                    </button>
                                </div>

                                {/* Pro plan card */}
                                <div className={`plan-card featured ${user?.subscriptionType === 'pro' ? 'active-plan' : ''}`} style={{ minHeight: '480px' }}>
                                    {user?.subscriptionType === 'pro' && <div className="plan-badge">{isArabic ? 'باقاتك الحالية' : 'Current Active'}</div>}
                                    <div className="plan-header">
                                        <h3>{isArabic ? 'الخطة الاحترافية' : 'Pro Tier'}</h3>
                                        <div className="plan-price">$10 <span>/ {isArabic ? 'شهرياً' : 'mo'}</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{isArabic ? 'مشاريع غير محدودة' : 'Unlimited workspace projects'}</li>
                                        <li>{isArabic ? 'مهام غير محدودة' : 'Unlimited active tasks'}</li>
                                        <li>{isArabic ? 'مساعد الذكاء الاصطناعي Gemini الكامل' : 'Premium Gemini AI audit and checklists'}</li>
                                        <li>{isArabic ? 'تخصيص كامل للمظهر والسمات' : 'Apply custom reward themes and skin configurations'}</li>
                                    </ul>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {/* Free trial button option hidden if trial used OR if they are pro/lifetime/admin */}
                                        {!(user?.trialUsed || user?.subscriptionType === 'pro' || user?.subscriptionType === 'lifetime' || user?.type === 'admin') && (
                                            <button 
                                                className="btn btn-outline btn-block" 
                                                onClick={() => handleUpgradeSelf('trial')}
                                                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                                            >
                                                {isArabic ? 'بدء فترة التجربة المجانية (أسبوع)' : 'Start 1-Week Free Trial'}
                                            </button>
                                        )}
                                        <button 
                                            className="btn btn-primary btn-block" 
                                            onClick={() => handleUpgradeClick('pro')}
                                            disabled={user?.subscriptionType === 'pro' || user?.subscriptionType === 'lifetime' || user?.type === 'admin'}
                                        >
                                            {user?.subscriptionType === 'pro' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'ترقية الآن' : 'Upgrade Monthly')}
                                        </button>
                                    </div>
                                </div>

                                {/* Lifetime plan card */}
                                <div className={`plan-card ${user?.subscriptionType === 'lifetime' ? 'active-plan' : ''}`} style={{ minHeight: '480px' }}>
                                    {user?.subscriptionType === 'lifetime' && <div className="plan-badge">{isArabic ? 'باقاتك الحالية' : 'Current Active'}</div>}
                                    <div className="plan-header">
                                        <h3>{isArabic ? 'الخطة مدى الحياة' : 'Lifetime Access'}</h3>
                                        <div className="plan-price">$30 <span>/ {isArabic ? 'دفعة واحدة' : 'one-time'}</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{isArabic ? 'مشاريع ومهام غير محدودة' : 'Unlimited projects and tasks'}</li>
                                        <li>{isArabic ? 'مساعد الذكاء الاصطناعي للأبد' : 'Gemini AI assistant permanently'}</li>
                                        <li>{isArabic ? 'جميع المظاهر مجانية مدى الحياة' : 'Lifetime custom theme customization skins'}</li>
                                        <li><strong>{isArabic ? 'لا تجديد تلقائي ولا رسوم مكررة' : 'No recurring payments ever'}</strong></li>
                                    </ul>
                                    <button 
                                        className="btn btn-primary btn-block" 
                                        onClick={() => handleUpgradeClick('lifetime')}
                                        disabled={user?.subscriptionType === 'lifetime' || user?.type === 'admin'}
                                        style={{ background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
                                    >
                                        {user?.subscriptionType === 'lifetime' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'شراء مدى الحياة' : 'Buy Lifetime')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Admin Panel */}
                    {view === 'admin' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                                <h2>{isArabic ? 'لوحة تحكم إدارة النظام' : 'System Admin Control Panel'}</h2>
                                <button className="btn btn-primary" onClick={() => setShowRewardModal(true)}>
                                    <Plus size={16} /> {isArabic ? 'إضافة مكافأة جديدة' : 'Add Reward Item'}
                                </button>
                            </div>

                            <div className="card">
                                <h3>{isArabic ? 'تعديل أدوار وصلاحيات واشتراكات المستخدمين' : 'Manage Users, Subscriptions & Permissions'}</h3>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>{isArabic ? 'الاسم' : 'Name'}</th>
                                            <th>{isArabic ? 'البريد الإلكتروني' : 'Email'}</th>
                                            <th>{isArabic ? 'الدور' : 'Role'}</th>
                                            <th>{isArabic ? 'الاشتراك' : 'Subscription'}</th>
                                            <th>{isArabic ? 'الصلاحيات' : 'Permissions'}</th>
                                            <th>{isArabic ? 'الإجراء' : 'Action'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersList.map(u => (
                                            <tr key={u._id}>
                                                <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <span className="tag" style={{ 
                                                        background: u.type === 'admin' ? 'var(--color-primary-light)' : 'var(--border-color)', 
                                                        color: u.type === 'admin' ? 'var(--color-primary)' : 'var(--text-secondary)' 
                                                    }}>{u.type}</span>
                                                </td>
                                                <td>
                                                    <span className="tag" style={{ 
                                                        background: u.subscriptionType === 'pro' ? 'var(--color-accent)' : u.subscriptionType === 'lifetime' ? 'var(--color-success)' : 'var(--border-color)', 
                                                        color: u.subscriptionType === 'free' ? 'var(--text-secondary)' : 'white' 
                                                    }}>{u.subscriptionType}</span>
                                                </td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {u.email === 'ahmedabuseada22@gmail.com' ? 'All (Super Admin Bypass)' : (u.adminPermissions || []).join(', ') || 'None'}
                                                </td>
                                                <td>
                                                    {u.email !== 'ahmedabuseada22@gmail.com' && (
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                                            onClick={() => openPermissions(u)}
                                                            disabled={user.email !== 'ahmedabuseada22@gmail.com'}
                                                        >
                                                            Configure Details
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Task Form */}
            {showTaskModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingTask ? (isArabic ? 'تحديث المهمة الحالية' : 'Edit Task Details') : (isArabic ? 'إنشاء مهمة جديدة' : 'Create New Task')}</h3>
                        <form onSubmit={handleCreateTask} style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{isArabic ? 'عنوان المهمة' : 'Task Title'}</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder={isArabic ? 'اكتب عنوان المهمة...' : 'Task title'} 
                                        value={taskTitle}
                                        onChange={e => setTaskTitle(e.target.value)}
                                        required 
                                        style={{ flexGrow: 1, paddingLeft: '14px', paddingRight: '14px' }}
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-outline" 
                                        onClick={triggerAIAudit} 
                                        disabled={aiAnalyzing}
                                        style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
                                    >
                                        <Sparkles size={16} /> {aiAnalyzing ? '...' : (isArabic ? 'تحليل الذكاء' : 'AI Suggest')}
                                    </button>
                                </div>
                            </div>
                            
                            {/* AI suggestion Tip Display */}
                            {aiTip && (
                                <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '10px', fontSize: '12px', borderLeft: '3px solid var(--color-primary)', marginBottom: '15px' }}>
                                    <strong>💡 AI Tip:</strong> {aiTip}
                                </div>
                            )}

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label">{isArabic ? 'وصف تفصيلي' : 'Description'}</label>
                                    <button 
                                        type="button" 
                                        className="btn-link-ai" 
                                        onClick={() => triggerAIDescSuggest('task')}
                                        disabled={aiSuggestingDesc}
                                    >
                                        <Sparkles size={12} /> {aiSuggestingDesc ? '...' : (isArabic ? 'توليد وصف تلقائي' : 'AI Generate Description')}
                                    </button>
                                </div>
                                <textarea 
                                    className="form-control" 
                                    placeholder={isArabic ? 'اكتب تفاصيل وإرشادات المهمة هنا...' : 'Task details and instructions...'}
                                    value={taskDesc}
                                    onChange={e => setTaskDesc(e.target.value)}
                                    style={{ height: '70px', paddingLeft: '14px', paddingRight: '14px', resize: 'none' }}
                                />
                            </div>

                            {/* Lock Baseline points note */}
                            <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{isArabic ? 'مكافأة الإكمال الثابتة للمهمة:' : 'Task baseline completion reward:'}</span>
                                <strong style={{ color: '#d97706' }}>+25 Coins</strong>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                                    <input 
                                        type="date" 
                                        className="form-control" 
                                        value={taskDueDate}
                                        onChange={e => setTaskDueDate(e.target.value)}
                                        required
                                        style={{ paddingLeft: '14px', paddingRight: '14px' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">{isArabic ? 'مستوى الأولوية' : 'Priority'}</label>
                                    <select className="form-control" value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">{isArabic ? 'التصنيف' : 'Category'}</label>
                                    <select className="form-control" value={taskCategory} onChange={e => setTaskCategory(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                        <option value="general">General</option>
                                        <option value="work">Work</option>
                                        <option value="personal">Personal</option>
                                        <option value="education">Education</option>
                                        <option value="health">Health</option>
                                        <option value="finance">Finance</option>
                                        <option value="shopping">Shopping</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">{isArabic ? 'الربط بمشروع' : 'Project Association'}</label>
                                    <select className="form-control" value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                        <option value="">No Project Workspace</option>
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Subtask Suggestions list wrapper */}
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label">{isArabic ? 'مولد المهام الفرعية التلقائي' : 'AI Subtasks Generator'}</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-outline" 
                                        style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                                        onClick={() => triggerAISubtasksSuggest('')}
                                        disabled={aiSuggestingSubtasks}
                                    >
                                        <Sparkles size={12} /> {aiSuggestingSubtasks ? '...' : (isArabic ? 'اقتراح 3 مهام فرعية أو أكثر بالذكاء' : 'Suggest 3+ subtasks')}
                                    </button>
                                </div>
                                {suggestedSubtasksList.length > 0 && (
                                    <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>{isArabic ? 'المهام الفرعية المقترحة التي سيتم إضافتها تلقائياً:' : 'Suggested subtasks to be added automatically:'}</div>
                                        <ul style={{ paddingLeft: '20px', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {suggestedSubtasksList.map((st, i) => (
                                                <li key={i}>{st}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => { setShowTaskModal(false); setEditingTask(null); clearTaskForm(); }}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="btn btn-primary">{isArabic ? 'حفظ المهمة' : 'Save Task'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Project Form */}
            {showProjectModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{isArabic ? 'إنشاء مساحة عمل لمشروع جديد' : 'Create New Project Workspace'}</h3>
                        <form onSubmit={handleCreateProject} style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{isArabic ? 'اسم المشروع' : 'Project Name'}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. Website Overhaul" 
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                    required 
                                    style={{ paddingLeft: '14px', paddingRight: '14px' }}
                                />
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label">{isArabic ? 'الوصف' : 'Description'}</label>
                                    <button 
                                        type="button" 
                                        className="btn-link-ai" 
                                        onClick={() => triggerAIDescSuggest('project')}
                                        disabled={projectAiSuggestingDesc}
                                    >
                                        <Sparkles size={12} /> {projectAiSuggestingDesc ? '...' : (isArabic ? 'وصف بالذكاء الاصطناعي' : 'AI Generate Description')}
                                    </button>
                                </div>
                                <textarea 
                                    className="form-control" 
                                    placeholder={isArabic ? 'اكتب أهداف ومرئيات هذا المشروع...' : 'Brief explanation of goals...'}
                                    value={projectDesc}
                                    onChange={e => setProjectDesc(e.target.value)}
                                    style={{ height: '70px', paddingLeft: '14px', paddingRight: '14px', resize: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isArabic ? 'التصنيف الرئيسي' : 'Category'}</label>
                                <select className="form-control" value={projectCategory} onChange={e => setProjectCategory(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                    <option value="general">General</option>
                                    <option value="work">Work</option>
                                    <option value="personal">Personal</option>
                                    <option value="education">Education</option>
                                    <option value="health">Health</option>
                                    <option value="finance">Finance</option>
                                    <option value="shopping">Shopping</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowProjectModal(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="btn btn-primary">{isArabic ? 'إنشاء مساحة العمل' : 'Create Workspace'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Catalog Reward Form */}
            {showRewardModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Item to Coins Catalog</h3>
                        <form onSubmit={handleCreateReward} style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">Item Title</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. Neon Horizon Theme" 
                                    value={rewardTitle}
                                    onChange={e => setRewardTitle(e.target.value)}
                                    required 
                                    style={{ paddingLeft: '14px', paddingRight: '14px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-control" 
                                    placeholder="e.g. Customize your sidebar with a glow neon styling effect."
                                    value={rewardDesc}
                                    onChange={e => setRewardDesc(e.target.value)}
                                    style={{ height: '70px', paddingLeft: '14px', paddingRight: '14px', resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Cost (Coins)</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        min="0"
                                        value={rewardCost}
                                        onChange={e => setRewardCost(parseInt(e.target.value) || 0)}
                                        required
                                        style={{ paddingLeft: '14px', paddingRight: '14px' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Item Type</label>
                                    <select className="form-control" value={rewardType} onChange={e => setRewardType(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                        <option value="theme">Dashboard Theme</option>
                                        <option value="avatarFrame">Avatar Frame</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Asset Path / Theme skin (indigo, emerald, rose, sky)</label>
                                <select className="form-control" value={rewardValue} onChange={e => setRewardValue(e.target.value)} style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                    <option value="indigo">Indigo</option>
                                    <option value="emerald">Emerald</option>
                                    <option value="rose">Rose</option>
                                    <option value="sky">Sky Blue</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowRewardModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Admin Permissions Configuration */}
            {showPermissionsModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>Configure Admin Permissions</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                            Granting administrative permissions for user: <strong>{selectedAdminUser?.firstName} {selectedAdminUser?.lastName}</strong> ({selectedAdminUser?.email})
                        </p>
                        
                        <form onSubmit={handleSavePermissions} style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">User Role</label>
                                    <select className="form-control" value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ paddingLeft: '14px' }}>
                                        <option value="user">Standard User</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Subscription Tier</label>
                                    <select className="form-control" value={selectedSubscription} onChange={e => setSelectedSubscription(e.target.value)} style={{ paddingLeft: '14px' }}>
                                        <option value="free">Free Tier</option>
                                        <option value="pro">Pro Tier</option>
                                        <option value="lifetime">Lifetime</option>
                                    </select>
                                </div>
                            </div>

                            {selectedType === 'admin' && (
                                <div className="form-group">
                                    <label className="form-label">Allowed Admin Permissions</label>
                                    <div className="admin-permissions-grid">
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPermissions.includes('manageUsers')} 
                                                onChange={() => handlePermissionCheckbox('manageUsers')}
                                            />
                                            Manage Users (Type promotes)
                                        </label>
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPermissions.includes('manageTasks')} 
                                                onChange={() => handlePermissionCheckbox('manageTasks')}
                                            />
                                            Manage Tasks (All User tasks view)
                                        </label>
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPermissions.includes('manageRewards')} 
                                                onChange={() => handlePermissionCheckbox('manageRewards')}
                                            />
                                            Manage Rewards Store Catalog
                                        </label>
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPermissions.includes('manageLeaderboard')} 
                                                onChange={() => handlePermissionCheckbox('manageLeaderboard')}
                                            />
                                            Snapshot Weekly Leaderboards
                                        </label>
                                        <label className="checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPermissions.includes('manageSystem')} 
                                                onChange={() => handlePermissionCheckbox('manageSystem')}
                                            />
                                            Access System Health Metrics
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowPermissionsModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Apply Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: AI Subtasks Suggestions Confirmation */}
            {showSubtaskConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                            {isArabic ? 'المهام الفرعية المقترحة من الذكاء الاصطناعي' : 'AI Suggested Subtasks'}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
                            {isArabic 
                                ? 'يقترح المساعد الذكي المهام التالية للتأكد من إكمال المهام الكبيرة بكفاءة. هل تود إضافتها؟' 
                                : 'Review the suggested subtasks generated by Gemini AI. You can deselect or modify them before accepting.'
                            }
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '10px', marginBottom: '24px' }}>
                            {confirmSubtasksList.map((st, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: st.selected ? 1 : 0.5 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={st.selected} 
                                        onChange={() => {
                                            const updated = [...confirmSubtasksList];
                                            updated[idx].selected = !updated[idx].selected;
                                            setConfirmSubtasksList(updated);
                                        }}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--bg-secondary)', textDecoration: st.selected ? 'none' : 'line-through' }}
                                        value={st.text}
                                        onChange={e => {
                                            const updated = [...confirmSubtasksList];
                                            updated[idx].text = e.target.value;
                                            setConfirmSubtasksList(updated);
                                        }}
                                    />
                                </div>
                            ))}
                            {confirmSubtasksList.length === 0 && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    {isArabic ? 'تم إلغاء تحديد كافة الاقتراحات.' : 'All suggestions deselected.'}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                type="button" 
                                className="btn btn-outline" 
                                onClick={() => {
                                    setShowSubtaskConfirmModal(false);
                                    setConfirmSubtasksList([]);
                                    setConfirmSubtaskTaskId('');
                                }}
                            >
                                {isArabic ? 'رفض الكل' : 'Discard All'}
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                onClick={handleAcceptSubtaskSuggestions}
                                disabled={confirmSubtasksList.filter(s => s.selected).length === 0}
                            >
                                {isArabic ? 'قبول وإضافة' : 'Accept Suggestions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Upgrade Subscriptions Options */}
            {showUpgradeModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <h3>
                            {isArabic ? 'اختر طريقة الدفع' : 'Choose Subscription Payment'}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '25px' }}>
                            {selectedUpgradeTier === 'pro' 
                                ? (isArabic ? 'ترقية الاشتراك للباقة الاحترافية (شهرية)' : 'Upgrade to Pro Monthly Subscription')
                                : (isArabic ? 'شراء باقة مدى الحياة (دفعة واحدة)' : 'Upgrade to Lifetime Access Subscription')
                            }
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Option 1: Card/Cash payment */}
                            <div 
                                className="card" 
                                style={{ cursor: 'pointer', border: '1.5px solid var(--border-color)', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                                onClick={() => handleUpgradeSelf(selectedUpgradeTier, 'cash')}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                                        {isArabic ? 'الدفع بالبطاقة الائتمانية' : 'Pay via Credit/Debit Card'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {isArabic ? 'بوابة دفع آمنة مشفرة' : 'Secure instant payment transaction'}
                                    </div>
                                </div>
                                <strong style={{ color: 'var(--color-primary)', fontSize: '18px' }}>
                                    {selectedUpgradeTier === 'pro' ? '$10' : '$30'}
                                </strong>
                            </div>

                            {/* Option 2: Coins payment */}
                            <div 
                                className="card" 
                                style={{ cursor: 'pointer', border: '1.5px solid var(--border-color)', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                                onClick={() => handleUpgradeSelf(selectedUpgradeTier, 'coins')}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                                        {isArabic ? 'شراء بالعملات المكتسبة' : 'Purchase with Coins'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {isArabic ? `رصيدك الحالي: ${user?.coins || 0} عملة` : `Your balance: ${user?.coins || 0} coins`}
                                    </div>
                                </div>
                                <strong style={{ color: '#d97706', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Coins size={18} />
                                    {selectedUpgradeTier === 'pro' ? '10K' : '50K'}
                                </strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button 
                                type="button" 
                                className="btn btn-outline" 
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                }}
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts overlay */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <AlertCircle size={18} />
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;

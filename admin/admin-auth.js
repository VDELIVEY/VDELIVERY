
// Simple Admin Authentication System
class AdminAuth {
    constructor() {
        this.adminUsers = [
            {
                email: 'admin@vdeliver.com',
                password: 'admin123', // Change this in production!
                name: 'System Administrator'
            }
            // Add more admin users as needed
        ];
        this.currentAdmin = null;
        this.init();
    }

    init() {
        this.loadAdminSession();
        this.setupEventListeners();
    }

    loadAdminSession() {
        const adminSession = localStorage.getItem('vdeliver_admin_session');
        if (adminSession) {
            this.currentAdmin = JSON.parse(adminSession);
            this.showAdminInterface();
        }
    }

    login(email, password) {
        return new Promise((resolve, reject) => {
            const admin = this.adminUsers.find(user => 
                user.email === email && user.password === password
            );

            if (admin) {
                this.currentAdmin = admin;
                localStorage.setItem('vdeliver_admin_session', JSON.stringify(admin));
                this.showAdminInterface();
                resolve(admin);
            } else {
                reject('Invalid admin credentials');
            }
        });
    }

    logout() {
        this.currentAdmin = null;
        localStorage.removeItem('vdeliver_admin_session');
        this.hideAdminInterface();
        window.location.href = 'admin/login.html';
    }

    showAdminInterface() {
        // This will be used in admin pages
        console.log('Admin logged in:', this.currentAdmin.name);
    }

    hideAdminInterface() {
        console.log('Admin logged out');
    }

    setupEventListeners() {
        // Will be used in admin login page
    }

    isLoggedIn() {
        return this.currentAdmin !== null;
    }
}

// Initialize admin auth system
window.adminAuth = new AdminAuth();

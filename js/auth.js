/**
 * SCMS Session Authentication Handler
 */

const auth = {
    // Student Session Info
    getCurrentUser() {
        const userStr = sessionStorage.getItem('scms_current_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    requireStudent() {
        const user = this.getCurrentUser();
        if (!user) {
            // Find relative path depth to redirect to login.html
            window.location.href = 'login.html';
        }
        return user;
    },

    // Admin Session Info
    getCurrentAdmin() {
        return sessionStorage.getItem('scms_current_admin');
    },

    requireAdmin() {
        const admin = this.getCurrentAdmin();
        if (!admin) {
            window.location.href = 'admin-login.html';
        }
        return admin;
    },

    // Logouts
    logoutStudent() {
        sessionStorage.removeItem('scms_current_user');
        window.location.href = 'index.html';
    },

    logoutAdmin() {
        sessionStorage.removeItem('scms_current_admin');
        window.location.href = 'index.html';
    }
};

/**
 * SCMS Pure LocalStorage Database Engine
 */

const DB_KEYS = {
    USERS: 'scms_users',
    COMPLAINTS: 'scms_complaints',
    CURRENT_USER: 'scms_current_user',
    CURRENT_ADMIN: 'scms_current_admin'
};

// Default Admin Credentials
const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin123'
};

// Seed Mock Data
const DEFAULT_USERS = [
    { id: 101, name: 'Raushan Kumar', email: 'student@scms.edu', password: 'password123' },
    { id: 102, name: 'Priya Sharma', email: 'priya@scms.edu', password: 'password123' }
];

const DEFAULT_COMPLAINTS = [
    {
        complaint_id: 1001,
        user_id: 101,
        user_name: 'Raushan Kumar',
        title: 'Hostel Wi-Fi Signal Strength is Too Low',
        category: 'Hostel',
        priority: 'High',
        description: 'The Wi-Fi speed in Block C, Rooms 301-310 is extremely slow (under 1 Mbps). It drops constantly, making it impossible to attend online lectures or do research.',
        status: 'In Progress',
        created_at: '2026-06-05T10:15:30.000Z',
        admin_remarks: 'Network administrator notified. They will install an additional router/repeater in the Block C third floor corridor on Monday morning.'
    },
    {
        complaint_id: 1002,
        user_id: 101,
        user_name: 'Raushan Kumar',
        title: 'Request for New Edition Reference Books in Library',
        category: 'Library',
        priority: 'Low',
        description: 'The library currently only has the 2018 edition of Software Engineering by Pressman. We request the library committee to procure the latest 2024 editions.',
        status: 'Resolved',
        created_at: '2026-05-28T14:30:00.000Z',
        admin_remarks: 'Procured 10 copies of the latest edition. They are now available in the Reference Section under shelf code SE-04.'
    },
    {
        complaint_id: 1003,
        user_id: 102,
        user_name: 'Priya Sharma',
        title: 'Water Cooler on 2nd Floor of Academic Block Not Working',
        category: 'Infrastructure',
        priority: 'Medium',
        description: 'The water cooler near Classroom 204 is dispensing warm water and there is a minor water leakage underneath the machine. Please fix this soon.',
        status: 'Pending',
        created_at: '2026-06-07T08:45:00.000Z',
        admin_remarks: ''
    }
];

// Initialize database with default data if empty
function initDatabase() {
    if (!localStorage.getItem(DB_KEYS.USERS)) {
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(DB_KEYS.COMPLAINTS)) {
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(DEFAULT_COMPLAINTS));
    }
}

initDatabase();

// ----------------------------------------------------
// ASYNCHRONOUS LOCALSTORAGE DATABASE INTERFACE
// ----------------------------------------------------
const db = {
    // Student Authentication
    async getUsers() {
        return JSON.parse(localStorage.getItem(DB_KEYS.USERS)) || [];
    },

    async registerStudent(name, email, password) {
        const cleanEmail = email.toLowerCase().trim();
        const users = await this.getUsers();
        
        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
            return { success: false, message: 'Email address already registered.' };
        }

        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 101;
        const newUser = { id: newId, name, email: cleanEmail, password };
        
        users.push(newUser);
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        return { success: true, user: newUser };
    },

    async loginStudent(email, password) {
        const cleanEmail = email.toLowerCase().trim();
        const users = await this.getUsers();
        const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
        
        if (user) {
            sessionStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password.' };
    },

    // Admin Authentication
    async loginAdmin(username, password) {
        if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
            sessionStorage.setItem(DB_KEYS.CURRENT_ADMIN, username);
            return { success: true };
        }
        return { success: false, message: 'Invalid admin credentials.' };
    },

    // Complaint CRUD Actions
    async getComplaints() {
        return JSON.parse(localStorage.getItem(DB_KEYS.COMPLAINTS)) || [];
    },

    async getStudentComplaints(userId) {
        const all = await this.getComplaints();
        return all.filter(c => c.user_id === parseInt(userId));
    },

    async getComplaintById(complaintId) {
        const idInt = parseInt(complaintId);
        const all = await this.getComplaints();
        return all.find(c => c.complaint_id === idInt) || null;
    },

    async addComplaint(userId, userName, title, category, priority, description) {
        const complaints = await this.getComplaints();
        const newId = complaints.length > 0 ? Math.max(...complaints.map(c => c.complaint_id)) + 1 : 1001;
        
        const newComplaint = {
            complaint_id: newId,
            user_id: parseInt(userId),
            user_name: userName,
            title,
            category,
            priority,
            description,
            status: 'Pending',
            created_at: new Date().toISOString(),
            admin_remarks: ''
        };

        complaints.push(newComplaint);
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
        return { success: true, complaint: newComplaint };
    },

    async updateComplaint(complaintId, title, description) {
        const idInt = parseInt(complaintId);
        const complaints = await this.getComplaints();
        const index = complaints.findIndex(c => c.complaint_id === idInt);
        
        if (index === -1) return { success: false, message: 'Complaint not found.' };
        if (complaints[index].status !== 'Pending') {
            return { success: false, message: 'Only pending complaints can be edited.' };
        }

        complaints[index].title = title;
        complaints[index].description = description;
        
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
        return { success: true };
    },

    // Admin Actions
    async updateComplaintStatus(complaintId, status, remarks) {
        const idInt = parseInt(complaintId);
        const complaints = await this.getComplaints();
        const index = complaints.findIndex(c => c.complaint_id === idInt);
        
        if (index === -1) return { success: false, message: 'Complaint not found.' };

        complaints[index].status = status;
        complaints[index].admin_remarks = remarks || '';
        
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
        return { success: true };
    },

    async deleteComplaint(complaintId) {
        const idInt = parseInt(complaintId);
        let complaints = await this.getComplaints();
        complaints = complaints.filter(c => c.complaint_id !== idInt);
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
        return { success: true };
    }
};

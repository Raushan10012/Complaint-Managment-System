/**
 * SCMS Hybrid Database Engine (Firebase Firestore with LocalStorage Fallback)
 */

const DB_KEYS = {
    USERS: 'scms_users',
    COMPLAINTS: 'scms_complaints',
    CURRENT_USER: 'scms_current_user',
    CURRENT_ADMIN: 'scms_current_admin'
};

// ----------------------------------------------------
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ----------------------------------------------------
// Replace placeholders with your own Firebase keys
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
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

let isFirebaseMode = false;
let firestoreDb = null;

// Determine DB Mode
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        firebase.initializeApp(firebaseConfig);
        firestoreDb = firebase.firestore();
        isFirebaseMode = true;
        console.log("SCMS Database: Initialized Firebase Firestore mode successfully.");
    } catch (error) {
        console.error("Firebase init failed, falling back to LocalStorage mode:", error);
    }
} else {
    console.log("SCMS Database: Firebase config not set or library missing. Running in LocalStorage mode.");
}

// ----------------------------------------------------
// 2. INTERNAL LOCALSTORAGE IMPLEMENTATION
// ----------------------------------------------------
function initLocalStorage() {
    if (!localStorage.getItem(DB_KEYS.USERS)) {
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(DB_KEYS.COMPLAINTS)) {
        localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(DEFAULT_COMPLAINTS));
    }
}

if (!isFirebaseMode) {
    initLocalStorage();
}

// ----------------------------------------------------
// 3. AUTO-SEEDING FOR FIREBASE FIRESTORE
// ----------------------------------------------------
async function seedFirebaseIfEmpty() {
    if (!isFirebaseMode) return;
    try {
        const usersSnap = await firestoreDb.collection('users').limit(1).get();
        if (usersSnap.empty) {
            console.log("SCMS Database: Seeding default users to Firestore...");
            for (const user of DEFAULT_USERS) {
                await firestoreDb.collection('users').doc(user.email.toLowerCase()).set(user);
            }
        }

        const complaintsSnap = await firestoreDb.collection('complaints').limit(1).get();
        if (complaintsSnap.empty) {
            console.log("SCMS Database: Seeding default complaints to Firestore...");
            for (const complaint of DEFAULT_COMPLAINTS) {
                await firestoreDb.collection('complaints').doc(complaint.complaint_id.toString()).set(complaint);
            }
        }
    } catch (e) {
        console.warn("Auto-seeding Firebase failed. Check security rules:", e);
    }
}

if (isFirebaseMode) {
    seedFirebaseIfEmpty();
}

// ----------------------------------------------------
// 4. UNIFIED ASYNCHRONOUS DATABASE INTERFACE
// ----------------------------------------------------
const db = {
    // Student Authentication
    async getUsers() {
        if (isFirebaseMode) {
            const snap = await firestoreDb.collection('users').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } else {
            return JSON.parse(localStorage.getItem(DB_KEYS.USERS)) || [];
        }
    },

    async registerStudent(name, email, password) {
        const cleanEmail = email.toLowerCase().trim();
        
        if (isFirebaseMode) {
            const userDoc = await firestoreDb.collection('users').doc(cleanEmail).get();
            if (userDoc.exists) {
                return { success: false, message: 'Email address already registered.' };
            }

            // Get a unique numeric ID
            const usersSnap = await firestoreDb.collection('users').get();
            let maxId = 100;
            usersSnap.forEach(doc => {
                const u = doc.data();
                if (u.id && u.id > maxId) maxId = u.id;
            });
            const newId = maxId + 1;

            const newUser = { id: newId, name, email: cleanEmail, password };
            await firestoreDb.collection('users').doc(cleanEmail).set(newUser);
            return { success: true, user: newUser };
        } else {
            const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS)) || [];
            if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
                return { success: false, message: 'Email address already registered.' };
            }

            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 101;
            const newUser = { id: newId, name, email: cleanEmail, password };
            
            users.push(newUser);
            localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
            return { success: true, user: newUser };
        }
    },

    async loginStudent(email, password) {
        const cleanEmail = email.toLowerCase().trim();
        
        if (isFirebaseMode) {
            const userDoc = await firestoreDb.collection('users').doc(cleanEmail).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                if (user.password === password) {
                    sessionStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
                    return { success: true, user };
                }
            }
            return { success: false, message: 'Invalid email or password.' };
        } else {
            const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS)) || [];
            const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
            if (user) {
                sessionStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
                return { success: true, user };
            }
            return { success: false, message: 'Invalid email or password.' };
        }
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
        if (isFirebaseMode) {
            const snap = await firestoreDb.collection('complaints').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } else {
            return JSON.parse(localStorage.getItem(DB_KEYS.COMPLAINTS)) || [];
        }
    },

    async getStudentComplaints(userId) {
        const all = await this.getComplaints();
        return all.filter(c => c.user_id === parseInt(userId));
    },

    async getComplaintById(complaintId) {
        const idInt = parseInt(complaintId);
        if (isFirebaseMode) {
            const doc = await firestoreDb.collection('complaints').doc(idInt.toString()).get();
            return doc.exists ? doc.data() : null;
        } else {
            const all = await this.getComplaints();
            return all.find(c => c.complaint_id === idInt) || null;
        }
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

        if (isFirebaseMode) {
            await firestoreDb.collection('complaints').doc(newId.toString()).set(newComplaint);
            return { success: true, complaint: newComplaint };
        } else {
            complaints.push(newComplaint);
            localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
            return { success: true, complaint: newComplaint };
        }
    },

    async updateComplaint(complaintId, title, description) {
        const idInt = parseInt(complaintId);
        
        if (isFirebaseMode) {
            const docRef = firestoreDb.collection('complaints').doc(idInt.toString());
            const doc = await docRef.get();
            if (!doc.exists) return { success: false, message: 'Complaint not found.' };
            
            const data = doc.data();
            if (data.status !== 'Pending') {
                return { success: false, message: 'Only pending complaints can be edited.' };
            }

            await docRef.update({ title, description });
            return { success: true };
        } else {
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
        }
    },

    // Admin Actions
    async updateComplaintStatus(complaintId, status, remarks) {
        const idInt = parseInt(complaintId);

        if (isFirebaseMode) {
            const docRef = firestoreDb.collection('complaints').doc(idInt.toString());
            const doc = await docRef.get();
            if (!doc.exists) return { success: false, message: 'Complaint not found.' };

            await docRef.update({ status, admin_remarks: remarks || '' });
            return { success: true };
        } else {
            const complaints = await this.getComplaints();
            const index = complaints.findIndex(c => c.complaint_id === idInt);
            
            if (index === -1) return { success: false, message: 'Complaint not found.' };

            complaints[index].status = status;
            complaints[index].admin_remarks = remarks || '';
            
            localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
            return { success: true };
        }
    },

    async deleteComplaint(complaintId) {
        const idInt = parseInt(complaintId);
        if (isFirebaseMode) {
            await firestoreDb.collection('complaints').doc(idInt.toString()).delete();
            return { success: true };
        } else {
            let complaints = await this.getComplaints();
            complaints = complaints.filter(c => c.complaint_id !== idInt);
            localStorage.setItem(DB_KEYS.COMPLAINTS, JSON.stringify(complaints));
            return { success: true };
        }
    }
};

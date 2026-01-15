// ============================================
// DATABASE SYSTEM - INDEXEDDB
// ============================================

class VotingDB {
    constructor() {
        this.dbName = 'ElectionSystemDB';
        this.version = 4; // Naikkan versi untuk upgrade schema
        this.db = null;
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ Database initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Upgrading database...');
                const db = event.target.result;
                
                // Create voters store
                if (!db.objectStoreNames.contains('voters')) {
                    const votersStore = db.createObjectStore('voters', { keyPath: 'id' });
                    votersStore.createIndex('username', 'username', { unique: true });
                    votersStore.createIndex('class', 'class', { unique: false });
                    votersStore.createIndex('has_voted', 'has_voted', { unique: false });
                    votersStore.createIndex('vote_time', 'vote_time', { unique: false });
                    console.log('✅ Created voters store');
                }
                
                // Create candidates store
                if (!db.objectStoreNames.contains('candidates')) {
                    const candidatesStore = db.createObjectStore('candidates', { keyPath: 'id' });
                    candidatesStore.createIndex('number', 'number', { unique: true });
                    candidatesStore.createIndex('votes', 'votes', { unique: false });
                    candidatesStore.createIndex('chairman_name', 'chairman_name', { unique: false });
                    console.log('✅ Created candidates store');
                }
                
                // Create votes store
                if (!db.objectStoreNames.contains('votes')) {
                    const votesStore = db.createObjectStore('votes', { keyPath: 'id', autoIncrement: true });
                    votesStore.createIndex('voter_id', 'voter_id', { unique: true });
                    votesStore.createIndex('candidate_id', 'candidate_id', { unique: false });
                    votesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    votesStore.createIndex('voter_name', 'voter_name', { unique: false });
                    console.log('✅ Created votes store');
                }
                
                // Create admin store
                if (!db.objectStoreNames.contains('admins')) {
                    const adminsStore = db.createObjectStore('admins', { keyPath: 'id' });
                    adminsStore.createIndex('username', 'username', { unique: true });
                    adminsStore.createIndex('role', 'role', { unique: false });
                    console.log('✅ Created admins store');
                }
                
                // Create audit log store (FIX: Tambahkan ini)
                if (!db.objectStoreNames.contains('audit_logs')) {
                    const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('action', 'action', { unique: false });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('user_id', 'user_id', { unique: false });
                    console.log('✅ Created audit logs store');
                }
            };
        });
    }
    
    // ============================================
    // VOTER FUNCTIONS
    // ============================================

    async addVoter(voter) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            
            const voterData = {
                ...voter,
                has_voted: false,
                vote_candidate_id: null,
                vote_time: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(voterData);
            
            request.onsuccess = () => {
                console.log('✅ Voter added:', voter.username);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVoterByUsername(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('username');
            const request = index.get(username);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVoterById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async updateVoter(voterId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            
            const getRequest = store.get(voterId);
            
            getRequest.onsuccess = () => {
                const voter = getRequest.result;
                if (!voter) {
                    reject(new Error('Voter not found'));
                    return;
                }
                
                const updatedVoter = { 
                    ...voter, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedVoter);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Voter updated:', voterId);
                    resolve({ success: true, voter: updatedVoter });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating voter:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotersByClass(className) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('class');
            const request = index.getAll(className);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voters by class:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotedVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('has_voted');
            const request = index.getAll(true);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting voted voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getNotVotedVoters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readonly');
            const store = transaction.objectStore('voters');
            const index = store.index('has_voted');
            const request = index.getAll(false);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting not voted voters:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteVoter(voterId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['voters'], 'readwrite');
            const store = transaction.objectStore('voters');
            const request = store.delete(voterId);
            
            request.onsuccess = () => {
                console.log('✅ Voter deleted:', voterId);
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting voter:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // CANDIDATE FUNCTIONS
    // ============================================

    async addCandidate(candidate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const candidateData = {
                ...candidate,
                votes: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(candidateData);
            
            request.onsuccess = () => {
                console.log('✅ Candidate added:', candidate.chairman_name);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllCandidates() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const candidates = request.result || [];
                console.log('✅ Candidates loaded:', candidates.length);
                resolve(candidates);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidates:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getCandidate(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getCandidateByNumber(number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readonly');
            const store = transaction.objectStore('candidates');
            const index = store.index('number');
            const request = index.get(number);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting candidate by number:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async updateCandidate(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                const updatedCandidate = { 
                    ...candidate, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedCandidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate updated:', id);
                    resolve({ success: true, candidate: updatedCandidate });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteCandidate(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('✅ Candidate deleted:', id);
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async incrementCandidateVotes(candidateId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(candidateId);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                candidate.votes = (candidate.votes || 0) + 1;
                candidate.updated_at = new Date().toISOString();
                
                const putRequest = store.put(candidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate votes incremented:', candidateId);
                    resolve({ success: true, votes: candidate.votes });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate votes:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async decrementCandidateVotes(candidateId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['candidates'], 'readwrite');
            const store = transaction.objectStore('candidates');
            
            const getRequest = store.get(candidateId);
            
            getRequest.onsuccess = () => {
                const candidate = getRequest.result;
                if (!candidate) {
                    reject(new Error('Candidate not found'));
                    return;
                }
                
                candidate.votes = Math.max(0, (candidate.votes || 0) - 1);
                candidate.updated_at = new Date().toISOString();
                
                const putRequest = store.put(candidate);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Candidate votes decremented:', candidateId);
                    resolve({ success: true, votes: candidate.votes });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating candidate votes:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // VOTING FUNCTIONS
    // ============================================

    async castVote(voterId, candidateId) {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                
                // Check if voter already voted
                const votersStore = transaction.objectStore('voters');
                const getVoterRequest = votersStore.get(voterId);
                
                getVoterRequest.onsuccess = () => {
                    const voter = getVoterRequest.result;
                    
                    if (!voter) {
                        reject(new Error('Voter not found'));
                        return;
                    }
                    
                    if (voter.has_voted) {
                        resolve({ 
                            success: false, 
                            already_voted: true, 
                            message: 'Anda sudah melakukan voting sebelumnya.' 
                        });
                        return;
                    }
                    
                    // Update voter as voted
                    voter.has_voted = true;
                    voter.vote_candidate_id = candidateId;
                    voter.vote_time = new Date().toISOString();
                    voter.updated_at = new Date().toISOString();
                    
                    const updateVoterRequest = votersStore.put(voter);
                    
                    updateVoterRequest.onsuccess = () => {
                        console.log('✅ Voter marked as voted:', voterId);
                        
                        // Increment candidate votes
                        const candidatesStore = transaction.objectStore('candidates');
                        const getCandidateRequest = candidatesStore.get(candidateId);
                        
                        getCandidateRequest.onsuccess = () => {
                            const candidate = getCandidateRequest.result;
                            
                            if (!candidate) {
                                reject(new Error('Candidate not found'));
                                return;
                            }
                            
                            candidate.votes = (candidate.votes || 0) + 1;
                            candidate.updated_at = new Date().toISOString();
                            
                            const updateCandidateRequest = candidatesStore.put(candidate);
                            
                            updateCandidateRequest.onsuccess = () => {
                                console.log('✅ Candidate votes incremented:', candidateId);
                                
                                // Record vote in votes store
                                const votesStore = transaction.objectStore('votes');
                                const voteRecord = {
                                    voter_id: voterId,
                                    candidate_id: candidateId,
                                    timestamp: new Date().toISOString(),
                                    voter_name: voter.name,
                                    candidate_name: candidate.chairman_name,
                                    candidate_number: candidate.number,
                                    voter_class: voter.class
                                };
                                
                                const addVoteRequest = votesStore.add(voteRecord);
                                
                                addVoteRequest.onsuccess = () => {
                                    console.log('✅ Vote recorded:', voteRecord);
                                    
                                    // Add audit log
                                    const auditStore = transaction.objectStore('audit_logs');
                                    const auditLog = {
                                        action: 'VOTE_CAST',
                                        user_id: voterId,
                                        user_name: voter.name,
                                        details: `Memilih kandidat ${candidate.number} - ${candidate.chairman_name}`,
                                        timestamp: new Date().toISOString(),
                                        ip_address: 'localhost'
                                    };
                                    
                                    auditStore.add(auditLog);
                                    
                                    transaction.oncomplete = () => {
                                        resolve({ 
                                            success: true, 
                                            timestamp: voter.vote_time,
                                            candidate: candidate.chairman_name,
                                            candidate_number: candidate.number,
                                            votes: candidate.votes,
                                            voter: voter.name,
                                            voter_class: voter.class
                                        });
                                    };
                                };
                                
                                addVoteRequest.onerror = (event) => {
                                    console.error('❌ Error recording vote:', event.target.error);
                                    reject(event.target.error);
                                };
                            };
                            
                            updateCandidateRequest.onerror = (event) => {
                                console.error('❌ Error updating candidate:', event.target.error);
                                reject(event.target.error);
                            };
                        };
                        
                        getCandidateRequest.onerror = (event) => {
                            console.error('❌ Error getting candidate:', event.target.error);
                            reject(event.target.error);
                        };
                    };
                    
                    updateVoterRequest.onerror = (event) => {
                        console.error('❌ Error updating voter:', event.target.error);
                        reject(event.target.error);
                    };
                };
                
                getVoterRequest.onerror = (event) => {
                    console.error('❌ Error getting voter:', event.target.error);
                    reject(event.target.error);
                };
                
            } catch (error) {
                console.error('❌ Error in castVote:', error);
                reject(error);
            }
        });
    }

    async getAllVotes() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['votes'], 'readonly');
            const store = transaction.objectStore('votes');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting votes:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVoteByVoterId(voterId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['votes'], 'readonly');
            const store = transaction.objectStore('votes');
            const index = store.index('voter_id');
            const request = index.get(voterId);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting vote:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotesByCandidateId(candidateId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['votes'], 'readonly');
            const store = transaction.objectStore('votes');
            const index = store.index('candidate_id');
            const request = index.getAll(candidateId);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting votes by candidate:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getVotesByDate(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['votes'], 'readonly');
            const store = transaction.objectStore('votes');
            const index = store.index('timestamp');
            const request = index.getAll();
            
            request.onsuccess = () => {
                const allVotes = request.result || [];
                const filteredVotes = allVotes.filter(vote => {
                    const voteDate = new Date(vote.timestamp);
                    return voteDate >= startDate && voteDate <= endDate;
                });
                resolve(filteredVotes);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting votes by date:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteVote(voteId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['votes'], 'readwrite');
            const store = transaction.objectStore('votes');
            const request = store.delete(voteId);
            
            request.onsuccess = () => {
                console.log('✅ Vote deleted:', voteId);
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting vote:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // LOGIN VALIDATION
    // ============================================

    async validateLogin(username) {
        try {
            const voter = await this.getVoterByUsername(username);
            
            if (!voter) {
                return { 
                    success: false, 
                    message: 'Username tidak ditemukan. Gunakan siswa001 sampai siswa107' 
                };
            }
            
            if (voter.has_voted) {
                return {
                    success: false,
                    already_voted: true,
                    message: 'Anda sudah melakukan voting. Anda tidak dapat memilih lagi.',
                    voter: voter
                };
            }
            
            return { 
                success: true, 
                voter: voter
            };
            
        } catch (error) {
            console.error('❌ Error validating login:', error);
            return { 
                success: false, 
                message: 'Terjadi kesalahan saat validasi login' 
            };
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    async resetAllVotes() {
        return new Promise(async (resolve, reject) => {
            try {
                const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                
                // Reset all voters
                const votersStore = transaction.objectStore('voters');
                const votersRequest = votersStore.openCursor();
                
                votersRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.value.has_voted = false;
                        cursor.value.vote_candidate_id = null;
                        cursor.value.vote_time = null;
                        cursor.value.updated_at = new Date().toISOString();
                        cursor.update(cursor.value);
                        cursor.continue();
                    }
                };
                
                // Reset all candidates votes
                const candidatesStore = transaction.objectStore('candidates');
                const candidatesRequest = candidatesStore.openCursor();
                
                candidatesRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.value.votes = 0;
                        cursor.value.updated_at = new Date().toISOString();
                        cursor.update(cursor.value);
                        cursor.continue();
                    }
                };
                
                // Clear all votes
                const votesStore = transaction.objectStore('votes');
                const clearVotesRequest = votesStore.clear();
                
                // Add audit log
                const auditStore = transaction.objectStore('audit_logs');
                const auditLog = {
                    action: 'RESET_ALL_VOTES',
                    user_id: 'admin',
                    user_name: 'System Admin',
                    details: 'Reset semua data voting',
                    timestamp: new Date().toISOString(),
                    ip_address: 'localhost'
                };
                auditStore.add(auditLog);
                
                clearVotesRequest.onsuccess = () => {
                    transaction.oncomplete = () => {
                        console.log('✅ All votes reset successfully');
                        resolve({ success: true });
                    };
                };
                
                clearVotesRequest.onerror = (event) => {
                    console.error('❌ Error clearing votes:', event.target.error);
                    reject(event.target.error);
                };
                
            } catch (error) {
                console.error('❌ Error resetting votes:', error);
                reject(error);
            }
        });
    }

    async resetSingleVote(voterId) {
        return new Promise(async (resolve, reject) => {
            try {
                const voter = await this.getVoterById(voterId);
                if (!voter) {
                    reject(new Error('Voter not found'));
                    return;
                }
                
                if (!voter.has_voted) {
                    resolve({ success: true, message: 'Voter belum memilih' });
                    return;
                }
                
                const candidateId = voter.vote_candidate_id;
                
                const transaction = this.db.transaction(['voters', 'candidates', 'votes', 'audit_logs'], 'readwrite');
                
                // Reset voter
                voter.has_voted = false;
                voter.vote_candidate_id = null;
                voter.vote_time = null;
                voter.updated_at = new Date().toISOString();
                
                const votersStore = transaction.objectStore('voters');
                votersStore.put(voter);
                
                // Decrement candidate votes
                if (candidateId) {
                    const candidatesStore = transaction.objectStore('candidates');
                    const getCandidateRequest = candidatesStore.get(candidateId);
                    
                    getCandidateRequest.onsuccess = () => {
                        const candidate = getCandidateRequest.result;
                        if (candidate) {
                            candidate.votes = Math.max(0, (candidate.votes || 0) - 1);
                            candidate.updated_at = new Date().toISOString();
                            candidatesStore.put(candidate);
                        }
                    };
                }
                
                // Delete vote record
                const votesStore = transaction.objectStore('votes');
                const voteIndex = votesStore.index('voter_id');
                const getVoteRequest = voteIndex.get(voterId);
                
                getVoteRequest.onsuccess = () => {
                    const vote = getVoteRequest.result;
                    if (vote) {
                        votesStore.delete(vote.id);
                    }
                };
                
                // Add audit log
                const auditStore = transaction.objectStore('audit_logs');
                const auditLog = {
                    action: 'RESET_SINGLE_VOTE',
                    user_id: 'admin',
                    user_name: 'System Admin',
                    details: `Reset vote untuk voter: ${voter.name} (ID: ${voterId})`,
                    timestamp: new Date().toISOString(),
                    ip_address: 'localhost'
                };
                auditStore.add(auditLog);
                
                transaction.oncomplete = () => {
                    console.log('✅ Single vote reset:', voterId);
                    resolve({ success: true });
                };
                
            } catch (error) {
                console.error('❌ Error resetting single vote:', error);
                reject(error);
            }
        });
    }

    async getElectionStats() {
        return new Promise(async (resolve, reject) => {
            try {
                const [voters, candidates, votes] = await Promise.all([
                    this.getAllVoters(),
                    this.getAllCandidates(),
                    this.getAllVotes()
                ]);
                
                const totalVoters = voters.length;
                const votedVoters = voters.filter(v => v.has_voted).length;
                const notVotedVoters = totalVoters - votedVoters;
                const votePercentage = totalVoters > 0 ? (votedVoters / totalVoters * 100).toFixed(1) : 0;
                
                // Get votes by class
                const votesByClass = {};
                voters.forEach(voter => {
                    if (voter.has_voted) {
                        if (!votesByClass[voter.class]) {
                            votesByClass[voter.class] = { total: 0, voted: 0 };
                        }
                        votesByClass[voter.class].total++;
                        votesByClass[voter.class].voted++;
                    } else {
                        if (!votesByClass[voter.class]) {
                            votesByClass[voter.class] = { total: 0, voted: 0 };
                        }
                        votesByClass[voter.class].total++;
                    }
                });
                
                // Calculate voting time statistics
                const voteTimes = votes.map(v => new Date(v.timestamp).getTime()).sort();
                const averageVoteTime = voteTimes.length > 0 
                    ? new Date(Math.round(voteTimes.reduce((a, b) => a + b, 0) / voteTimes.length))
                    : null;
                
                const firstVote = voteTimes.length > 0 ? new Date(voteTimes[0]) : null;
                const lastVote = voteTimes.length > 0 ? new Date(voteTimes[voteTimes.length - 1]) : null;
                
                resolve({
                    totalVoters,
                    votedVoters,
                    notVotedVoters,
                    votePercentage,
                    totalCandidates: candidates.length,
                    totalVotes: votes.length,
                    averageVoteTime,
                    firstVote,
                    lastVote,
                    votesByClass,
                    candidates: candidates.map(c => ({
                        id: c.id,
                        name: c.chairman_name,
                        number: c.number,
                        votes: c.votes || 0,
                        percentage: votedVoters > 0 ? ((c.votes || 0) / votedVoters * 100).toFixed(1) : 0,
                        vice_chairman: c.vice_chairman_name,
                        motto: c.motto,
                        class: c.chairman_class
                    })).sort((a, b) => b.votes - a.votes)
                });
                
            } catch (error) {
                console.error('❌ Error getting stats:', error);
                reject(error);
            }
        });
    }

    async getVotingStatus(voterId) {
        try {
            const voter = await this.getVoterById(voterId);
            if (!voter) {
                return { error: 'Voter not found' };
            }
            
            let voteDetails = null;
            if (voter.has_voted) {
                const vote = await this.getVoteByVoterId(voterId);
                const candidate = vote ? await this.getCandidate(vote.candidate_id) : null;
                
                voteDetails = {
                    voted_at: voter.vote_time,
                    candidate: candidate ? {
                        id: candidate.id,
                        name: candidate.chairman_name,
                        number: candidate.number
                    } : null
                };
            }
            
            return {
                voter: {
                    id: voter.id,
                    name: voter.name,
                    username: voter.username,
                    class: voter.class,
                    has_voted: voter.has_voted
                },
                vote: voteDetails
            };
            
        } catch (error) {
            console.error('❌ Error getting voting status:', error);
            throw error;
        }
    }

    async exportVotingData() {
        try {
            const [voters, candidates, votes, auditLogs] = await Promise.all([
                this.getAllVoters(),
                this.getAllCandidates(),
                this.getAllVotes(),
                this.getAllAuditLogs()
            ]);
            
            const stats = await this.getElectionStats();
            
            const exportData = {
                metadata: {
                    export_date: new Date().toISOString(),
                    system: "Election System Database",
                    version: "1.0"
                },
                statistics: stats,
                voters: voters,
                candidates: candidates,
                votes: votes,
                audit_logs: auditLogs
            };
            
            return exportData;
            
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            throw error;
        }
    }

    // ============================================
    // AUDIT LOG FUNCTIONS - DIPERBAIKI
    // ============================================

    async addAuditLog(log) {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found, skipping audit log');
                resolve({ success: false, message: 'Audit log store not available' });
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');
            
            const logData = {
                ...log,
                timestamp: new Date().toISOString()
            };
            
            const request = store.add(logData);
            
            request.onsuccess = () => {
                console.log('✅ Audit log added:', log.action);
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding audit log:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAllAuditLogs() {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readonly');
            const store = transaction.objectStore('audit_logs');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting audit logs:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async getAuditLogsByAction(action) {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readonly');
            const store = transaction.objectStore('audit_logs');
            const index = store.index('action');
            const request = index.getAll(action);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting audit logs by action:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async clearAuditLogs() {
        return new Promise((resolve, reject) => {
            // Cek apakah audit_logs store ada
            if (!this.db.objectStoreNames.contains('audit_logs')) {
                console.warn('⚠️ audit_logs store not found');
                resolve({ success: true });
                return;
            }
            
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('✅ Audit logs cleared');
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error clearing audit logs:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // ADMIN MANAGEMENT - DIPERBAIKI
    // ============================================

    async getAllAdmins() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readonly');
            const store = transaction.objectStore('admins');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('❌ Error getting admins:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async addAdmin(admin) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const adminData = {
                ...admin,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const request = store.add(adminData);
            
            request.onsuccess = () => {
                console.log('✅ Admin added:', admin.username);
                
                // Tambahkan audit log jika store tersedia
                if (this.db.objectStoreNames.contains('audit_logs')) {
                    const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                    const auditStore = auditTransaction.objectStore('audit_logs');
                    const auditLog = {
                        action: 'ADMIN_ADDED',
                        user_id: 'system',
                        user_name: 'System',
                        details: `Admin baru ditambahkan: ${admin.username}`,
                        timestamp: new Date().toISOString(),
                        ip_address: 'localhost'
                    };
                    auditStore.add(auditLog);
                }
                
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error adding admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async validateAdminLogin(username, password) {
        try {
            const admins = await this.getAllAdmins();
            const admin = admins.find(a => a.username === username);
            
            if (!admin) {
                return { success: false, message: 'Username admin tidak ditemukan' };
            }
            
            if (admin.password !== password) {
                return { success: false, message: 'Password salah' };
            }
            
            // Add audit log for successful login jika store tersedia
            try {
                await this.addAuditLog({
                    action: 'ADMIN_LOGIN',
                    user_id: admin.id,
                    user_name: admin.name,
                    details: 'Admin login berhasil',
                    ip_address: 'localhost'
                });
            } catch (auditError) {
                console.warn('⚠️ Audit log skipped:', auditError.message);
            }
            
            return { 
                success: true, 
                admin: {
                    id: admin.id,
                    username: admin.username,
                    name: admin.name,
                    role: admin.role,
                    permissions: admin.permissions || ['view', 'edit', 'delete', 'reset']
                }
            };
            
        } catch (error) {
            console.error('❌ Error validating admin login:', error);
            return { success: false, message: 'Terjadi kesalahan saat validasi login' };
        }
    }

    async updateAdmin(adminId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const getRequest = store.get(adminId);
            
            getRequest.onsuccess = () => {
                const admin = getRequest.result;
                if (!admin) {
                    reject(new Error('Admin not found'));
                    return;
                }
                
                const updatedAdmin = { 
                    ...admin, 
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                const putRequest = store.put(updatedAdmin);
                
                putRequest.onsuccess = () => {
                    console.log('✅ Admin updated:', adminId);
                    
                    // Tambahkan audit log jika store tersedia
                    if (this.db.objectStoreNames.contains('audit_logs')) {
                        const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                        const auditStore = auditTransaction.objectStore('audit_logs');
                        const auditLog = {
                            action: 'ADMIN_UPDATED',
                            user_id: 'system',
                            user_name: 'System',
                            details: `Admin diperbarui: ${admin.username}`,
                            timestamp: new Date().toISOString(),
                            ip_address: 'localhost'
                        };
                        auditStore.add(auditLog);
                    }
                    
                    resolve({ success: true, admin: updatedAdmin });
                };
                
                putRequest.onerror = (event) => {
                    console.error('❌ Error updating admin:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async deleteAdmin(adminId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['admins'], 'readwrite');
            const store = transaction.objectStore('admins');
            
            const getRequest = store.get(adminId);
            
            getRequest.onsuccess = () => {
                const admin = getRequest.result;
                if (!admin) {
                    reject(new Error('Admin not found'));
                    return;
                }
                
                const deleteRequest = store.delete(adminId);
                
                deleteRequest.onsuccess = () => {
                    console.log('✅ Admin deleted:', adminId);
                    
                    // Tambahkan audit log jika store tersedia
                    if (this.db.objectStoreNames.contains('audit_logs')) {
                        const auditTransaction = this.db.transaction(['audit_logs'], 'readwrite');
                        const auditStore = auditTransaction.objectStore('audit_logs');
                        const auditLog = {
                            action: 'ADMIN_DELETED',
                            user_id: 'system',
                            user_name: 'System',
                            details: `Admin dihapus: ${admin.username}`,
                            timestamp: new Date().toISOString(),
                            ip_address: 'localhost'
                        };
                        auditStore.add(auditLog);
                    }
                    
                    resolve({ success: true });
                };
                
                deleteRequest.onerror = (event) => {
                    console.error('❌ Error deleting admin:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error('❌ Error getting admin:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ============================================
    // INITIALIZATION FUNCTIONS
    // ============================================

    async initializeSampleData() {
        console.log('🔄 Initializing sample data...');
        
        try {
            // Check if candidates already exist
            const existingCandidates = await this.getAllCandidates();
            
            if (existingCandidates.length === 0) {
                // Add sample candidates
                const sampleCandidates = [
                    {
                        id: 1,
                        number: 1,
                        chairman_name: "AMRELINA",
                        chairman_class: "XI A",
                        motto: "Bersama Membangun Prestasi",
                        tags: ["Ganteng", "Prestasi", "Loyalitas"],
                        vision: "Mewujudkan OSSIP yang inovatif, aspiratif, dan berprestasi di tingkat regional dengan mengedepankan transparansi dan partisipasi aktif seluruh siswa.",
                        mission: [
                            "Meningkatkan kualitas kegiatan ekstrakurikuler",
                            "Memperkuat komunikasi antara siswa dan pihak sekolah",
                            "Mengembangkan program kreatif dan inovatif"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/32.jpg",
                        image_vice_chairman: "https://randomuser.me/api/portraits/men/33.jpg",
                        votes: 0
                    },
                    {
                        id: 2,
                        number: 2,
                        chairman_name: "KHOLIDAH IZZATI",
                        chairman_class: "XI A",
                        motto: "Kreatif, Inovatif, dan Kolaboratif",
                        tags: ["Kreatif", "Kolaborasi", "Aspiratif"],
                        vision: "Menjadikan OSSIP sebagai wadah pengembangan potensi siswa secara maksimal melalui program kreatif, inovatif, dan kolaboratif dengan seluruh elemen sekolah.",
                        mission: [
                            "Menciptakan lingkungan belajar yang nyaman",
                            "Mengadakan event kreatif tahunan",
                            "Membangun sistem aspirasi siswa yang efektif"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/women/44.jpg",
                        image_vice_chairman: "https://randomuser.me/api/portraits/women/45.jpg",
                        votes: 0
                    },
                    {
                        id: 3,
                        number: 3,
                        chairman_name: "NAVA AISLA HASNA",
                        chairman_class: "XI B",
                        motto: "Satu untuk Semua, Semua untuk Satu",
                        tags: ["Solidaritas", "Transparan", "Fleksibel"],
                        vision: "Membentuk OSIS yang solid, transparan, dan berorientasi pada kebutuhan siswa dengan mengutamakan prinsip gotong royong dan kebersamaan.",
                        mission: [
                            "Meningkatkan solidaritas antar siswa",
                            "Menerapkan sistem kerja yang transparan",
                            "Responsif terhadap kebutuhan siswa"
                        ],
                        image_chairman: "https://randomuser.me/api/portraits/men/65.jpg",
                        image_vice_chairman: "https://randomuser.me/api/portraits/men/66.jpg",
                        votes: 0
                    }
                ];
                
                for (const candidate of sampleCandidates) {
                    await this.addCandidate(candidate);
                }
                
                console.log('✅ Sample candidates added');
            }
            
            // Check if voters already exist
            const existingVoters = await this.getAllVoters();
            
            if (existingVoters.length === 0) {
                // Generate 107 students
                await this.generateAllStudents();
                console.log('✅ 107 students generated');
            }
            
            // Check if admin exists
            const existingAdmins = await this.getAllAdmins();
            
            if (existingAdmins.length === 0) {
                await this.addAdmin({
                    id: 1,
                    username: "admin",
                    password: "admin123",
                    name: "Admin Panitia",
                    role: "super_admin",
                    permissions: ["view", "edit", "delete", "reset", "export", "audit"],
                    email: "admin@school.edu",
                    phone: "081234567890"
                });
                
                await this.addAdmin({
                    id: 2,
                    username: "panitia",
                    password: "panitia123",
                    name: "Panitia Pemilihan",
                    role: "admin",
                    permissions: ["view", "reset"],
                    email: "panitia@school.edu",
                    phone: "081234567891"
                });
                
                console.log('✅ Admin users added');
            }
            
            console.log('✅ Sample data initialization complete');
            
        } catch (error) {
            console.error('❌ Error initializing sample data:', error);
        }
    }

    async generateAllStudents() {
        const students = [
// Kelas 12A (23 siswa) - ID 74-96
  { id: 74, username: "siswi074", name: "ADHWA NAILAL HUSNA", class: "12A" },
  { id: 75, username: "siswi075", name: "AISHA RAIHANI", class: "12A" },
  { id: 76, username: "siswi076", name: "AISYAH NUR RAMADHANI", class: "12A" },
  { id: 77, username: "siswi077", name: "AQILA MAGHFIRA ANANDA IRAWAN", class: "12A" },
  { id: 78, username: "siswi078", name: "EVA RIYANI", class: "12A" },
  { id: 79, username: "siswi079", name: "FATMA SAHDA PRIYANGGA", class: "12A" },
  { id: 80, username: "siswi080", name: "FIRDA HANAFI SUPRIYA", class: "12A" },
  { id: 81, username: "siswi081", name: "HANA AULIA DEWI", class: "12A" },
  { id: 82, username: "siswi082", name: "INDRI FEBRIANTARI", class: "12A" },
  { id: 83, username: "siswi083", name: "MIFTAHUR DJAHWA", class: "12A" },
  { id: 84, username: "siswi084", name: "NAJWA QURROTUL 'AIN", class: "12A" },
  { id: 85, username: "siswi085", name: "PUTRI LUTFIYATUR ROHMAH", class: "12A" },
  { id: 86, username: "siswi086", name: "RARA MAULIDA ALZAHRA", class: "12A" },
  { id: 87, username: "siswi087", name: "RARA ROSYVIANA RAHMADANI", class: "12A" },
  { id: 88, username: "siswi088", name: "RINJANI AZKIA RAHMA", class: "12A" },
  { id: 89, username: "siswi089", name: "SALWA ASSYIFA PUTRI NUGROHO", class: "12A" },
  { id: 90, username: "siswi090", name: "SHANTIKA AULIATUNNISA", class: "12A" },
  { id: 91, username: "siswi091", name: "SILVIA INDRIANI", class: "12A" },
  { id: 92, username: "siswi092", name: "SITI AISYAH FEBRIANA", class: "12A" },
  { id: 93, username: "siswi093", name: "TALITA RAFIFAH ARTANTI", class: "12A" },
  { id: 94, username: "siswi094", name: "TALITHA LATHIFAH ARTANTI", class: "12A" },
  { id: 95, username: "siswi095", name: "YULIANA NISA", class: "12A" },
  { id: 96, username: "siswi096", name: "ZAHWA DENILLA ELKHILWA", class: "12A" },

// Kelas 12B (22 siswa) - ID 96-118
  { id: 97, username: "siswi097", name: "AISYAH NUR AZIZAH", class: "12B" },
  { id: 98, username: "siswi098", name: "AISYAH NUR FADILLAH", class: "12B" },
  { id: 99, username: "siswi099", name: "ALIIFAH NAURA RAYYANI", class: "12B" },
  { id: 100, username: "siswi100", name: "ALYA ALILATUL BARIZA", class: "12B" },
  { id: 101, username: "siswi101", name: "CUT INTAN DAMARA KALIFA", class: "12B" },
  { id: 102, username: "siswi102", name: "DENISA KHOIRUNISA", class: "12B" },
  { id: 103, username: "siswi103", name: "DHIYA SHABIHAH RISKY", class: "12B" },
  { id: 104, username: "siswi104", name: "DINDA DANISYARAZ", class: "12B" },
  { id: 105, username: "siswi105", name: "FATHIYA AZKIA SABEERA", class: "12B" },
  { id: 106, username: "siswi106", name: "INTAN ANGGRAINI", class: "12B" },
  { id: 107, username: "siswi107", name: "INTAN AULIA SETIAWAN", class: "12B" },
  { id: 108, username: "siswi108", name: "KARUNIA ZALFAA", class: "12B" },
  { id: 109, username: "siswi109", name: "KEISHA FARRAS ANANDITA", class: "12B" },
  { id: 110, username: "siswi110", name: "LIVIA ADHARA", class: "12B" },
  { id: 111, username: "siswi111", name: "MUTHII'AH MUTMAINNAH", class: "12B" },
  { id: 112, username: "siswi112", name: "NAURA NADA ALFARIZKI", class: "12B" },
  { id: 113, username: "siswi113", name: "NAYLA CANTIKA ZAHRATUSYIFA", class: "12B" },
  { id: 114, username: "siswi114", name: "RIFKA NAYLA FAKHRIYAH", class: "12B" },
  { id: 115, username: "siswi115", name: "SHAYNA HAVILAH AZKA SAFITRI", class: "12B" },
  { id: 116, username: "siswi116", name: "SITI FITROTUL ALYA BUSTAMI", class: "12B" },
  { id: 117, username: "siswi117", name: "TIA HARRASTI", class: "12B" },
  { id: 118, username: "siswi118", name: "ZAHRA EKA FADILLAH", class: "12B" },

// Kelas 11A (22 siswa) - ID 30-52
  { id: 31, username: "siswi031", name: "ADELIA UFAIROH HALIMI", class: "11A" },
  { id: 32, username: "siswi032", name: "AIRA WAHYUNI", class: "11A" },
  { id: 33, username: "siswi033", name: "ALVIANA BILQIIS KHAIRUNNISA", class: "11A" },
  { id: 34, username: "siswi034", name: "AMRELINA", class: "11A" },
  { id: 35, username: "siswi035", name: "ANIS FAUZIYAH AUFA HAFIDZAH", class: "11A" },
  { id: 36, username: "siswi036", name: "ATHAYA NAURA", class: "11A" },
  { id: 37, username: "siswi037", name: "BUNGA RINDU", class: "11A" },
  { id: 38, username: "siswi038", name: "ELVIA MAULIDA PUTRI KHALISAH", class: "11A" },
  { id: 39, username: "siswi039", name: "FAHRUNISA HAURA", class: "11A" },
  { id: 40, username: "siswi040", name: "FIRYAAL NAFIISA KAHLAA", class: "11A" },
  { id: 41, username: "siswi041", name: "KEYSA ADELIA RAMADANI", class: "11A" },
  { id: 42, username: "siswi042", name: "KHOLIDAH IZZATI", class: "11A" },
  { id: 43, username: "siswi043", name: "NASHIRA NAILATUSY ZAHRA", class: "11A" },
  { id: 44, username: "siswi044", name: "NASYWA JOETA AZZAHRA ZADA", class: "11A" },
  { id: 45, username: "siswi045", name: "NAZWA NURFAUZIAH", class: "11A" },
  { id: 46, username: "siswi046", name: "NISA TRIFA NAYLA", class: "11A" },
  { id: 47, username: "siswi047", name: "POPPY DWI FARIANDI", class: "11A" },
  { id: 48, username: "siswi048", name: "RARA ZAHRA AMELIA", class: "11A" },
  { id: 49, username: "siswi049", name: "RIHANA JINAN ULYA", class: "11A" },
  { id: 50, username: "siswi050", name: "SALVIA NAJIBAH", class: "11A" },
  { id: 51, username: "siswi051", name: "SITI LAILATUL KHOIRIYAH", class: "11A" },
  { id: 52, username: "siswi052", name: "SYAFA KAYLA JINGGA", class: "11A" },

// Kelas 11B (21 siswa) - ID 52-73
  { id: 53, username: "siswi053", name: "AFLAH HABIBAH", class: "11B" },
  { id: 54, username: "siswi054", name: "ADONIA FIZRYAWTA", class: "11B" },
  { id: 55, username: "siswi055", name: "ALFIERA NURI SAFITRI", class: "11B" },
  { id: 56, username: "siswi056", name: "ALYA NUR SHYFA", class: "11B" },
  { id: 57, username: "siswi057", name: "AMELIA APRILIA", class: "11B" },
  { id: 58, username: "siswi058", name: "CICI SUNARSIH", class: "11B" },
  { id: 59, username: "siswi059", name: "FARISYA EDSHA", class: "11B" },
  { id: 60, username: "siswi060", name: "FATMAWATI", class: "11B" },
  { id: 61, username: "siswi061", name: "HAFSHAH NUR HAFIZAH", class: "11B" },
  { id: 62, username: "siswi062", name: "HASYA ADLINA UZMA", class: "11B" },
  { id: 63, username: "siswi063", name: "INGGIT CHAIRUN NISA", class: "11B" },
  { id: 64, username: "siswi064", name: "KEYLA ZURAYDA SALIM", class: "11B" },
  { id: 65, username: "siswi065", name: "KINANTI FEBI SUCIANTO", class: "11B" },
  { id: 66, username: "siswi066", name: "MAKAYLA TUHFATUL ADZKIYA", class: "11B" },
  { id: 67, username: "siswi067", name: "MARSYA QORILIYA SHINTA", class: "11B" },
  { id: 68, username: "siswi068", name: "NAVA AISLA HASNA", class: "11B" },
  { id: 69, username: "siswi069", name: "NAZHIFA AZZIRA JUNEETA", class: "11B" },
  { id: 70, username: "siswi070", name: "NIDA ALMIRA AZMI", class: "11B" },
  { id: 71, username: "siswi071", name: "RIHANA ISMI KAMILLA", class: "11B" },
  { id: 72, username: "siswi072", name: "SHAFA AINUL JANNAH", class: "11B" },
  { id: 73, username: "siswi073", name: "SITI NADIRA ALWANI", class: "11B" },

  // Kelas 10A (30 siswa) - ID 1-30
  { id: 1, username: "siswi001", name: "ADARA AYUNINGTYAS", class: "10A" },
  { id: 2, username: "siswi002", name: "AIESHA ALMA FIDDA", class: "10A" },
  { id: 3, username: "siswi003", name: "ALMAASA RIZQIKA RAMDHANI", class: "10A" },
  { id: 4, username: "siswi004", name: "ANISA FAIRUZ ZIA", class: "10A" },
  { id: 5, username: "siswi005", name: "AUREN QIRANY PUSPITA", class: "10A" },
  { id: 6, username: "siswi006", name: "AZHARINA NURHIDAYAH", class: "10A" },
  { id: 7, username: "siswi007", name: "CAHYA RACHEL ARIELLA", class: "10A" },
  { id: 8, username: "siswi008", name: "CHIKA DESHANE", class: "10A" },
  { id: 9, username: "siswi009", name: "DANISHA SALSABILA", class: "10A" },
  { id: 10, username: "siswi010", name: "FEBRIYANA PUSPA KHOSIAH", class: "10A" },
  { id: 11, username: "siswi011", name: "GHINA ADVYANZA", class: "10A" },
  { id: 12, username: "siswi012", name: "JULYANA PUTRI ANGGUN MUSTAR", class: "10A" },
  { id: 13, username: "siswi013", name: "KHANSA ADILA", class: "10A" },
  { id: 14, username: "siswi014", name: "LUTHFIA ZAURA", class: "10A" },
  { id: 15, username: "siswi015", name: "MAHARANI INTAN NURHADI", class: "10A" },
  { id: 16, username: "siswi016", name: "MYIESHA NAFEEZA AYU", class: "10A" },
  { id: 17, username: "siswi017", name: "NAILAH NOER ASMA KHALIFA", class: "10A" },
  { id: 18, username: "siswi018", name: "NAIRA ALIYYA FAYYAZA", class: "10A" },
  { id: 19, username: "siswi019", name: "NUR SYIFA AULIA", class: "10A" },
  { id: 20, username: "siswi020", name: "NYSELA FATHIN PUTRI WIJAYA", class: "10A" },
  { id: 21, username: "siswi021", name: "PUTRI MEISI SAGITA", class: "10A" },
  { id: 22, username: "siswi022", name: "QUEEN AURA RAMADHANI", class: "10A" },
  { id: 23, username: "siswi023", name: "RAHMA MAULIZA AZANI", class: "10A" },
  { id: 24, username: "siswi024", name: "RAYYA KHANSA HAKIM", class: "10A" },
  { id: 25, username: "siswi025", name: "SALSABILA KIRANI NASUTION", class: "10A" },
  { id: 26, username: "siswi026", name: "SITI AFIFAH NUR FAUZIYAH", class: "10A" },
  { id: 27, username: "siswi027", name: "SYERAFINA HAFIDAH ABIDIN", class: "10A" },
  { id: 28, username: "siswi028", name: "YASMINE MALIHAH HAFLA WARDANA", class: "10A" },
  { id: 29, username: "siswi029", name: "ZAHIRA RAHMALIA", class: "10A" },
  { id: 30, username: "siswi030", name: "ZHIVANA SYAFA'ATUL MA'WA", class: "10A" },
  ];
        
        for (const student of students) {
            await this.addVoter({
                id: student.id,
                username: student.username,
                name: student.name,
                class: student.class,
                has_voted: false,
                vote_candidate_id: null,
                vote_time: null
            });
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('✅ Database deleted successfully');
                resolve({ success: true });
            };
            
            request.onerror = (event) => {
                console.error('❌ Error deleting database:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async backupDatabase() {
        try {
            const allData = await this.exportVotingData();
            const backup = {
                timestamp: new Date().toISOString(),
                data: allData
            };
            
            // Convert to JSON string
            const backupString = JSON.stringify(backup, null, 2);
            
            // Create download link
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_BACKUP',
                user_id: 'system',
                user_name: 'System',
                details: 'Database backup created',
                ip_address: 'localhost'
            });
            
            return { success: true, filename: a.download };
            
        } catch (error) {
            console.error('❌ Error backing up database:', error);
            throw error;
        }
    }

    async restoreDatabase(backupData) {
        try {
            // Clear existing data
            await this.clearDatabase();
            
            // Reinitialize database
            await this.initDB();
            
            // Restore data
            const data = backupData.data;
            
            // Restore voters
            for (const voter of data.voters) {
                await this.addVoter(voter);
            }
            
            // Restore candidates
            for (const candidate of data.candidates) {
                await this.addCandidate(candidate);
            }
            
            // Restore votes
            for (const vote of data.votes) {
                const transaction = this.db.transaction(['votes'], 'readwrite');
                const store = transaction.objectStore('votes');
                await new Promise((resolve, reject) => {
                    const request = store.add(vote);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
            
            // Restore admins
            for (const admin of (data.admins || [])) {
                await this.addAdmin(admin);
            }
            
            // Add audit log
            await this.addAuditLog({
                action: 'DATABASE_RESTORE',
                user_id: 'system',
                user_name: 'System',
                details: 'Database restored from backup',
                ip_address: 'localhost'
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error restoring database:', error);
            throw error;
        }
    }

    // ============================================
    // HELPER FUNCTIONS FOR UI
    // ============================================

    async getVotingStatistics() {
        return await this.getElectionStats();
    }

    async getAllVotedVoters() {
        return await this.getVotedVoters();
    }

    async getAllNotVotedVoters() {
        return await this.getNotVotedVoters();
    }

    async getVotingStatus(voterId) {
        return await this.getVotingStatus(voterId);
    }

    async resetAllVotesWithConfirmation() {
        // This function would typically show a confirmation dialog
        // For now, just call resetAllVotes
        return await this.resetAllVotes();
    }

    async exportVotingDataToCSV() {
        try {
            const data = await this.exportVotingData();
            
            // Convert to CSV format
            let csv = 'Data,Count\n';
            csv += `Total Voters,${data.statistics.totalVoters}\n`;
            csv += `Voted Voters,${data.statistics.votedVoters}\n`;
            csv += `Not Voted,${data.statistics.notVotedVoters}\n`;
            csv += `Vote Percentage,${data.statistics.votePercentage}%\n`;
            csv += `Total Candidates,${data.statistics.totalCandidates}\n\n`;
            
            csv += 'Candidate Results\n';
            csv += 'Number,Name,Votes,Percentage\n';
            data.statistics.candidates.forEach(candidate => {
                csv += `${candidate.number},${candidate.name},${candidate.votes},${candidate.percentage}%\n`;
            });
            
            csv += '\nVotes by Class\n';
            csv += 'Class,Total,Voted,Percentage\n';
            Object.keys(data.statistics.votesByClass).forEach(className => {
                const classData = data.statistics.votesByClass[className];
                const percentage = classData.total > 0 ? ((classData.voted / classData.total) * 100).toFixed(1) : 0;
                csv += `${className},${classData.total},${classData.voted},${percentage}%\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `election_results_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return { success: true, filename: a.download };
            
        } catch (error) {
            console.error('❌ Error exporting CSV:', error);
            throw error;
        }
    }

    // ============================================
    // DATABASE HEALTH CHECK
    // ============================================

    async checkDatabaseHealth() {
        try {
            const storeNames = Array.from(this.db.objectStoreNames);
            console.log('📊 Database stores:', storeNames);
            
            const health = {
                stores: storeNames,
                voters: await this.getAllVoters().then(v => v.length).catch(() => 0),
                candidates: await this.getAllCandidates().then(c => c.length).catch(() => 0),
                admins: await this.getAllAdmins().then(a => a.length).catch(() => 0),
                votes: await this.getAllVotes().then(v => v.length).catch(() => 0),
                audit_logs: await this.getAllAuditLogs().then(a => a.length).catch(() => 0)
            };
            
            return {
                healthy: true,
                details: health
            };
            
        } catch (error) {
            console.error('❌ Database health check failed:', error);
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    async repairDatabase() {
        try {
            console.log('🔧 Attempting to repair database...');
            
            // Backup data first
            const backup = await this.exportVotingData();
            
            // Clear and recreate database
            await this.clearDatabase();
            
            // Reinitialize
            await this.initDB();
            
            // Restore data
            await this.initializeSampleData();
            
            // Add repair audit log
            await this.addAuditLog({
                action: 'DATABASE_REPAIR',
                user_id: 'system',
                user_name: 'System',
                details: 'Database repaired successfully',
                ip_address: 'localhost'
            });
            
            console.log('✅ Database repair completed');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Database repair failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// GLOBAL INITIALIZATION
// ============================================

// Initialize database globally
window.db = new VotingDB();

// Auto-initialize sample data when database is ready
window.db.initDB().then(async () => {
    console.log('✅ Database ready, initializing sample data...');
    await window.db.initializeSampleData();
    
    // Check database health
    const health = await window.db.checkDatabaseHealth();
    console.log('🏥 Database health:', health);
    
    // Export additional helper functions
    window.db.getAllVoters = window.db.getAllVoters.bind(window.db);
    window.db.resetAllVotes = window.db.resetAllVotes.bind(window.db);
    window.db.validateLogin = window.db.validateLogin.bind(window.db);
    window.db.castVote = window.db.castVote.bind(window.db);
    window.db.getElectionStats = window.db.getElectionStats.bind(window.db);
    window.db.validateAdminLogin = window.db.validateAdminLogin.bind(window.db);
    window.db.exportVotingData = window.db.exportVotingData.bind(window.db);
    window.db.exportVotingDataToCSV = window.db.exportVotingDataToCSV.bind(window.db);
    window.db.backupDatabase = window.db.backupDatabase.bind(window.db);
    window.db.clearDatabase = window.db.clearDatabase.bind(window.db);
    window.db.checkDatabaseHealth = window.db.checkDatabaseHealth.bind(window.db);
    window.db.repairDatabase = window.db.repairDatabase.bind(window.db);
    
    console.log('🚀 Database system ready!');
    console.log('📊 Available functions:', Object.keys(window.db).filter(key => typeof window.db[key] === 'function'));

            // Di database.js, setelah window.db = new VotingDB();
        console.log('VotingDB instance created:', window.db);

        // Di dalam getElectionStats(), tambahkan:
        console.log('getElectionStats called');
    
    // Dispatch event that database is ready
    document.dispatchEvent(new CustomEvent('databaseReady'));
    
}).catch(error => {
    console.error('❌ Database initialization failed:', error);
    
    // Try to repair database
    if (window.db && window.db.repairDatabase) {
        console.log('🔄 Attempting auto-repair...');
        window.db.repairDatabase().then(result => {
            if (result.success) {
                console.log('✅ Database auto-repair successful');
                location.reload();
            } else {
                console.error('❌ Auto-repair failed');
                alert('Database initialization failed. Please clear browser data and refresh the page.');
            }
        });
    } else {
        alert('Database initialization failed. Please clear browser data and refresh the page.');
    }
});

// Export to global scope for debugging
if (typeof window !== 'undefined') {
    window.VotingDB = VotingDB;
}

// DI DATABASE.JS - tambahkan variabel global untuk status
window.dbReady = false;
window.dbPromise = null;

// Di dalam fungsi inisialisasi database (setelah openRequest.onsuccess):
openRequest.onerror = function(event) {
    console.error('❌ Database error:', event.target.error);
    console.error('Error name:', event.target.error.name);
    console.error('Error message:', event.target.error.message);
    showToast('Gagal membuka database', 'error');
};

openRequest.onupgradeneeded = function(event) {
    console.log('🔄 Database upgrade needed');
    const db = event.target.result;
    
    // Create voters store
    if (!db.objectStoreNames.contains('voters')) {
        console.log('📁 Creating voters store');
        const votersStore = db.createObjectStore('voters', { keyPath: 'id' });
        votersStore.createIndex('username', 'username', { unique: true });
        votersStore.createIndex('class', 'class', { unique: false });
        votersStore.createIndex('has_voted', 'has_voted', { unique: false });
    }
    
    // Create candidates store
    if (!db.objectStoreNames.contains('candidates')) {
        console.log('📁 Creating candidates store');
        const candidatesStore = db.createObjectStore('candidates', { keyPath: 'id' });
        candidatesStore.createIndex('number', 'number', { unique: true });
    }
};

openRequest.onsuccess = function(event) {
    console.log('✅ Database connection established');
    console.log('Database name:', event.target.result.name);
    console.log('Database version:', event.target.result.version);
    console.log('Object stores:', Array.from(event.target.result.objectStoreNames));
    
    window.db = event.target.result;
    window.dbReady = true;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('databaseReady'));
    
    // Coba panggil fungsi lain untuk verifikasi
    setTimeout(() => {
        console.log('Database ready, checking...');
        if (window.db && window.dbReady) {
            console.log('✅ Database status: READY');
            // Panggil fungsi untuk memuat data
            loadInitialData();
        } else {
            console.error('❌ Database status: NOT READY');
        }
    }, 500);
};

// Fungsi untuk memuat data awal
async function loadInitialData() {
    try {
        console.log('🔄 Loading initial data...');
        
        // Load voters
        const voters = await window.getAllVoters();
        console.log('Voters loaded:', voters.length);
        
        // Load candidates
        const candidates = await window.getAllCandidates();
        console.log('Candidates loaded:', candidates.length);
        
        // Simpan ke variabel global
        window.allVoters = voters;
        window.candidates = candidates;
        
        // Render data
        renderVotersTable();
        renderSummary();
        
        console.log('✅ Initial data loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        showToast('Gagal memuat data', 'error');
    }
}

// DI ADMIN-VOTERS.HTML - modifikasi waitForDatabase():
// Hapus kode yang error dan ganti dengan ini:
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM Content Loaded');
    
    try {
        // Tunggu database siap
        await waitForDatabase();
        
        console.log('🎯 Database confirmed ready');
        
        // Load data
        await loadInitialData();
        
        // Setup event listeners setelah data dimuat
        setupEventListeners();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showToast('Gagal memulai aplikasi: ' + error.message, 'error');
        
        // Fallback: coba refresh page
        setTimeout(() => {
            if (confirm('Aplikasi mengalami masalah. Refresh halaman?')) {
                location.reload();
            }
        }, 2000);
    }
});

// Fungsi untuk setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Filter event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(filterVoters, 300));
    document.getElementById('statusFilter').addEventListener('change', filterVoters);
    document.getElementById('classFilter').addEventListener('change', filterVoters);
    
    // Add voter button
    const addVoterBtn = document.getElementById('addVoterBtn');
    if (addVoterBtn) {
        addVoterBtn.addEventListener('click', function() {
            debugLog('Add voter button clicked');
            isEditing = false;
            editingVoterId = null;
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Tambah Santri Baru';
            document.getElementById('voterModal').classList.add('active');
            document.getElementById('voterForm').reset();
            document.getElementById('passwordField').style.display = 'block';
        });
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('voterModal').classList.remove('active');
        });
    }
    
    console.log('✅ Event listeners set up');
}
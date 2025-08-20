/**
 * ATİS WebSocket Client Example
 * Real-time notifications client implementation
 */

class ATISWebSocketClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'ws://127.0.0.1:8080';
        this.authToken = options.authToken || null;
        this.userId = options.userId || null;
        this.socket = null;
        this.channels = new Map();
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }

    init() {
        if (!this.authToken || !this.userId) {
            console.error('Auth token and user ID are required for WebSocket connection');
            return;
        }

        this.connect();
    }

    connect() {
        try {
            // Laravel Reverb WebSocket URL with auth
            const wsUrl = `${this.baseUrl}/app/atis-key?protocol=7&client=js&version=4.3.1&flash=false`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onerror = this.onError.bind(this);
            
            console.log('Connecting to WebSocket server...');
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }

    onOpen(event) {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        
        // Authenticate with Laravel Sanctum token
        this.authenticate();
        
        // Subscribe to user-specific channels
        this.subscribeToUserChannels();
        
        this.emit('connected', { status: 'connected' });
    }

    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.event && data.data) {
                this.handleBroadcastEvent(data.event, data.data, data.channel);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    onClose(event) {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    onError(error) {
        console.error('WebSocket error:', error);
        this.emit('error', { error });
    }

    authenticate() {
        const authMessage = {
            event: 'pusher:connection_established',
            data: {
                auth: this.authToken,
                user_id: this.userId
            }
        };
        
        this.send(authMessage);
    }

    subscribeToUserChannels() {
        // Subscribe to user-specific private channel
        this.subscribe(`private-App.Models.User.${this.userId}`);
        
        // Subscribe to notifications channel
        this.subscribe('private-notifications');
    }

    subscribe(channelName) {
        if (this.channels.has(channelName)) {
            console.log(`Already subscribed to channel: ${channelName}`);
            return;
        }

        const subscribeMessage = {
            event: 'pusher:subscribe',
            data: {
                channel: channelName,
                auth: this.generateAuth(channelName)
            }
        };

        this.send(subscribeMessage);
        this.channels.set(channelName, { subscribed: true });
        
        console.log(`Subscribed to channel: ${channelName}`);
    }

    unsubscribe(channelName) {
        if (!this.channels.has(channelName)) {
            return;
        }

        const unsubscribeMessage = {
            event: 'pusher:unsubscribe',
            data: {
                channel: channelName
            }
        };

        this.send(unsubscribeMessage);
        this.channels.delete(channelName);
        
        console.log(`Unsubscribed from channel: ${channelName}`);
    }

    generateAuth(channelName) {
        // This should be generated server-side for security
        // For now, using the bearer token
        return `Bearer ${this.authToken}`;
    }

    handleBroadcastEvent(eventName, data, channel) {
        console.log(`Event received: ${eventName} on channel ${channel}`, data);
        
        // Handle specific events
        switch (eventName) {
            case 'task.assigned':
                this.handleTaskAssigned(data);
                break;
            case 'notification.sent':
                this.handleNotificationSent(data);
                break;
            case 'survey.created':
                this.handleSurveyCreated(data);
                break;
            case 'user.logged_in':
                this.handleUserLoggedIn(data);
                break;
            default:
                this.emit('message', { event: eventName, data, channel });
        }
    }

    handleTaskAssigned(data) {
        console.log('New task assigned:', data.task.title);
        
        // Show notification
        this.showNotification('Yeni Tapşırıq', data.message, {
            icon: '📝',
            actions: [
                { action: 'view', title: 'Bax', icon: '👁️' },
                { action: 'dismiss', title: 'Bağla', icon: '✖️' }
            ]
        });
        
        // Update UI
        this.emit('task:assigned', data);
    }

    handleNotificationSent(data) {
        console.log('New notification:', data.notification.title);
        
        // Show notification
        this.showNotification(
            data.notification.title,
            data.notification.message,
            {
                icon: this.getNotificationIcon(data.notification.type),
                priority: data.notification.priority
            }
        );
        
        // Update unread count
        this.updateUnreadCount(data.unread_count);
        
        this.emit('notification:received', data);
    }

    handleSurveyCreated(data) {
        console.log('New survey created:', data.survey.title);
        
        this.showNotification('Yeni Sorğu', data.message, {
            icon: '📊',
            actions: [
                { action: 'view', title: 'Bax', icon: '👁️' },
                { action: 'dismiss', title: 'Bağla', icon: '✖️' }
            ]
        });
        
        this.emit('survey:created', data);
    }

    handleUserLoggedIn(data) {
        console.log('User logged in:', data.user.username);
        this.emit('user:logged_in', data);
    }

    showNotification(title, message, options = {}) {
        // Browser notification
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: options.icon || '🔔',
                tag: `atis-${Date.now()}`,
                requireInteraction: options.priority === 'high'
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
                this.emit('notification:click', { title, message, options });
            };
        }
        
        // Custom in-app notification
        this.emit('notification:show', { title, message, options });
    }

    updateUnreadCount(count) {
        this.emit('unread:update', { count });
        
        // Update document title
        document.title = count > 0 ? `(${count}) ATİS` : 'ATİS';
        
        // Update favicon badge (if supported)
        this.updateFaviconBadge(count);
    }

    updateFaviconBadge(count) {
        // Simple favicon badge implementation
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        
        if (count > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(8, 0, 8, 8);
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(count > 9 ? '9+' : count.toString(), 12, 7);
        }
        
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = canvas.toDataURL('image/png');
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'task': '📝',
            'survey': '📊',
            'approval': '✅',
            'system': '⚙️',
            'warning': '⚠️',
            'error': '❌',
            'info': 'ℹ️',
            'success': '✅'
        };
        
        return icons[type] || '🔔';
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.channels.clear();
        this.listeners.clear();
    }

    // Public API methods
    subscribeToInstitution(institutionId) {
        this.subscribe(`private-institution.${institutionId}`);
    }

    subscribeToRole(roleName) {
        this.subscribe(`private-role.${roleName}`);
    }

    subscribeToTask(taskId) {
        this.subscribe(`private-task.${taskId}`);
    }

    subscribeToSurvey(surveyId) {
        this.subscribe(`private-survey.${surveyId}`);
    }

    getConnectionStatus() {
        if (!this.socket) return 'disconnected';
        
        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
}

// Usage example
function initializeWebSocket(authToken, userId) {
    // Request notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    const wsClient = new ATISWebSocketClient({
        baseUrl: 'ws://127.0.0.1:8080',
        authToken: authToken,
        userId: userId
    });
    
    // Event listeners
    wsClient.on('connected', () => {
        console.log('WebSocket connected successfully');
        // Subscribe to additional channels based on user role/institution
    });
    
    wsClient.on('task:assigned', (data) => {
        // Update tasks UI
        console.log('Task assigned:', data);
        // Refresh tasks list, show modal, etc.
    });
    
    wsClient.on('notification:received', (data) => {
        // Update notifications UI
        console.log('Notification received:', data);
        // Add to notifications list, update badge, etc.
    });
    
    wsClient.on('survey:created', (data) => {
        // Update surveys UI
        console.log('Survey created:', data);
        // Refresh surveys list, show alert, etc.
    });
    
    wsClient.on('unread:update', (data) => {
        // Update unread notifications count
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            badge.textContent = data.count;
            badge.style.display = data.count > 0 ? 'inline' : 'none';
        }
    });
    
    wsClient.on('error', (data) => {
        console.error('WebSocket error:', data.error);
        // Show error message to user
    });
    
    wsClient.on('disconnected', (data) => {
        console.log('WebSocket disconnected:', data.reason);
        // Show offline status
    });
    
    return wsClient;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ATISWebSocketClient, initializeWebSocket };
}

// Example initialization (replace with actual auth data)
/*
document.addEventListener('DOMContentLoaded', () => {
    // Get auth token from your authentication system
    const authToken = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    
    if (authToken && userId) {
        const wsClient = initializeWebSocket(authToken, userId);
        
        // Make websocket client globally available
        window.wsClient = wsClient;
    }
});
*/
Ext.define('FileManagement.components.utils.SocketManager', {
    singleton: true,

    socket: null,

    /**
     * Initialize the WebSocket connection and event listeners.
     */
    initSocket: function() {
        const token = FileManagement.helpers.Functions.getToken();
        const userId = localStorage.getItem('userId'); // Make sure you store userId during login

        if (!this.socket) {
            this.socket = io.connect('http://localhost:5000', {
                auth: {
                    token: token
                }
            });

            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server with ID:', this.socket.id);
                // Join user's room on connection
                if (userId) {
                    this.socket.emit('joinRoom', userId);
                    console.log('Joining room:', userId);
                }
            });

            // Listen for compression progress
            this.socket.on('compressionProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    data.progressId,
                    data.progress,
                    `Compressing ${data.fileName} (${data.progress}%)`
                );
            });

            // Listen for compression completion
            this.socket.on('compressionComplete', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    data.progressId,
                    100,
                    'Compression Complete'
                );
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(data.progressId);
            });

            // Listen for compression errors
            this.socket.on('compressionError', (data) => {
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(data.progressId);
                
                // Show error in a user-friendly dialog
                Ext.Msg.show({
                    title: 'Compression Error',
                    message: data.error || 'An error occurred during compression',
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR
                });

                hideProgressBar();
            });

            // Listen for download progress
            this.socket.on('downloadProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    data.progressId,
                    data.progress,
                    `Downloading ${data.fileName} (${data.progress}%)`
                );
            });

            // Listen for download completion
            this.socket.on('downloadComplete', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    data.progressId,
                    100,
                    'Download Complete'
                );
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(data.progressId);
            });

            // Listen for moving progress
            this.socket.on('movingProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    data.progressId,
                    data.progress,
                    `Moving ${data.itemName} (${data.progress}%)`
                );
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(data.progressId, data.itemName, 'Moved');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                
                // Show connection error to user
                Ext.Msg.show({
                    title: 'Connection Error',
                    message: 'Lost connection to server. Please check your internet connection.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.WARNING
                });
            });

            this.initCancellationListeners();
        }
    },

    cancelOperation: function(jobId) {
        if (this.socket) {
            this.socket.emit('cancelOperation', { jobId });
            // Remove progress bar immediately for better UX
            FileManagement.components.utils.ProgressBarManager.removeProgressBar(jobId);
        }
    },

    // Listen for operation cancellation response
    initCancellationListeners: function() {
        this.socket.on('operationCancelled', (data) => {
            console.log('Operation cancelled:', data.jobId);
            // Progress bar already removed in cancelOperation
        });

        this.socket.on('operationCancelError', (data) => {
            console.error('Failed to cancel operation:', data.jobId, data.error);
            // Could show an error message to user here if needed
        });
    }
});

Ext.define('FileManagement.components.utils.SocketManager', {
    singleton: true,

    socket: null,

    /**
     * Initialize the WebSocket connection and event listeners.
     */
    initSocket: function() {
        const token = localStorage.getItem('token');

        if (!this.socket) {
            this.socket = io.connect('http://localhost:5000', {
                auth: {
                    token: token, // Send the token during the connection handshake
                },
            });

            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server with ID:', this.socket.id);
            });

            // Listen for compression progress
            this.socket.on('compressionProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress('compression', data.progress, `Compression (${data.progress}%)`);
            });

            // Listen for compression completion
            this.socket.on('compressionComplete', () => {
                FileManagement.components.utils.ProgressBarManager.updateProgress('compression', 100, 'Compression Complete');
                FileManagement.components.utils.ProgressBarManager.removeProgressBar('compression');
            });

            // Listen for download progress
            this.socket.on('downloadProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress('download', data.progress, `Downloading (${data.progress}%)`);
            });

            // Listen for download completion
            this.socket.on('downloadComplete', () => {
                FileManagement.components.utils.ProgressBarManager.updateProgress('download', 100, 'Download Complete');
                FileManagement.components.utils.ProgressBarManager.removeProgressBar('download');
            });

            // Listen for moving progress
            this.socket.on('movingProgress', (data) => {
                FileManagement.components.utils.ProgressBarManager.updateProgress(data.progressId, data.progress, `Moving ${data.itemName} (${data.progress}%)`);
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(data.progressId, data.itemName, 'Moved');
            });
        }
    }
});

Ext.define('FileManagement.components.viewers.VideoViewer', {
    extend: 'Ext.panel.Panel',
    xtype: 'videoviewer',

    title: 'Video Viewer',
    layout: 'fit',
    closable: true,
    frame: true,
    modal: true,

    width: 800,  // Set a fixed width
    height: 600,  // Set a fixed height
    x: 0,
    y: 0,

    draggable: {
        onMouseUp: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onMouseUp(panel ?? this.panel);
        },
        onDrag: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onDrag(panel ?? this.panel);
        }
    },

    resizable: {
        constrain: true,  // Enable constraint within a specified element
        dynamic: true,  // Updates size dynamically as resizing
        minHeight: 300,
        minWidth: 450,
    },

    config: {
        fileId: null,
        autoPlay: false,
        loop: false,
        muted: false
    },

    initComponent: async function() {
        const me = this;
        
        me.callParent(arguments);

        const videoUrl = `http://localhost:5000/api/video/stream/${me.fileId}`;
        const token = FileManagement.helpers.Functions.getToken();

        try {
            const response = await fetch(videoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                Ext.Msg.alert('Error', 'Failed to load video.');
                return;
            }

            // Create a blob URL for secure streaming
            const videoBlob = await response.blob();
            const videoSrc = URL.createObjectURL(videoBlob);

            // Clear existing items before adding the video component
            me.removeAll(true);

            const videoComponent = me.add({
                xtype: 'component',
                autoEl: {
                    tag: 'video',
                    controls: false,
                    autoplay: me.autoPlay,
                    loop: me.loop,
                    muted: me.muted,
                    style: 'width: 100%; height: 100%;',
                    children: [
                        {
                            tag: 'source',
                            src: videoSrc,
                            type: 'video/mp4'
                        }
                    ]
                }
            });

            // Apply additional protections after layout rendering
            this.on('afterlayout', function() {
                const videoEl = videoComponent.getEl().dom;

                // Disable context menu (right-click)
                videoEl.addEventListener('contextmenu', (e) => e.preventDefault());

                // Disable download and external playback
                videoEl.setAttribute('controlslist', 'nodownload noremoteplayback');
                videoEl.setAttribute('disablePictureInPicture', true);
            });

        } catch (error) {
            Ext.Msg.alert('Error', 'Unable to load video.');
            console.error('Video loading failed:', error);
        }
    }
});

Ext.Loader.setPath({
    'FileManagement.components.stores': './components/stores',
    'FileManagement.components.grids': './components/grids',
    'FileManagement.components.forms': './components/forms',
    'FileManagement.components.viewers': './components/viewers',
    'FileManagement.components.utils': './components/utils',
    'FileManagement.components.navigation': './components/navigation',
    'FileManagement.helpers': './helpers',
});

Ext.application({
    name: 'FileManagement',

    requires: [
        'Ext.container.Viewport',
        'FileManagement.components.grids.FileGrid',
        'FileManagement.components.stores.FileGridStore',
        'FileManagement.components.viewers.PDFViewer',
        'FileManagement.components.utils.PanelUtils',
        'FileManagement.components.navigation.NavigationPanel',
        'FileManagement.components.navigation.UserToolbar',
        'FileManagement.components.forms.FolderCreateForm',
        'FileManagement.components.forms.auth.LoginForm',
        'FileManagement.components.forms.auth.RegisterForm',
        'FileManagement.helpers.Functions',
    ],

    launch: function() {
        const isAuthenticated = !!localStorage.getItem('token');

        const loadMainView = () => {
            // Create instances of components
            const fileGridStore = Ext.create('FileManagement.components.stores.FileGridStore');

            const fileGrid = Ext.create('FileManagement.components.grids.FileGrid', {
                xtype: 'filegrid',
                store: fileGridStore,
                x: 210,
                y: 250,
                title: 'File Grid Panel'
            });

            // Create the viewport with navigation and main panels
            Ext.create('Ext.container.Viewport', {
                layout: 'border',
                items: [
                    {
                        region: 'south',
                        xtype: 'userToolbar' // Reference the new UserToolbar component
                    },
                    {
                        region: 'west',
                        xtype: 'navigationpanel',
                        width: 200,
                        split: true
                    },
                    {
                        region: 'center',
                        xtype: 'container',
                        layout: 'absolute',
                        id: 'mainPanelRegion',
                        items: [fileGrid],
                        listeners: {
                            afterrender: function (container) {

                                let currentIndex = 0; // Initialize index for panel switching
                                window.highestZIndex = 1; // Start z-index tracking

                                // Alt+Q toggling functionality
                                Ext.getBody().on('keydown', function (e) {
                                    if (e.altKey && e.getKey() === Ext.EventObject.Q) {
                                        console.log("Alt+Q pressed");

                                        // Get all visible panels in mainPanelRegion, excluding the navigation panel
                                        const panels = container.items.filter(panel => panel.isVisible() && panel.itemId !== 'navigationPanel');

                                        if (panels.length === 0) return;

                                        // Reset z-index of the currently active panel
                                        if (panels[currentIndex]) {
                                            panels[currentIndex].getEl().setStyle('z-index', 1);
                                        }

                                        // Update the index to the next panel, looping back if necessary
                                        currentIndex = (currentIndex + 1) % panels.length;

                                        // Bring the next panel to the front by setting its z-index
                                        window.highestZIndex += 1;
                                        if (panels[currentIndex]) {
                                            panels[currentIndex].getEl().setStyle('z-index', window.highestZIndex);
                                            console.log("Switched to panel:", panels[currentIndex].xtype);
                                        }
                                    }
                                });

                                const navPanel = Ext.ComponentQuery.query('navigationpanel')[0];
                                if (navPanel) {
                                    navPanel.refreshPanelList();
                                }
                            },
                            add: function () {
                                const navPanel = Ext.ComponentQuery.query('navigationpanel')[0];
                                if (navPanel) {
                                    navPanel.refreshPanelList();
                                }
                            },
                            remove: function () {
                                const navPanel = Ext.ComponentQuery.query('navigationpanel')[0];
                                if (navPanel) {
                                    navPanel.refreshPanelList();
                                }
                            }
                        }
                    }
                ]
            });
        };

        if (!isAuthenticated) {
            const loginForm = Ext.create('FileManagement.components.forms.auth.LoginForm');
            const registerForm = Ext.create('FileManagement.components.forms.auth.RegisterForm');

            loginForm.show();
            registerForm.hide();

            loginForm.on('loginSuccess', loadMainView);

            loginForm.down('#loginform-registerbutton').on('click', function() {
                loginForm.setVisible(false);
                registerForm.setVisible(true);
            });

            registerForm.down('#registerform-loginbutton').on('click', function() {
                registerForm.setVisible(false);
                loginForm.setVisible(true);
            });
        } else {
            loadMainView();
        }
    }
});

Ext.Ajax.setDefaultHeaders({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});


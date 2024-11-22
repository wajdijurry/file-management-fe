Ext.define('FileManagement.components.utils.PanelUtils', {
    singleton: true,

    // Function to maximize the panel and bring it to the front
    maximizePanel: function(panel) {
        const mainPanelRegion = Ext.getCmp('mainPanelRegion');
        if (mainPanelRegion) {
            // Store the original position and size for restoration
            panel.originalConfig = {
                x: panel.getX(),
                y: panel.getY(),
                width: panel.getWidth(),
                height: panel.getHeight(),
                zIndex: panel.getEl().getStyle('z-index') // Save original z-index
            };

            // Set panel to fill mainPanelRegion
            const regionSize = mainPanelRegion.getSize();
            panel.setPosition(0, 0);
            panel.setSize(regionSize.width, regionSize.height);

            // Set a high z-index to bring the panel to the front
            panel.getEl().setStyle('z-index', ++window.highestZIndex);
            panel.maximized = true;

            // Change the tool icon to minimize
            panel.tools[0].setType('minimize');
        }
    },

    // Function to restore the panel's original position, size, and z-index
    minimizePanel: function(panel) {
        if (panel.maximized) {
            // Restore the original position, size, and z-index
            panel.setPosition(panel.originalConfig.x, panel.originalConfig.y);
            panel.setSize(panel.originalConfig.width, panel.originalConfig.height);
            panel.getEl().setStyle('z-index', panel.originalConfig.zIndex);
            panel.maximized = false;

            // Change the tool icon back to maximize
            panel.tools[0].setType('maximize');
        }
    },

    // Function to handle drag end and constrain position
    onMouseUp: function(panel) {
        const el = panel.getEl().dom;
        const viewportHeight = Ext.Element.getViewportHeight(); // Total viewport height
        const toolbarHeight = Ext.ComponentQuery.query('#userToolbar')[0].getHeight(); // Get toolbar height

        if (el) {
            // Get final position after drag ends
            let finalLeft = parseInt(el.style.left, 10);
            let finalTop = parseInt(el.style.top, 10);

            // Constrain to the left boundary
            if (finalLeft <= 0) {
                finalLeft = 0;
            }

            // Constrain to the top boundary (not necessary here but included for consistency)
            if (finalTop <= 0) {
                finalTop = 0;
            }

            // Constrain to the bottom boundary to avoid overlapping the toolbar
            const maxTop = viewportHeight - toolbarHeight - el.offsetHeight;
            if (finalTop >= maxTop) {
                finalTop = maxTop;
            }

            // Apply the constrained position and update z-index
            el.style.left = `${finalLeft}px`;
            el.style.top = `${finalTop}px`;
            el.style.zIndex = ++window.highestZIndex;
        }

        const iframePanels = Ext.ComponentQuery.query('pdfviewer');
        iframePanels.forEach(panel => {
            const el = panel.items.items[0].getEl();
            if (el && el.style && 'pointerEvents' in el.style) {
                delete el.style.pointerEvents;
            }
        });
    },

    // Close panel functionality
    closePanel: function(panel) {
        const parent = panel.up(); // Get the parent container
        if (parent) {
            parent.remove(panel, true); // Remove the panel from its parent
        }
    },

    show: function(panel) {
        this.updateNavigationPanelList();
    },

    hide: function() {
        this.updateNavigationPanelList();
    },

    destroy: function(panel) {
        // Clean up store and remove event listeners
        if (typeof panel.getStore !== "undefined" && panel.getStore()) {
            panel.getStore().removeAll();  // Clears store data to free up memory
            panel.getStore().clearListeners();
        }

        this.updateNavigationPanelList();
    },

    onClick: function (panel) {
        window.highestZIndex += 1;
        panel.setStyle('z-index', window.highestZIndex);
    },

    updateNavigationPanelList: function() {
        const navPanel = Ext.ComponentQuery.query('navigationpanel')[0];
        if (navPanel) {
            navPanel.refreshPanelList();
        }
    },

    toggleMaximize: function(panel) {
        if (!panel.maximized) {
            this.maximizePanel(panel);
        } else {
            this.minimizePanel(panel);
        }
    },

    onDrag: function(panel) {
        // Mask all panels with iframes
        const iframePanels = Ext.ComponentQuery.query('panel[cls~=iframe-container]');
        iframePanels.forEach(panel => {
            const el = panel.items.items[0];
            if (el) {
                // Add a mask to the panel's element
                el.setStyle({
                    pointerEvents: 'none'
                });
            }
        });
    },

    applyZIndexHighlighting: function(container) {
        // Function to handle highlighting logic
        const updateHighlighting = (activePanel) => {
            container.items.each(panel => {
                if (panel instanceof Ext.panel.Panel) {
                    if (panel === activePanel) {
                        panel.removeCls('grayed-out');
                        panel.addCls('active-panel');
                        panel.layout.zIndex = ++window.highestZIndex;
                    } else {
                        panel.removeCls('active-panel');
                        panel.addCls('grayed-out');
                    }
                }
            });
        };

        // Add listeners to all existing panels
        container.items.each(panel => {
            if (panel instanceof Ext.panel.Panel) {
                panel.on('afterrender', () => {
                    // Highlight when the panel is clicked
                    panel.getEl().on('mousedown', () => {
                        updateHighlighting(panel);
                    });

                    // Ensure grayout is updated when a panel is closed
                    panel.on('close', () => {
                        const remainingPanels = container.query('panel:not(.x-hidden-display)');
                        if (remainingPanels.length > 0) {
                            updateHighlighting(remainingPanels[0]); // Highlight the first remaining panel
                        } else {
                            container.items.each(p => p.removeCls('grayed-out')); // Remove grayout if no panels left
                        }
                    });
                });
            }
        });

        // Handle dynamically added panels
        container.on('add', (parent, panel) => {
            if (panel instanceof Ext.panel.Panel) {
                panel.on('afterrender', () => {
                    panel.getEl().on('mousedown', () => {
                        updateHighlighting(panel);
                    });

                    panel.on('close', () => {
                        const remainingPanels = container.query('panel:not(.x-hidden-display)');
                        if (remainingPanels.length > 0) {
                            updateHighlighting(remainingPanels[0]);
                        } else {
                            container.items.each(p => p.removeCls('grayed-out'));
                        }
                    });
                });
            }
        });

        // Initial highlight
        if (container.items.length > 0) {
            updateHighlighting(container.items.getAt(0)); // Highlight the first panel
        }
    },

    updateZIndexHighlighting: function(container, activePanel) {
        container.items.each(panel => {
            if (panel instanceof Ext.panel.Panel) {
                if (panel === activePanel) {
                    panel.removeCls('grayed-out');
                    panel.addCls('active-panel');
                } else {
                    panel.removeCls('active-panel');
                    panel.addCls('grayed-out');
                }
            }
        });
    }
});

/* jshint loopfunc:true */

if ('undefined' == typeof(bbcodextra)) {
	var bbcodextra = {
		/*
		 * Init and Quit function
		 */

		bbcodextraPrefs : null,
		localizedStrings : null,

		init: function () {
			var menu = document.getElementById('contentAreaContextMenu');
			try {
				menu.addEventListener('popupshowing', bbcodextra.showHide, false);
			}
			catch (ex) {
			}

			this.localizedStrings = document.getElementById('localizedStrings');
			if ('undefined' == typeof(bbcodextraPrefs)) {
				this.bbcodextraPrefs = nsPreferences;
			}
            var mm = window.messageManager;
            mm.loadFrameScript('chrome://bbcodextra/content/frame-script.js', true);
            mm.addMessageListener('bbcodextra:interpret-command', bbcodextra.interpretCommand);
		},

		quit: function () {
			try {
				menu.removeEventListener('popupshowing', bbcodextra.showHide, false);
			}
			catch (ex) {
			}
		},

		/*
		 *	Color functions used in bbcodextraPickColor.xul
		 */

		loadColor: function () {
			var colorPrefs = nsPreferences;
			// Set color to last used value
			document.getElementById('colorSelector').color = colorPrefs.copyUnicharPref('extensions.bbcodextra.bbcodecolor');
			document.getElementById('selectedColor').style.backgroundColor = colorPrefs.copyUnicharPref('extensions.bbcodextra.bbcodecolor');
		},

		saveColor: function () {
			// Save selected color in a preference
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.bbcodecolor', document.getElementById('colorSelector').color);
			var returnValues = window.arguments[0];
			returnValues.selectedColor = 'ok';
		},

		/*
		 * Preferences window
		 */

		prefWindowEnableButtons: function () {
			// Enable Edit and Delete buttons only if an item is selected
			document.getElementById('btnEdit').setAttribute('disabled', false);
			document.getElementById('btnDelete').setAttribute('disabled', false);

			var listAvailableCustomTags = document.getElementById('listAvailableCustomTags');
			if (listAvailableCustomTags.currentIndex === 0) {
				// The first item is selected, 'Move up' is not allowed
				document.getElementById('btnMoveUp').setAttribute('disabled', true);
			} else {
				document.getElementById('btnMoveUp').setAttribute('disabled', false);
			}

			if (listAvailableCustomTags.currentIndex === listAvailableCustomTags.itemCount-1) {
				// The last item is selected, 'Move down' is not allowed
				document.getElementById('btnMoveDown').setAttribute('disabled', true);
			} else {
				document.getElementById('btnMoveDown').setAttribute('disabled', false);
			}
		},

		prefWindowAddTag: function () {
			var availableCustomTags = document.getElementById('pref-numcustomtags').value;
			var nextTagIndex = availableCustomTags + 1;

			var params = {
				inn: {
					tagLabel:    '',
					tagAction:   '',
					windowTitle: localizedStrings.getString('WINDOWTITLE_NEWCUSTOMTAG')
				},
				out: null
			};

			window.openDialog(
                'chrome://bbcodextra/content/bbcodextraCustomTag.xul', '',
                'chrome, dialog, modal, resizable=yes', params
            ).focus();

			if (params.out) {
				// Create pref using values passed from dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.label', params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.action', params.out.tagAction);

				// Increment available customtags. No need to update the label, since I will call prefWindowRefreshCustomPane() at the end
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags + 1);

				// Update displayed information
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

        prefSortTags: function () {
            var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1']
                            .getService(Components.interfaces.nsIPromptService);

            var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES +
                        prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO;

            var button = prompts.confirmEx(
                            null, localizedStrings.getString('ALERT_REORDER_TITLE'),
                            localizedStrings.getString('ALERT_REORDER_TEXT'),
                            flags, '', '', '', null, {}
                         );

            if (button === 0) {
                var availableCustomTags = document.getElementById('pref-numcustomtags').value;

                if (availableCustomTags > 0) {
                    var customTagsList = [];
                    for (var i = 1; i <= availableCustomTags; i++) {
                        var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.label'));
                        var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.action'));

                        customTagsList.push({
                            name:         itemLabel,
                            action:       itemAction,
                            currentIndex: i
                        });
                    }

                    // Sort tags by name
                    customTagsList.sort(function (a, b) {
                        return a.name.localeCompare(b.name);
                    });

                    for (i = 1; i <= availableCustomTags; i++) {
                        bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i + '.label', customTagsList[i - 1].name);
                        bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i + '.action', customTagsList[i - 1].action);
                    }
                }
                bbcodextra.prefWindowRefreshCustomPane();
            }
        },

        prefExportSettings: function () {
            var jsonData = [];
            var prefList = [];

            var extPrefs = Components.classes['@mozilla.org/preferences-service;1']
                            .getService(Components.interfaces.nsIPrefService);
            extPrefs = extPrefs.getBranch('extensions.bbcodextra.');

            prefList = extPrefs.getChildList('', []);
            for (var prefIndex in prefList) {
                var prefName = prefList[prefIndex];
                var prefType = extPrefs.getPrefType(prefName);
                var prefValue;

                switch (prefType) {
                    case 32: // PREF_STRING
                        prefValue = extPrefs.getComplexValue(prefName, Components.interfaces.nsISupportsString).data;
                        break;
                    case 64: // PREF_INT
                        prefValue = extPrefs.getIntPref(prefName);
                        break;
                    case 128: // PREF_BOOL
                        prefValue = extPrefs.getBoolPref(prefName);
                        break;
                    default:
                        prefValue = '';
                }

                jsonData.push({
                    name:  prefName,
                    value: prefValue,
                    type:  prefType,
                });
            }

            var nsIFilePicker = Components.interfaces.nsIFilePicker;
            var fp = Components.classes['@mozilla.org/filepicker;1']
                        .createInstance(nsIFilePicker);
            fp.init(window,
                    localizedStrings.getString('WINDOWTITLE_EXPORT'),
                    nsIFilePicker.modeSave);
            fp.appendFilter('JSON', '*.json');
            fp.defaultString = 'bbcodextra_backup.json';

            var rv = fp.show();
            if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
                var file = fp.file;

                // Reference: https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
                var foStream = Components.classes['@mozilla.org/network/file-output-stream;1'].
                                    createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
                var converter = Components.classes['@mozilla.org/intl/converter-output-stream;1'].
                                    createInstance(Components.interfaces.nsIConverterOutputStream);
                converter.init(foStream, 'UTF-8', 0, 0);
                converter.writeString(JSON.stringify(jsonData, null, '\t'));
                converter.close();
            }
        },

        prefImportSettings: function () {
            var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1']
                            .getService(Components.interfaces.nsIPromptService);

            var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES +
                        prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO;

            var button = prompts.confirmEx(null, localizedStrings.getString('ALERT_IMPORT_TITLE'),
                                            localizedStrings.getString('ALERT_IMPORT_TEXT'),
                                            flags, '', '', '', null, {});

            if (button === 0) {
                var nsIFilePicker = Components.interfaces.nsIFilePicker;
                var fp = Components.classes['@mozilla.org/filepicker;1']
                            .createInstance(nsIFilePicker);
                fp.init(window,
                        localizedStrings.getString('WINDOWTITLE_EXPORT'),
                        nsIFilePicker.modeOpen
                );
                fp.appendFilter('JSON', '*.json');
                var rv = fp.show();
                if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
                    var data = '';
                    var file = fp.file;

                    var fstream = Components.classes['@mozilla.org/network/file-input-stream;1'].
                                    createInstance(Components.interfaces.nsIFileInputStream);
                    var cstream = Components.classes['@mozilla.org/intl/converter-input-stream;1'].
                                    createInstance(Components.interfaces.nsIConverterInputStream);
                    fstream.init(file, -1, 0, 0);
                    cstream.init(fstream, 'UTF-8', 0, 0);

                    var str = {};
                    var read = 0;
                    do {
                        read = cstream.readString(0xffffffff, str);
                        data += str.value;
                    } while (read !== 0);

                    cstream.close();

                    var jsonData = {};
                    try {
                        jsonData = JSON.parse(data);
                        var extPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                        .getService(Components.interfaces.nsIPrefService);
                        extPrefs = extPrefs.getBranch('extensions.bbcodextra.');

                        for (var prefIndex in jsonData) {
                            var prefType = jsonData[prefIndex].type;
                            var prefName = jsonData[prefIndex].name;
                            var prefValue = jsonData[prefIndex].value;
                            switch (prefType) {
                                case 32: // PREF_STRING
                                    var strValue = Components.classes['@mozilla.org/supports-string;1']
                                                    .createInstance(Components.interfaces.nsISupportsString);
                                    strValue.data = prefValue;
                                    extPrefs.setComplexValue(prefName, Components.interfaces.nsISupportsString, strValue);
                                    break;
                                case 64: // PREF_INT
                                    extPrefs.setIntPref(prefName, prefValue);
                                    break;
                                case 128: // PREF_BOOL
                                    extPrefs.setBoolPref(prefName, prefValue);
                                    break;
                                default:
                                    prefValue = '';
                            }
                        }
                        bbcodextra.prefWindowRefreshCustomPane();
                        prompts.alert(
                            null,
                            localizedStrings.getString('ALERT_IMPORT_TITLE'),
                            localizedStrings.getString('ALERT_IMPORT_COMPLETED')
                        );
                    } catch(e) {
                        console.log('Error (BBCodeXtra): ' + e);
                    }
                }
            }
        },

		prefWindowEditTag: function () {
			// I need to read pref values for this custom tag
			var currentTag = document.getElementById('listAvailableCustomTags').currentIndex + 1;
			var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label'));
			var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action'));

			var params = {
				inn: {
					tagLabel:    itemLabel,
					tagAction:   itemAction,
					windowTitle: localizedStrings.getString('WINDOWTITLE_EDITCUSTOMTAG')
				},
				out:null
			};

			window.openDialog(
                'chrome://bbcodextra/content/bbcodextraCustomTag.xul', '',
    			'chrome, dialog, modal, resizable=yes', params
            ).focus();

			if (params.out) {
				// Change existing pref using values passed for dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label', params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action', params.out.tagAction);

				// Update displayed information
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowDeleteTag: function () {
			var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1']
							.getService(Components.interfaces.nsIPromptService);
			var check = {value: false};
            var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES + prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO;
            var button = prompts.confirmEx(null, 'BBCodeXtra', localizedStrings.getString('DELETE_CUSTOMTAG'),
                                            flags, '', '', '', null, check);
            if (button === 0) {
            	// Remove two preferences about selected tag
				var currentTag = document.getElementById('listAvailableCustomTags').currentIndex + 1;

				var prefsToDelete = Components.classes['@mozilla.org/preferences-service;1'].
				getService(Components.interfaces.nsIPrefService).
				getBranch('extensions.bbcodextra.');
				prefsToDelete.deleteBranch('custom'+currentTag);

				// Reorder existing tags, starting from the removed tag to avoid extra work. If I removed the last one, no need to reorder
				var availableCustomTags = document.getElementById('pref-numcustomtags').value;
				if (currentTag != availableCustomTags) {
					bbcodextra.prefWindowReorderTagsAfterDelete(currentTag, availableCustomTags);
				}

				// Decrease available customtags. No need to update the label, since I will call prefWindowRefreshCustomPane() at the end
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags - 1);

				// Update info displayed
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowReorderTagsAfterDelete: function (startingPoint, availableCustomTags) {
			// I removed a custom tag, so I need to rearrange existing tags
			var nextTagIndex;
			for (var i = startingPoint; i < availableCustomTags; i++) {
				// Moving up preferences ==> pref[n]=pref[n+1]
				nextTagIndex = i + 1;
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i + '.label',
												unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.label')));
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i + '.action',
												unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.action')));
			}
			// Still need to remove the last one (i)
			var prefsToDelete = Components.classes['@mozilla.org/preferences-service;1'].
			getService(Components.interfaces.nsIPrefService).
			getBranch('extensions.bbcodextra.');
			prefsToDelete.deleteBranch('custom' + i);
		},

		prefWindowMoveUp: function () {
			// Move up: exchange tag[n] with tag[n-1]

			var currentTag = document.getElementById('listAvailableCustomTags').currentIndex + 1;
			var previousTag = currentTag - 1;

			//  Store tag[n] before overwriting
			var existingLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + previousTag + '.label'));
			var existingAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + previousTag + '.action'));

			// tag[n-1]=tag[n]
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + previousTag + '.label',
											unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label')));
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + previousTag + '.action',
											unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action')));

			// tag[n]=stored values
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label', existingLabel);
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action', existingAction);

			// Update displayed info
			bbcodextra.prefWindowRefreshCustomPane();
		},

		prefWindowMoveDown: function () {
			// Move down: exchange tag[n] with tag[n+1]

			var currentTag = document.getElementById('listAvailableCustomTags').currentIndex + 1;
			var nextTag = currentTag + 1;

			// Store tag[n] before overwriting
			var existingLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTag + '.label'));
			var existingAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTag + '.action'));

			// tag[n+1]=tag[n]
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTag + '.label',
											unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label')));
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTag + '.action',
											unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action')));

			// tag[n]=stored values
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label', existingLabel);
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action', existingAction);

			// Update displayed info
			bbcodextra.prefWindowRefreshCustomPane();
		},

		prefWindowRefreshCustomPane: function () {
			// Updating the label displaying the number of available custom tags
			var availableCustomTags = document.getElementById('pref-numcustomtags').value;
			document.getElementById('availableCustomTags').setAttribute('value', availableCustomTags);

			var listAvailableCustomTags = document.getElementById('listAvailableCustomTags');

			// Empty list
			while (listAvailableCustomTags.hasChildNodes()) {
				listAvailableCustomTags.removeChild(listAvailableCustomTags.firstChild);
			}

			if (availableCustomTags > 0) {
				// Add custom tags to the listbox
				for (var i = 1; i <= availableCustomTags; i++) {
					var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.label'));
					var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.action'));

					var listItem = document.createElement('listitem');
					listItem.setAttribute('label', itemLabel);
					listAvailableCustomTags.appendChild(listItem);
				}
			}

			// Nothing should be selected
			listAvailableCustomTags.currentIndex = -1;

			// Disable all buttons except 'Add...'
			document.getElementById('btnEdit').setAttribute('disabled', true);
			document.getElementById('btnDelete').setAttribute('disabled', true);
			document.getElementById('btnMoveDown').setAttribute('disabled', true);
			document.getElementById('btnMoveUp').setAttribute('disabled', true);
		},

		prefWindowSetVBulletinStatus: function () {
			document.getElementById('bbcodextra-enable-vbulletin').disabled = document.getElementById('bbcodextra-enable-bbcode').checked;
		},

		/*
		 * Custom tags window
		 */

		customTagWindowLoad: function () {
			// If I'm changing an existing custom tag, I need to load existing values
			document.getElementById('tagLabel').value = window.arguments[0].inn.tagLabel;
			document.getElementById('tagAction').value = window.arguments[0].inn.tagAction;
			// Setting up window title according to action (edit/new)
			document.title = window.arguments[0].inn.windowTitle;
		},

		customTagWindowConfirm: function () {
			window.arguments[0].out = {
				tagLabel:  document.getElementById('tagLabel').value,
				tagAction: document.getElementById('tagAction').value
			};
			return true;
		},

		/*
		 * Menu functions
		 */

		showHide: function () {
			// Read pref values to determine which menus are enabled and should be displayed
			var enableBBCodeMenu    = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.bbcodemenu');
			var enableHtmlMenu      = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.htmlmenu');
			var enableXhtmlMenu     = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.xhtmlmenu');
			var enableVBulletinMenu = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.bbcodevbulletinmenu');
			var enableMarkdownMenu  = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.markdownmenu');
			var enableCustomMenu    = bbcodextraPrefs.getBoolPref('extensions.bbcodextra.custommenu');

            var displayMenu = document.getElementById('context-undo').hidden;

			if (enableBBCodeMenu) {
				document.getElementById('context-bbcodextra-bbcode').hidden = displayMenu;
				// VBulletin is displayed only if BBCode menu is enabled
				if (enableVBulletinMenu) {
					document.getElementById('context-bbcodextra-vbulletinmenu').hidden = displayMenu;
				}
				else {
					document.getElementById('context-bbcodextra-vbulletinmenu').hidden = true;
				}
			} else {
				document.getElementById('context-bbcodextra-bbcode').hidden = true;
			}

			if (enableHtmlMenu) {
				document.getElementById('context-bbcodextra-html').hidden = displayMenu;
			} else {
				document.getElementById('context-bbcodextra-html').hidden = true;
			}

			if (enableXhtmlMenu) {
				document.getElementById('context-bbcodextra-xhtml').hidden = displayMenu;
			}else{
				document.getElementById('context-bbcodextra-xhtml').hidden = true;
			}

			if (enableMarkdownMenu) {
				document.getElementById('context-bbcodextra-markdown').hidden = displayMenu;
			} else {
				document.getElementById('context-bbcodextra-markdown').hidden = true;
			}

			if (enableCustomMenu) {
				document.getElementById('context-bbcodextra-custom').hidden = displayMenu;
			} else {
				document.getElementById('context-bbcodextra-custom').hidden = true;
			}
		},

		disableMenu: function (idPref) {
			// Set idPref to false
			bbcodextraPrefs.setBoolPref('extensions.bbcodextra.' + idPref, false);
		},

		displayCustomMenu: function () {
			var availableCustomTags = bbcodextraPrefs.getIntPref('extensions.bbcodextra.customtags');
			var containerMenu = document.getElementById('context-bbcodextra-custom-container');

			// Remove existing elements in the menu
			while (containerMenu.hasChildNodes()) {
				containerMenu.removeChild(containerMenu.firstChild);
			}

			var menuItem;
			var i;
			if (availableCustomTags > 0) {
				// Add custom tags
				for (i = 1; i <= availableCustomTags; i++) {
					(function (i) {
						// Need to avoid scope problems with menuAction in event listener
						var menuLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + i + '.label'));
						var menuAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + i + '.action'));
						menuItem = document.createElement('menuitem');
						menuItem.setAttribute('label', menuLabel);
						menuItem.setAttribute('id', 'bbcodextra-custom-item' + i);
						menuItem.setAttribute('index', i);
						menuItem.addEventListener('command', function () {
							bbcodextra.bbcodextra('custom', menuAction);
						}, false);
						containerMenu.appendChild(menuItem);
					}(i));
				}
			} else {
				// No custom tags defined
				menuItem = document.createElement('menuitem');
				menuItem.setAttribute('label', localizedStrings.getString('MENU_NO_CUSTOM_TAGS'));
				menuItem.setAttribute('id', 'bbcodextra-custom-item-empty');
				menuItem.setAttribute('index', 2);
				menuItem.setAttribute('disabled', 'true');
				containerMenu.appendChild(menuItem);
			}

			// Adding standard menu items: a separator, Settings, Disable
			menuItem = document.createElement('menuseparator');
			containerMenu.appendChild(menuItem);

			menuItem = document.createElement('menuitem');
			menuItem.setAttribute('label', localizedStrings.getString('MENU_DISABLE'));
			menuItem.setAttribute('class', 'menuitem-iconic menu-iconic icon-bbcodextraDisable');
			menuItem.setAttribute('id', 'bbcodextra--custom-context-disable');
			menuItem.addEventListener('command', function () {
				bbcodextra.disableMenu('custommenu', null);
			}, false);
			menuItem.setAttribute('index', ++i);
			containerMenu.appendChild(menuItem);

			menuItem = document.createElement('menuitem');
			menuItem.setAttribute('label', localizedStrings.getString('MENU_SETTINGS'));
			menuItem.setAttribute('class', 'menuitem-iconic menu-iconic icon-bbcodextraPrefs');
			menuItem.setAttribute('id', '&bbcodextra.settingsmenu;');
			menuItem.addEventListener('command', function () {
				bbcodextra.showPreferences();
			}, false);
			menuItem.setAttribute('index', ++i);
			containerMenu.appendChild(menuItem);

		},

		showPreferences: function () {
			window.openDialog('chrome://bbcodextra/content/bbcodextraPrefs.xul',
				'modifyheadersDialog',
				'chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes,modal=no,dependent=no,dialog=no');
		},

		showColorPick: function () {
			var color;
			var returnValues = { selectedColor: null};
			window.openDialog('chrome://bbcodextra/content/bbcodextraPickColor.xul', '_blank', 'chrome,dialog,modal,centerscreen', returnValues);
			if (returnValues.selectedColor == 'ok') {
				color = bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.bbcodecolor');
				bbcodextra.bbcodextra('color', color);
			}
		},

		/*************************
			Main functions
		 *************************/

		promptWindow: function (str) {
			var promptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1']
									.getService(Components.interfaces.nsIPromptService);
			var result = {value:null};
			promptService.prompt(null, 'BBCodeXtra', str, result, null, {value:0});
			return result.value;
		},

        getClipboardContent: function () {
            /*
                Code reference for clipboard
                https://developer.mozilla.org/docs/Using_the_Clipboard#Pasting_Clipboard_Contents
            */

            var nsTransferable = Components.Constructor(
                '@mozilla.org/widget/transferable;1',
                'nsITransferable'
            );

            function Transferable (source) {
                var res = nsTransferable();
                if ('init' in res) {
                    if (source instanceof Components.interfaces.nsIDOMWindow)
                        source = source.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                                    .getInterface(Components.interfaces.nsIWebNavigation);
                    res.init(source);
                }
                return res;
            }

            var widgetTransferable = Transferable();
            widgetTransferable.addDataFlavor('text/unicode');
            try {
                Services.clipboard.getData(
                    widgetTransferable,
                    Services.clipboard.kGlobalClipboard
                );
            } catch (e) {
                console.log('Error getting content from clipboard: ' + e);
                return false;
            }

            var strClipboard = {};
            var strClipboardString;
            var strLength = {};
            try {
                widgetTransferable.getTransferData('text/unicode', strClipboard, strLength);

                if (strClipboard) {
                    strClipboard = strClipboard.value.QueryInterface(Components.interfaces.nsISupportsString);
                }
                if (strClipboard) {
                    strClipboardString = strClipboard.data;
                }
            } catch (e) {
                //alert('No text in the clipboard, please copy something first.');
            }

            return strClipboardString;
        },

		bbcodextra: function (myCommand, extraParams) {
            var browserMM = gBrowser.selectedBrowser.messageManager;
            browserMM.sendAsyncMessage(
                'bbcodextra:update-text',
                {
                    command: myCommand,
                    extraParams: extraParams
                }
            );
		},

        interpretCommand: function (message) {
            var myCommand = message.data.command;
            var strClipboard = bbcodextra.getClipboardContent();
            var strSelected = message.data.selectedText;
            var extraParam = message.data.extraParams;

            var elaboratedText = null;

			// Variables for wizards
			var composeURL = null;
			var composeURLname = null;

			// Variable for quotes
			var author = null;

			// Value obtained from a prompt (user)
			var strPrompt = null;

			// Variables for localized JS strings
			var strInsAuthor = localizedStrings.getString('INS_AUTHOR');
			var strInsLinkName = localizedStrings.getString('INS_LINKNAME');
			var strInsFontSize = localizedStrings.getString('INS_FONTSIZE');
			var strInsFontColor = localizedStrings.getString('INS_FONTCOLOR');
			var strInsThreadNum = localizedStrings.getString('INS_THREADNUM');
			var strInsPostNum = localizedStrings.getString('INS_POSTNUM');
			var strComposeURLStep1 = localizedStrings.getString('URLCOMPOSTO_STEP1');
			var strComposeURLStep2 = localizedStrings.getString('URLCOMPOSTO_STEP2');

			switch (myCommand) {
				case 'custom':
					var customAction = unescape(extraParam);
					// Replace globally _clipboard_ with strClipboard
					customAction = customAction.replace(/_clipboard_/g, strClipboard);
					// Replace globally _selection_ with strSelected
					customAction = customAction.replace(/_selection_/g, strSelected);
					// Insert string
					elaboratedText = customAction;
				break;

				case 'quoteclip':
				author = bbcodextra.promptWindow(strInsAuthor);
					if (author !== null) {
						if (author === '') {
							elaboratedText = '[quote]' + strClipboard + '[/quote]';
						} else {
							elaboratedText = '[quote=\'' + author + '\']' + strClipboard + '[/quote]';
						}
					}
				break;

				case 'quote':
					author = bbcodextra.promptWindow(strInsAuthor);
					if (author !== null) {
						if (author === '') {
							elaboratedText = '[quote]' + strSelected + '[/quote]';
						} else {
							elaboratedText = '[quote=\'' + author + '\']' + strSelected + '[/quote]';
						}
					}
				break;

				case 'img':
					elaboratedText = '[img]' + strSelected + '[/img]';
				break;

				case 'imgclip':
					elaboratedText = '[img]' + strClipboard + '[/img]';
				break;

				case 'codeclip':
					elaboratedText = '[code]' + strClipboard + '[/code]';
				break;

				case 'urltag':
					elaboratedText = '[url]' + strSelected + '[/url]';
				break;

				case 'urltagname':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '[url=' + strSelected + ']' + strPrompt + '[/url]';
					}
				break;

				case 'url':
					elaboratedText = '[url]' + strClipboard + '[/url]';
				break;

				case 'urlclip':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '[url=' + strClipboard + ']' + strPrompt + '[/url]';
					}
				break;

				case 'urlselection':
					elaboratedText = '[url=' + strClipboard + ']' + strSelected + '[/url]';
				break;

				case 'composeurl':
				composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
				if (composeURLname !==null ) {
					composeURL = bbcodextra.promptWindow(strComposeURLStep2);
					if (composeURL !== null) {
						elaboratedText = '[url=' + composeURL + ']' + composeURLname + '[/url]';
					}
				}
				break;

				case 'bold':
					elaboratedText = '[b]' + strSelected + '[/b]';
				break;

				case 'list':
					elaboratedText = bbcodextra.createList(strSelected, 'bbcode');
				break;

				case 'listord':
					elaboratedText = bbcodextra.createList(strSelected, 'bbcodeord');
				break;

				case 'listalpha':
					elaboratedText = bbcodextra.createList(strSelected, 'bbcodeordalf');
				break;

				case 'listclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'bbcode');
				break;

				case 'listclipord':
					elaboratedText = bbcodextra.createList(strClipboard, 'bbcodeord');
				break;

				case 'listclipalpha':
					elaboratedText = bbcodextra.createList(strClipboard, 'bbcodeordalf');
				break;

				case 'italic':
					elaboratedText = '[i]' + strSelected + '[/i]';
				break;

				case 'underline':
					elaboratedText = '[u]' + strSelected + '[/u]';
				break;

				case 'code':
					elaboratedText = '[code]' + strSelected + '[/code]';
				break;

				case 'size':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsFontSize);
					if (strPrompt !== null) {
						elaboratedText = '[size=' + strPrompt + ']' + strSelected + '[/size]';
					}
				break;

				case 'color':
					elaboratedText = '[color=' + extraParam + ']' + strSelected + '[/color]';
				break;

				// VBULLETIN SECTION

				case 'vbulthread':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsThreadNum);
					if (strPrompt!==null) {
						elaboratedText = '[thread=' + strPrompt + ']' + strSelected + '[/thread]';
					}
				break;

				case 'vbulpost':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsPostNum);
					if (strPrompt !== null) {
						elaboratedText = '[post=' + strPrompt + ']' + strSelected + '[/post]';
					}
				break;

				case 'vbulleft':
					elaboratedText = '[left]' + strSelected + '[/left]';
				break;

				case 'vbulright':
					elaboratedText = '[right]' + strSelected + '[/right]';
				break;

				case 'vbulcenter':
					elaboratedText = '[center]' + strSelected + '[/center]';
				break;

				case 'vbulindent':
					elaboratedText = '[indent]' + strSelected + '[/indent]';
				break;

				case 'vbulhighlight':
					elaboratedText = '[highlight]' + strSelected + '[/highlight]';
				break;

				// HTML SECTION

				case 'htmlbold':
					elaboratedText = '<b>' + strSelected + '</b>';
				break;

				case 'htmlitalic':
					elaboratedText = '<i>' + strSelected + '</i>';
				break;

				case 'htmlunderline':
					elaboratedText = '<u>' + strSelected + '</u>';
				break;

				case 'htmlimg':
					elaboratedText = '<img src=\'' + strSelected + '\'>';
				break;

				case 'htmlimgclip':
					elaboratedText = '<img src=\'' + strClipboard + '\'>';
				break;

				case 'htmlstrike':
					elaboratedText = '<s>' + strSelected + '</s>';
				break;


				// XHTML SECTION

				case 'xhtmlbold':
					elaboratedText = '<strong>' + strSelected + '</strong>';
				break;

				case 'xhtmlitalic':
					elaboratedText = '<em>' + strSelected + '</em>';
				break;

				case 'xhtmlunderline':
					elaboratedText = '<ins>' + strSelected + '</ins>';
				break;

				case 'xhtmlimg':
					elaboratedText = '<img src=\'' + strSelected + '\' />';
				break;

				case 'xhtmlimgclip':
					elaboratedText = '<img src=\'' + strClipboard + '\' />';
				break;

				case 'xhtmlstrike':
					elaboratedText = '<del>' + strSelected + '</del>';
				break;

				// COMMON HTML/XHTML FUNCTIONS

				case 'xhtmlurltag':
					elaboratedText = '<a href=\'' + strSelected + '\'>' + strSelected + '</a>';
				break;

				case 'xhtmlquoteclip':
					elaboratedText = '<blockquote>' + strClipboard + '</blockquote>';
				break;

				case 'xhtmlcodeclip':
					elaboratedText = '<code>' + strClipboard + '</code>';
				break;

				case 'xhtmlquote':
					elaboratedText = '<blockquote>' + strSelected + '</blockquote>';
				break;

				case 'xhtmlcode':
					elaboratedText = '<code>' + strSelected + '</code>';
				break;

				case 'xhtmlurl':
					elaboratedText = '<a href=\'' + strClipboard + '\'>' + strClipboard + '</a>';
				break;

				case 'xhtmlurlclip':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '<a href=\'' + strClipboard + '\'>' + strPrompt + '</a>';
					}
				break;

				case 'xhtmlurlselection':
					elaboratedText = '<a href=\'' + strClipboard + '\'>' + strSelected + '</a>';
				break;

				case 'xhtmlurltagname':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '<a href=\'' + strSelected + '\'>' + strPrompt + '</a>';
					}
				break;

				case 'xhtmlcomposeurl':
					composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
					if (composeURLname !== null) {
						composeURL = bbcodextra.promptWindow(strComposeURLStep2);
						if (composeURL !== null) {
							elaboratedText = '<a href=\'' + composeURL + '\'>' + composeURLname + '</a>';
						}
					}
				break;

				case 'xhtmllist':
					elaboratedText = bbcodextra.createList(strSelected, 'html');
				break;

				case 'xhtmllistord':
					elaboratedText = bbcodextra.createList(strSelected, 'htmlord');
				break;

				case 'xhtmllistalpha':
					elaboratedText = bbcodextra.createList(strSelected, 'htmlordalf');
				break;

				case 'xhtmllistclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'html');
				break;

				case 'xhtmllistordclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'htmlord');
				break;

				case 'xhtmllistalphaclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'htmlordalf');
				break;

				// MARKDOWN FUNCTIONS

				case 'markdownquoteclip':
					elaboratedText = '> ' + strClipboard;
				break;

				case 'markdowncodeclip':
					elaboratedText = bbcodextra.markdownCode(strClipboard);
				break;

				case 'markdownlistclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'markdown');
				break;

				case 'markdownlistordclip':
					elaboratedText = bbcodextra.createList(strClipboard, 'markdownord');
				break;

				case 'markdownurlselection':
					elaboratedText = '[' + strSelected + '](' + strClipboard + ')';
				break;

				case 'markdownimgselection':
					elaboratedText = '![' + strSelected + '](' + strClipboard + ')';
				break;

				case 'markdownurlclip':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '[' + strClipboard + '](' + strPrompt + ')';
					}
				break;

				case 'markdownquote':
					elaboratedText = '> ' + strSelected;
				break;

				case 'markdowncode':
					elaboratedText = bbcodextra.markdownCode(strSelected);
				break;

				case 'markdownlist':
					elaboratedText = bbcodextra.createList(strSelected, 'markdown');
				break;

				case 'markdownlistord':
					elaboratedText = bbcodextra.createList(strSelected, 'markdownord');
				break;

				case 'markdowntagname':
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt !== null) {
						elaboratedText = '[' + strPrompt + '](' + strSelected + ')';
					}
				break;

				case 'markdowncomposeurl':
					composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
					if (composeURLname !== null) {
						composeURL = bbcodextra.promptWindow(strComposeURLStep2);
						if (composeURL !== null) {
							elaboratedText = '[' + composeURLname + '](' + composeURL + ')';
						}
					}
				break;

				case 'markdownbold':
					elaboratedText = '**' + strSelected + '**';
				break;

				case 'markdownitalic':
					elaboratedText = '*' + strSelected + '*';
				break;

				case 'markdownstrike':
					elaboratedText = '~~' + strSelected + '~~';
				break;

				default :
					alert('No function selected');
			} //end switch

            return elaboratedText;
		},

		createList: function (originalText, listType) {
			var startBlock, endBlock, startItem, endItem, formattedText;

			// Make sure only \n is used as line ending
			originalText = originalText.replace(/[\r|\n|\r\n]/g, '\n');
			// Split lines based on \n
			lines = originalText.split('\n');
			// Ignore empty lines
			lines = lines.filter(function (n) {
				return n !== '';
			});

			switch (listType) {
				case 'bbcode':
					startBlock = '[list]\n';
					startItem = '[*]';
					endItem = '\n';
					endBlock = '[/list]';
				break;
				case 'bbcodeord':
					startBlock = '[list=1]\n';
					startItem = '[*]';
					endItem = '\n';
					endBlock = '[/list]';
				break;
				case 'bbcodeordalf':
					startBlock = '[list=a]\n';
					startItem = '[*]';
					endItem = '\n';
					endBlock = '[/list]';
				break;
				case 'html':
					startBlock = '<ul>\n';
					startItem = '<li>';
					endItem = '</li>\n';
					endBlock = '</ul>';
				break;
				case 'htmlord':
					startBlock = '<ol>\n';
					startItem = '<li>';
					endItem = '</li>\n';
					endBlock = '</ol>';
				break;
				case 'htmlordalf':
					startBlock = '<ol type=a>\n';
					startItem = '<li>';
					endItem = '</li>\n';
					endBlock = '</ol>';
				break;
				case 'markdown':
					startBlock = endBlock = '';
					startItem = '- ';
					endItem = '\n';
				break;
				case 'markdownord':
					startBlock = endBlock = '';
					startItem = '';
					endItem = '\n';
				break;
				default:
					startBlock = '';
					startItem = '';
					endItem = '\n';
					endBlock = '';
				break;
			}

			formattedText = startBlock;
			for (var i = 0; i<lines.length; i++) {
				if (listType == 'markdownord') {
					var linenumber = i + 1;
					formattedText += linenumber + '. ' + lines[i] + endItem;
				} else {
					formattedText += startItem + lines[i] + endItem;
				}
			}
			formattedText += endBlock;

			return formattedText;
		},

		markdownCode: function (originalText) {
			var codeblock = '';
			var multiline = /[\r|\n|\r\n]/g;

			if (multiline.test(originalText)) {
				// Multiline
				codeblock = '```\n' + originalText + '\n```\n';
			} else {
				codeblock = '```' + originalText + '```';
			}

			return codeblock;
		},

	};
} // if ('undefined' == typeof(bbcodextra))

window.addEventListener('load', bbcodextra.init, false);
window.addEventListener('unload', bbcodextra.quit, false);

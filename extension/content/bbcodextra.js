/* jshint loopfunc:true */

if ("undefined" == typeof(bbcodextra)) {
	var bbcodextra = {
		/*
		 * Init and Quit function
		 */

		bbcodextraPrefs : null,
		localizedStrings : null,

		init: function() {
			var menu = document.getElementById('contentAreaContextMenu');
			try {
				menu.addEventListener('popupshowing', bbcodextra.showHide, false);
			}
			catch (ex) {
			}

			this.localizedStrings = document.getElementById("localizedStrings");

			if ("undefined" == typeof(bbcodextraPrefs)) {
				this.bbcodextraPrefs = nsPreferences;
			}
		},

		quit: function() {
			try {
				menu.removeEventListener('popupshowing', bbcodextra.showHide, false);
			}
			catch (ex) {
			}
		},

		/*
		 *	Color functions used in bbcodextraPickColor.xul
		 */

		loadColor: function(){
			var colorPrefs = nsPreferences;
			// Set color to last used value
			document.getElementById('colorSelector').color = colorPrefs.copyUnicharPref("extensions.bbcodextra.bbcodecolor");
			document.getElementById('selectedColor').style.backgroundColor = colorPrefs.copyUnicharPref("extensions.bbcodextra.bbcodecolor");
		},

		saveColor: function(){
			// Save selected color in a preference
			bbcodextraPrefs.setUnicharPref("extensions.bbcodextra.bbcodecolor", document.getElementById('colorSelector').color);
			var returnValues = window.arguments[0];
			returnValues.selectedColor = "ok";
		},

		/*
		 * Preferences window
		 */

		prefWindowEnableButtons: function(){
			// Enable Edit and Delete buttons only if an item is selected
			document.getElementById("btnEdit").setAttribute("disabled", false);
			document.getElementById("btnDelete").setAttribute("disabled", false);

			var listAvailableCustomTags = document.getElementById("listAvailableCustomTags");
			if (listAvailableCustomTags.currentIndex===0) {
				// The first item is selected, "Move up" is not allowed
				document.getElementById("btnMoveUp").setAttribute("disabled", true);
			} else {
				document.getElementById("btnMoveUp").setAttribute("disabled", false);
			}

			if (listAvailableCustomTags.currentIndex==listAvailableCustomTags.itemCount-1) {
				// The last item is selected, "Move down" is not allowed
				document.getElementById("btnMoveDown").setAttribute("disabled", true);
			} else {
				document.getElementById("btnMoveDown").setAttribute("disabled", false);
			}
		},

		prefWindowAddTag: function(){
			var availableCustomTags = document.getElementById("pref-numcustomtags").value;
			var nextTagIndex = availableCustomTags + 1;

			var params = {
				inn: {
					tagLabel: "",
					tagAction: "",
					windowTitle: localizedStrings.getString("WINDOWTITLE_NEWCUSTOMTAG")
				},
				out: null
			};

			window.openDialog("chrome://bbcodextra/content/bbcodextraCustomTag.xul", "",
			"chrome, dialog, modal, resizable=yes", params).focus();

			if (params.out) {
				// Create pref using values passed from dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.label', params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + nextTagIndex +'.action', params.out.tagAction);

				// Increment available customtags. No need to update the label, since I will call prefWindowRefreshCustomPane() at the end;
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags+1);

				// Update displayed information
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowEditTag: function(){
			// I need to read pref values for this custom tag
			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;
			var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label'));
			var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action'));

			var params = {
				inn: {
					tagLabel: itemLabel,
					tagAction: itemAction,
					windowTitle: localizedStrings.getString("WINDOWTITLE_EDITCUSTOMTAG")
				},
				out:null
			};

			window.openDialog("chrome://bbcodextra/content/bbcodextraCustomTag.xul", "",
			"chrome, dialog, modal, resizable=yes", params).focus();

			if (params.out) {
				// Change existing pref using values passed for dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.label', params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + currentTag + '.action', params.out.tagAction);

				// Update displayed information
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowDeleteTag: function(){
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
							.getService(Components.interfaces.nsIPromptService);
			var check = {value: false};
			var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_NO + prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_YES;
			var button = prompts.confirmEx(null, "BBCodeXtra", localizedStrings.getString("DELETE_CUSTOMTAG"),
											flags, "", "", "", null, check);
			if (button == 1) {
				// Remove two preferences about selected tag
				var currentTag = document.getElementById("listAvailableCustomTags").currentIndex + 1;

				var prefsToDelete=Components.classes["@mozilla.org/preferences-service;1"].
				getService(Components.interfaces.nsIPrefService).
				getBranch("extensions.bbcodextra.");
				prefsToDelete.deleteBranch('custom'+currentTag);

				// Reorder existing tags, starting from the removed tag to avoid extra work. If I removed the last one, no need to reorder
				var availableCustomTags = document.getElementById("pref-numcustomtags").value;
				if (currentTag!=availableCustomTags){
					bbcodextra.prefWindowReorderTagsAfterDelete(currentTag, availableCustomTags);
				}

				// Decrease available customtags. No need to update the label, since I will call prefWindowRefreshCustomPane() at the end;
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags - 1);

				// Update info displayed
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowReorderTagsAfterDelete: function(startingPoint, availableCustomTags){
			// I removed a custom tag, so I need to rearrange existing tags
			var nextTagIndex;
			for (var i=startingPoint; i<availableCustomTags; i++) {
				// Moving up preferences ==> pref[n]=pref[n+1]
				nextTagIndex=i+1;
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i +'.label',
												unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.label')));
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom' + i +'.action',
												unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + nextTagIndex + '.action')));
			}
			// Still need to remove the last one (i)
			var prefsToDelete=Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("extensions.bbcodextra.");
			prefsToDelete.deleteBranch('custom'+i);
		},

		prefWindowMoveUp: function(){
			// Move up: exchange tag[n] with tag[n-1]

			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex + 1;
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

		prefWindowMoveDown: function(){
			// Move down: exchange tag[n] with tag[n+1]

			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;
			var nextTag = currentTag+1;

			//  Store tag[n] before overwriting
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

		prefWindowRefreshCustomPane: function(){
			//Updating the label displaying the number of available custom tags
			var availableCustomTags = document.getElementById("pref-numcustomtags").value;
			document.getElementById("availableCustomTags").setAttribute("value", availableCustomTags);

			var listAvailableCustomTags = document.getElementById("listAvailableCustomTags");

			// Empty list
			while (listAvailableCustomTags.hasChildNodes()) {
				listAvailableCustomTags.removeChild(listAvailableCustomTags.firstChild);
			}

			if (availableCustomTags > 0) {
				// Add custom tags to the listbox
				for (var i=1; i<=availableCustomTags; i++) {
					var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.label'));
					var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom' + i + '.action'));

					var listItem = document.createElement("listitem");
					listItem.setAttribute("label", itemLabel);
					listAvailableCustomTags.appendChild(listItem);
				}
			}

			// Nothing should be selected
			listAvailableCustomTags.currentIndex = -1;

			// Disable all buttons except "Add..."
			document.getElementById("btnEdit").setAttribute("disabled", true);
			document.getElementById("btnDelete").setAttribute("disabled", true);
			document.getElementById("btnMoveDown").setAttribute("disabled", true);
			document.getElementById("btnMoveUp").setAttribute("disabled", true);
		},

		prefWindowSetVBulletinStatus: function(){
			document.getElementById("bbcodextra-enable-vbulletin").disabled = document.getElementById("bbcodextra-enable-bbcode").checked;
		},

		/*
		 * Custom tags window
		 */

		customTagWindowLoad: function(){
			// If I'm changing an existing custom tag, I need to load existing values
			document.getElementById("tagLabel").value = window.arguments[0].inn.tagLabel;
			document.getElementById("tagAction").value = window.arguments[0].inn.tagAction;
			// Setting up window title according to action (edit/new)
			document.title = window.arguments[0].inn.windowTitle;
		},

		customTagWindowConfirm: function(){
			window.arguments[0].out = {
				tagLabel: document.getElementById("tagLabel").value,
				tagAction: document.getElementById("tagAction").value
			};
			return true;
		},

		/*
		 * Menu functions
		 */

		showHide: function() {
			// Read pref values to determine which menus are enabled and should be displayed
			var enableBBCodeMenu    = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.bbcodemenu");
			var enableHtmlMenu      = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.htmlmenu");
			var enableXhtmlMenu     = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.xhtmlmenu");
			var enableVBulletinMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.bbcodevbulletinmenu");
			var enableMarkdownMenu  = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.markdownmenu");
			var enableCustomMenu    = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.custommenu");

			if (enableBBCodeMenu) {
				document.getElementById('context-bbcodextra-bbcode').hidden = document.getElementById('context-undo').hidden;
				// VBulletin is displayed only if BBCode menu is enabled
				if (enableVBulletinMenu) {
					document.getElementById('context-bbcodextra-vbulletinmenu').hidden = document.getElementById('context-undo').hidden;
				}
				else {
					document.getElementById('context-bbcodextra-vbulletinmenu').hidden = true;
				}
			} else {
				document.getElementById('context-bbcodextra-bbcode').hidden = true;
			}

			if (enableHtmlMenu) {
				document.getElementById('context-bbcodextra-html').hidden = document.getElementById('context-undo').hidden;
			} else {
				document.getElementById('context-bbcodextra-html').hidden = true;
			}

			if (enableXhtmlMenu) {
				document.getElementById('context-bbcodextra-xhtml').hidden = document.getElementById('context-undo').hidden;
			}else{
				document.getElementById('context-bbcodextra-xhtml').hidden = true;
			}

			if (enableMarkdownMenu) {
				document.getElementById('context-bbcodextra-markdown').hidden = document.getElementById('context-undo').hidden;
			} else {
				document.getElementById('context-bbcodextra-markdown').hidden = true;
			}

			if (enableCustomMenu) {
				document.getElementById('context-bbcodextra-custom').hidden = document.getElementById('context-undo').hidden;
			} else {
				document.getElementById('context-bbcodextra-custom').hidden = true;
			}
		},

		disableMenu: function (idPref) {
			// Set idPref to false
			bbcodextraPrefs.setBoolPref("extensions.bbcodextra." + idPref, false);
		},

		displayCustomMenu: function () {
			var availableCustomTags = bbcodextraPrefs.getIntPref('extensions.bbcodextra.customtags');
			var containerMenu = document.getElementById("context-bbcodextra-custom-container");

			// Remove existing elements in the menu
			while (containerMenu.hasChildNodes()) {
				containerMenu.removeChild(containerMenu.firstChild);
			}

			var menuItem;
			var i;
			if (availableCustomTags > 0) {
				// Add custom tags
				for (i=1; i<=availableCustomTags; i++) {
					(function(i) {
						// Need to avoid scope problems with menuAction in event listener
						var menuLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + i + '.label'));
						var menuAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom' + i + '.action'));
						menuItem = document.createElement("menuitem");
						menuItem.setAttribute("label", menuLabel);
						menuItem.setAttribute("id", "bbcodextra-custom-item" + i);
						menuItem.setAttribute("index", i);
						menuItem.addEventListener("command", function() {
							bbcodextra.bbcodextra('custom', menuAction);
						}, false);
						containerMenu.appendChild(menuItem);
					}(i));
				}
			} else {
				// No custom tags defined
				menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", localizedStrings.getString("MENU_NO_CUSTOM_TAGS"));
				menuItem.setAttribute("id", "bbcodextra-custom-item-empty");
				menuItem.setAttribute("index", 2);
				menuItem.setAttribute("disabled", "true");
				containerMenu.appendChild(menuItem);
			}

			/* Adding standard menu items: a separator, Settings, Disable */
			menuItem = document.createElement("menuseparator");
			containerMenu.appendChild(menuItem);

			menuItem = document.createElement("menuitem");
			menuItem.setAttribute("label", localizedStrings.getString("MENU_DISABLE"));
			menuItem.setAttribute("class", "menuitem-iconic menu-iconic icon-bbcodextraDisable");
			menuItem.setAttribute("id", "bbcodextra--custom-context-disable");
			menuItem.addEventListener("command", function() {
				bbcodextra.disableMenu('custommenu', null);
			}, false);
			menuItem.setAttribute("index", ++i);
			containerMenu.appendChild(menuItem);

			menuItem = document.createElement("menuitem");
			menuItem.setAttribute("label", localizedStrings.getString("MENU_SETTINGS"));
			menuItem.setAttribute("class", "menuitem-iconic menu-iconic icon-bbcodextraPrefs");
			menuItem.setAttribute("id", "&bbcodextra.settingsmenu;");
			menuItem.addEventListener("command", function() {
				bbcodextra.showPreferences();
			}, false);
			menuItem.setAttribute("index", ++i);
			containerMenu.appendChild(menuItem);

		},

		showPreferences: function() {
			window.openDialog('chrome://bbcodextra/content/bbcodextraPrefs.xul',
				'modifyheadersDialog',
				'chrome=yes,resizable=yes,toolbar=yes,centerscreen=yes,modal=no,dependent=no,dialog=no');
		},

		showColorPick: function() {
			var color;
			var returnValues = { selectedColor: null};
			window.openDialog('chrome://bbcodextra/content/bbcodextraPickColor.xul', '_blank', 'chrome,dialog,modal,centerscreen', returnValues);
			if (returnValues.selectedColor == "ok") {
				color=bbcodextraPrefs.copyUnicharPref("extensions.bbcodextra.bbcodecolor");
				bbcodextra.bbcodextra('color', color);
			}
		},

		/*************************
			Main functions
		 *************************/

		promptWindow: function (str){
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
									.getService(Components.interfaces.nsIPromptService);
			var result = {value:null};
			promptService.prompt(null, "BBCodeXtra", str, result, null, {value:0});
			return result.value;
		},

		bbcodextra: function(myCommand, extraParam) {
				/*
					Code reference for clipboard
					https://developer.mozilla.org/it/docs/Using_the_Clipboard#Pasting_Clipboard_Contents
				*/

				var nsTransferable = Components.Constructor(
					"@mozilla.org/widget/transferable;1",
					"nsITransferable"
				);

				function Transferable(source) {
					var res = nsTransferable();
					if ('init' in res) {
						if (source instanceof Ci.nsIDOMWindow)
							source = source.QueryInterface(Ci.nsIInterfaceRequestor)
										.getInterface(Ci.nsIWebNavigation);
						res.init(source);
					}
					return res;
				}

				var widgetTransferable = Transferable();
				widgetTransferable.addDataFlavor("text/unicode");

				try {
					Services.clipboard.getData(
						widgetTransferable,
						Services.clipboard.kGlobalClipboard
					);
				} catch(e) {
					console.log("Error getting content from clipboard: " + e);
					return false;
				}

				// At this point widgetTransferable contains clipboard's content

				var strSelected = null;
				var strClipboard = {};
				var strClipboardString;
				var strLength = {};
				try {
					widgetTransferable.getTransferData("text/unicode", strClipboard, strLength);

					if (strClipboard){
						strClipboard = strClipboard.value.QueryInterface(Components.interfaces.nsISupportsString);
					}
					if (strClipboard){
						strClipboardString = strClipboard.data;
					}
				} catch (e) {
					//alert("No text in the clipboard, please copy something first.");
				}

				var theBox = document.commandDispatcher.focusedElement;
				var oPosition = theBox.scrollTop;
				var oHeight = theBox.scrollHeight;
				if (theBox.value) {
					// Get selected text and store it in strSelected
					var startPos = theBox.selectionStart;
					var endPos = theBox.selectionEnd;
					strSelected = theBox.value.substring(startPos, endPos);
				} else {
					// For contenteditable elements
					var focusedWindow = document.commandDispatcher.focusedWindow;
					strSelected = focusedWindow.getSelection().toString();
				}
				bbcodextra.insertAtCursorSetup(myCommand, strClipboardString, strSelected, theBox, extraParam);
				var nHeight = theBox.scrollHeight - oHeight;
				theBox.scrollTop = oPosition + nHeight;
		},

		insertAtCursorSetup: function(myCommand, strClipboard, strSelected, theBox, extraParam) {
			/*
			Function taken from http://www.alexking.org/blog/2003/06/02/inserting-at-the-cursor-using-javascript/
			Modified to return cursor to correct place
			extraParam is used only for color function
			*/

			// Variables for wizards
			var composeURL = null;
			var composeURLname = null;

			// Variable for quotes
			var author = null;

			// Value obtained from a prompt (user)
			var strPrompt = null;

			// Variables for localized JS strings
			var strInsAuthor = localizedStrings.getString("INS_AUTHOR");
			var strInsLinkName = localizedStrings.getString("INS_LINKNAME");
			var strInsFontSize = localizedStrings.getString("INS_FONTSIZE");
			var strInsFontColor = localizedStrings.getString("INS_FONTCOLOR");
			var strInsThreadNum = localizedStrings.getString("INS_THREADNUM");
			var strInsPostNum = localizedStrings.getString("INS_POSTNUM");
			var strComposeURLStep1 = localizedStrings.getString("URLCOMPOSTO_STEP1");
			var strComposeURLStep2 = localizedStrings.getString("URLCOMPOSTO_STEP2");

			switch (myCommand){
				case "custom":
					var customAction = unescape(extraParam);
					// Replace globally _clipboard_ with strClipboard
					customAction=customAction.replace(/_clipboard_/g, strClipboard);
					// Replace globally _selection_ with strSelected
					customAction=customAction.replace(/_selection_/g, strSelected);
					// Insert string
					bbcodextra.insertAtCursor(customAction);
				break;

				case "quoteclip":
				author = bbcodextra.promptWindow(strInsAuthor);
					if (author!==null) {
						if (author==="") {
							bbcodextra.insertAtCursor("[quote]" + strClipboard + "[/quote]");
						} else {
							bbcodextra.insertAtCursor("[quote=\"" + author + "\"]" + strClipboard + "[/quote]");
						}
					}
				break;

				case "quote":
					author = bbcodextra.promptWindow(strInsAuthor);
					if (author!==null) {
						if (author==="") {
							bbcodextra.insertAtCursor("[quote]" + strSelected + "[/quote]");
						} else {
							bbcodextra.insertAtCursor("[quote=\"" + author + "\"]" + strSelected + "[/quote]");
						}
					}
				break;

				case "img":
					bbcodextra.insertAtCursor("[img]" + strSelected + "[/img]");
				break;

				case "imgclip":
					bbcodextra.insertAtCursor("[img]" + strClipboard + "[/img]");
				break;

				case "codeclip":
					bbcodextra.insertAtCursor("[code]" + strClipboard + "[/code]");
				break;

				case "urltag":
					bbcodextra.insertAtCursor("[url]" + strSelected + "[/url]");
				break;

				case "urltagname":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[url=" + strSelected + "]" + strPrompt + "[/url]");
					}
				break;

				case "url":
					bbcodextra.insertAtCursor("[url]" + strClipboard + "[/url]");
				break;

				case "urlclip":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[url=" + strClipboard + "]" + strPrompt + "[/url]");
					}
				break;

				case "urlselection":
					bbcodextra.insertAtCursor("[url=" + strClipboard + "]" + strSelected + "[/url]");
				break;

				case "composeurl":
				composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
				if (composeURLname!==null) {
					composeURL = bbcodextra.promptWindow(strComposeURLStep2);
					if (composeURL!==null) {
						bbcodextra.insertAtCursor("[url=" + composeURL + "]" + composeURLname + "[/url]");
					}
				}
				break;

				case "bold":
					bbcodextra.insertAtCursor("[b]" + strSelected + "[/b]");
				break;

				case "list":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "bbcode"));
				break;

				case "listord":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "bbcodeord"));
				break;

				case "listalpha":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "bbcodeordalf"));
				break;

				case "listclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "bbcode"));
				break;

				case "listclipord":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "bbcodeord"));
				break;

				case "listclipalpha":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "bbcodeordalf"));
				break;

				case "italic":
					bbcodextra.insertAtCursor("[i]" + strSelected + "[/i]");
				break;

				case "underline":
					bbcodextra.insertAtCursor("[u]" + strSelected + "[/u]");
				break;

				case "code":
					bbcodextra.insertAtCursor("[code]" + strSelected + "[/code]");
				break;

				case "size":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsFontSize);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[size=" + strPrompt + "]" + strSelected + "[/size]");
					}
				break;

				case "color":
					bbcodextra.insertAtCursor("[color=" + extraParam + "]" + strSelected + "[/color]");
				break;

				// VBULLETIN SECTION

				case "vbulthread":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsThreadNum);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[thread=" + strPrompt + "]" + strSelected + "[/thread]");
					}
				break;

				case "vbulpost":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsPostNum);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[post=" + strPrompt + "]" + strSelected + "[/post]");
					}
				break;

				case "vbulleft":
					bbcodextra.insertAtCursor("[left]" + strSelected + "[/left]");
				break;

				case "vbulright":
					bbcodextra.insertAtCursor("[right]" + strSelected + "[/right]");
				break;

				case "vbulcenter":
					bbcodextra.insertAtCursor("[center]" + strSelected + "[/center]");
				break;

				case "vbulindent":
					bbcodextra.insertAtCursor("[indent]" + strSelected + "[/indent]");
				break;

				case "vbulhighlight":
					bbcodextra.insertAtCursor("[highlight]" + strSelected + "[/highlight]");
				break;

				// HTML SECTION

				case "htmlbold":
					bbcodextra.insertAtCursor("<b>" + strSelected + "</b>");
				break;

				case "htmlitalic":
					bbcodextra.insertAtCursor("<i>" + strSelected + "</i>");
				break;

				case "htmlunderline":
					bbcodextra.insertAtCursor("<u>" + strSelected + "</u>");
				break;

				case "htmlimg":
					bbcodextra.insertAtCursor("<img src=\"" + strSelected + "\">");
				break;

				case "htmlimgclip":
					bbcodextra.insertAtCursor("<img src=\"" + strClipboard + "\">");
				break;

				case "htmlstrike":
					bbcodextra.insertAtCursor("<s>" + strSelected + "</s>");
				break;


				// XHTML SECTION

				case "xhtmlbold":
					bbcodextra.insertAtCursor("<strong>" + strSelected + "</strong>");
				break;

				case "xhtmlitalic":
					bbcodextra.insertAtCursor("<em>" + strSelected + "</em>");
				break;

				case "xhtmlunderline":
					bbcodextra.insertAtCursor("<ins>" + strSelected + "</ins>");
				break;

				case "xhtmlimg":
					bbcodextra.insertAtCursor("<img src=\"" + strSelected + "\" />");
				break;

				case "xhtmlimgclip":
					bbcodextra.insertAtCursor("<img src=\"" + strClipboard + "\" />");
				break;

				case "xhtmlstrike":
					bbcodextra.insertAtCursor("<del>" + strSelected + "</del>");
				break;

				// COMMON HTML/XHTML FUNCTIONS

				case "xhtmlurltag":
					bbcodextra.insertAtCursor("<a href=\"" + strSelected + "\">" + strSelected + "</a>");
				break;

				case "xhtmlquoteclip":
					bbcodextra.insertAtCursor("<blockquote>" + strClipboard + "</blockquote>");
				break;

				case "xhtmlcodeclip":
					bbcodextra.insertAtCursor("<code>" + strClipboard + "</code>");
				break;

				case "xhtmlquote":
					bbcodextra.insertAtCursor("<blockquote>" + strSelected + "</blockquote>");
				break;

				case "xhtmlcode":
					bbcodextra.insertAtCursor("<code>" + strSelected + "</code>");
				break;

				case "xhtmlurl":
					bbcodextra.insertAtCursor("<a href=\"" + strClipboard + "\">" + strClipboard + "</a>");
				break;

				case "xhtmlurlclip":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("<a href=\"" + strClipboard + "\">" + strPrompt + "</a>");
					}
				break;

				case "xhtmlurlselection":
					bbcodextra.insertAtCursor("<a href=\"" + strClipboard + "\">" + strSelected + "</a>");
				break;

				case "xhtmlurltagname":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("<a href=\"" + strSelected + "\">" + strPrompt + "</a>");
					}
				break;

				case "xhtmlcomposeurl":
					composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
					if (composeURLname!==null) {
						composeURL = bbcodextra.promptWindow(strComposeURLStep2);
						if (composeURL!==null) {
							bbcodextra.insertAtCursor("<a href=\"" + composeURL + "\">" + composeURLname + "</a>");
						}
					}
				break;

				case "xhtmllist":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "html"));
				break;

				case "xhtmllistord":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "htmlord"));
				break;

				case "xhtmllistalpha":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "htmlordalf"));
				break;

				case "xhtmllistclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "html"));
				break;

				case "xhtmllistordclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "htmlord"));
				break;

				case "xhtmllistalphaclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "htmlordalf"));
				break;

				// MARKDOWN FUNCTIONS

				case "markdownquoteclip":
					bbcodextra.insertAtCursor("> " + strClipboard);
				break;

				case "markdowncodeclip":
					bbcodextra.insertAtCursor(bbcodextra.markdownCode(strClipboard));
				break;

				case "markdownlistclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "markdown"));
				break;

				case "markdownlistordclip":
					bbcodextra.insertAtCursor(bbcodextra.createList(strClipboard, "markdownord"));
				break;

				case "markdownurlselection":
					bbcodextra.insertAtCursor("[" + strSelected + "](" + strClipboard + ")");
				break;

				case "markdownurlclip":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[" + strClipboard + "](" + strPrompt + ")");
					}
				break;

				case "markdownquote":
					bbcodextra.insertAtCursor("> " + strSelected);
				break;

				case "markdowncode":
					bbcodextra.insertAtCursor(bbcodextra.markdownCode(strSelected));
				break;

				case "markdownlist":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "markdown"));
				break;

				case "markdownlistord":
					bbcodextra.insertAtCursor(bbcodextra.createList(strSelected, "markdownord"));
				break;

				case "markdowntagname":
					strPrompt = null;
					strPrompt = bbcodextra.promptWindow(strInsLinkName);
					if (strPrompt!==null) {
						bbcodextra.insertAtCursor("[" + strPrompt + "](" + strSelected + ")");
					}
				break;

				case "markdowncomposeurl":
					composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
					if (composeURLname!==null) {
						composeURL = bbcodextra.promptWindow(strComposeURLStep2);
						if (composeURL!==null) {
							bbcodextra.insertAtCursor("[" + composeURLname + "](" + composeURL + ")");
						}
					}
				break;

				case "markdownbold":
					bbcodextra.insertAtCursor("**" + strSelected + "**");
				break;

				case "markdownitalic":
					bbcodextra.insertAtCursor("*" + strSelected + "*");
				break;

				case "markdownstrike":
					bbcodextra.insertAtCursor("~~" + strSelected + "~~");
				break;

				default :
					alert("No function selected");
				} //end switch
		},

		insertAtCursor: function(aText) {
			// Code reference: http://kb.mozillazine.org/index.phtml?title=Dev_:_Tips_:_Inserting_text_at_cursor
			try {
				var command = "cmd_insertText";
				var controller = document.commandDispatcher.getControllerForCommand(command);
				if (controller && controller.isCommandEnabled(command)) {
					controller = controller.QueryInterface(Components.interfaces.nsICommandController);
					var params = Components.classes["@mozilla.org/embedcomp/command-params;1"];
					params = params.createInstance(Components.interfaces.nsICommandParams);
					params.setStringValue("state_data", aText);
					controller.doCommandWithParams(command, params);
				}
			} catch (e) {
				alert("Error: "+e);
			}
		},

		createList: function(originalText, listType) {
			var startBlock, endBlock, startItem, endItem, formattedText;

			// Make sure only \n is used as line ending
			originalText = originalText.replace(/[\r|\n|\r\n]/g, '\n');
			// Split lines based on \n
			lines = originalText.split("\n");
			// Ignore empty lines
			lines = lines.filter(function(n){
				return n !== "";
			});

			switch (listType) {
				case "bbcode":
					startBlock = "[list]\n";
					startItem = "[*]";
					endItem = "\n";
					endBlock = "[/list]";
				break;
				case "bbcodeord":
					startBlock = "[list=1]\n";
					startItem = "[*]";
					endItem = "\n";
					endBlock = "[/list]";
				break;
				case "bbcodeordalf":
					startBlock = "[list=a]\n";
					startItem = "[*]";
					endItem = "\n";
					endBlock = "[/list]";
				break;
				case "html":
					startBlock = "<ul>\n";
					startItem = "<li>";
					endItem = "</li>\n";
					endBlock = "</ul>";
				break;
				case "htmlord":
					startBlock = "<ol>\n";
					startItem = "<li>";
					endItem = "</li>\n";
					endBlock = "</ol>";
				break;
				case "htmlordalf":
					startBlock = "<ol type=a>\n";
					startItem = "<li>";
					endItem = "</li>\n";
					endBlock = "</ol>";
				break;
				case "markdown":
					startBlock = endBlock = "";
					startItem = "- ";
					endItem = "\n";
				break;
				case "markdownord":
					startBlock = endBlock = "";
					startItem = "";
					endItem = "\n";
				break;
				default:
					startBlock = "";
					startItem = "";
					endItem = "\n";
					endBlock = "";
				break;
			}

			formattedText = startBlock;
			for (var i = 0; i<lines.length; i++) {
				if (listType == "markdownord") {
					var linenumber = i + 1;
					formattedText += linenumber + ". " + lines[i] + endItem;
				} else {
					formattedText += startItem + lines[i] + endItem;
				}
			}
			formattedText += endBlock;

			return formattedText;
		},

		markdownCode: function(originalText) {
			var codeblock = "";
			var multiline = /[\r|\n|\r\n]/g;

			if (multiline.test(originalText)) {
				// Multiline
				codeblock = "```\n" + originalText + "\n```\n";
			} else {
				codeblock = "```" + originalText + "```";
			}

			return codeblock;
		},

	};
} // if ("undefined" == typeof(bbcodextra))

window.addEventListener('load', bbcodextra.init, false);
window.addEventListener('unload', bbcodextra.quit, false);

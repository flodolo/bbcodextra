if ("undefined" == typeof(bbcodextra)) {
	var bbcodextra = {
		/************************* 
			Init and Quit function
		 *************************/
		
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

		/************************* 
			Color functions used in bbcodextraPickColor.xul
		 *************************/	

		loadColor: function(){          
			var colorPrefs = nsPreferences;
			//Set color to last used value			
			document.getElementById('colorSelector').color = colorPrefs.copyUnicharPref("extensions.bbcodextra.bbcodecolor");
			document.getElementById('selectedColor').style.backgroundColor = colorPrefs.copyUnicharPref("extensions.bbcodextra.bbcodecolor"); 
	  	},

		saveColor: function(){          		
			// Save selected color in a preference			
			bbcodextraPrefs.setUnicharPref("extensions.bbcodextra.bbcodecolor", document.getElementById('colorSelector').color);
			var returnValues = window.arguments[0];
			returnValues.selectedColor = "ok";
	  	},	


		/**********************
		Preferences window
		***********************/

		prefWindowEnableButtons: function(){
			// Enable Edit and Delete buttons only if an item is selected
			document.getElementById("btnEdit").setAttribute("disabled", false);
			document.getElementById("btnDelete").setAttribute("disabled", false);	

			var listAvailableCustomTags = document.getElementById("listAvailableCustomTags");
			if (listAvailableCustomTags.currentIndex==0) {
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
			var nextTagIndex = availableCustomTags+1;

			var params = {inn:{tagLabel:"", tagAction:"", windowTitle:localizedStrings.getString("WINDOWTITLE_NEWCUSTOMTAG")}, out:null};       
			window.openDialog("chrome://bbcodextra/content/bbcodextraCustomTag.xul", "",
			"chrome, dialog, modal, resizable=yes", params).focus();

			if (params.out) {
				// Create pref using values passed from dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+nextTagIndex+'.label',params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+nextTagIndex+'.action',params.out.tagAction);	

				// Increment available customtags. No need to update the label, since I will call prefWindowRefreshCustomPane() at the end;			
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags+1);

				// Update displayed information
				bbcodextra.prefWindowRefreshCustomPane();
			}
		},

		prefWindowEditTag: function(){
			// I need to read pref values for this custom tag
			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;
			var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label'));
			var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action'));

			var params = {inn:{tagLabel:itemLabel, tagAction:itemAction, windowTitle:localizedStrings.getString("WINDOWTITLE_EDITCUSTOMTAG")}, out:null};       
			window.openDialog("chrome://bbcodextra/content/bbcodextraCustomTag.xul", "",
			"chrome, dialog, modal, resizable=yes", params).focus();

			if (params.out) {
				// Change existing pref using values passed for dialog
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label',params.out.tagLabel);
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action',params.out.tagAction);	

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
				var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;

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
				bbcodextraPrefs.setIntPref('extensions.bbcodextra.customtags', availableCustomTags-1);

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
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+i+'.label',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+nextTagIndex+'.label')));
				bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+i+'.action',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+nextTagIndex+'.action')));
			}
			// Still need to remove the last one (i)
			var prefsToDelete=Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("extensions.bbcodextra.");	
			prefsToDelete.deleteBranch('custom'+i);
		},

		prefWindowMoveUp: function(){
			// Move up: exchange tag[n] with tag[n-1]

			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;
			var previousTag = currentTag-1;

			//  Store tag[n] before overwriting
			var existingLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+previousTag+'.label'));
			var existingAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+previousTag+'.action'));

			// tag[n-1]=tag[n]
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+previousTag+'.label',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label')));
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+previousTag+'.action',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action')));

			// tag[n]=stored values
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label',existingLabel);
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action',existingAction);

			// Update displayed info
			bbcodextra.prefWindowRefreshCustomPane();
		},

		prefWindowMoveDown: function(){
			// Move down: exchange tag[n] with tag[n+1]

			var currentTag = document.getElementById("listAvailableCustomTags").currentIndex+1;
			var nextTag = currentTag+1;

			//  Store tag[n] before overwriting
			var existingLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+nextTag+'.label'));
			var existingAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+nextTag+'.action'));

			// tag[n+1]=tag[n]
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+nextTag+'.label',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label')));
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+nextTag+'.action',unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action')));

			// tag[n]=stored values
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.label',existingLabel);
			bbcodextraPrefs.setUnicharPref('extensions.bbcodextra.custom'+currentTag+'.action',existingAction);

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
					var itemLabel = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom'+i+'.label'));
					var itemAction = unescape(nsPreferences.copyUnicharPref('extensions.bbcodextra.custom'+i+'.action'));

					var listItem = document.createElement("listitem");
					listItem.setAttribute("label", itemLabel);
					listAvailableCustomTags.appendChild(listItem);
				}
			}	

			// Nothing should be selected
			listAvailableCustomTags.currentIndex = -1;

			// Disable all buttons except "Add…"
			document.getElementById("btnEdit").setAttribute("disabled", true);
			document.getElementById("btnDelete").setAttribute("disabled", true);
			document.getElementById("btnMoveDown").setAttribute("disabled", true);
			document.getElementById("btnMoveUp").setAttribute("disabled", true);
		},

		prefWindowSetVBulletinStatus: function(){
			document.getElementById("bbcodextra-enable-vbulletin").disabled = document.getElementById("bbcodextra-enable-bbcode").checked;	        
		},

		/**********************
		Custom tag window
		***********************/

		customTagWindowLoad: function(){
			// If I'm changing an existing custom tag, I need to load existing values
			document.getElementById("tagLabel").value = window.arguments[0].inn.tagLabel;
			document.getElementById("tagAction").value = window.arguments[0].inn.tagAction;	
			// Setting up window title according to action (edit/new)
			document.title = window.arguments[0].inn.windowTitle;		
		},

		customTagWindowConfirm: function(){
			window.arguments[0].out = {tagLabel:document.getElementById("tagLabel").value,
			tagAction:document.getElementById("tagAction").value};
			return true;	
		},

		/************************* 
			Menu functions
		 *************************/

		showHide: function() {
			var enableBBCodeMenu, enableVBulletinMenu, enableHtmlMenu, enableXhtmlMenu, enableCustomMenu;

			// Read pref values to determine which menus are enabled and should be displayed
			enableBBCodeMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.bbcodemenu");
			enableHtmlMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.htmlmenu");
			enableXhtmlMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.xhtmlmenu");
			enableVBulletinMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.bbcodevbulletinmenu");	
			enableCustomMenu = bbcodextraPrefs.getBoolPref("extensions.bbcodextra.custommenu")

			if(enableBBCodeMenu){
	      		document.getElementById('context-bbcodextra-bbcode').hidden = document.getElementById('context-undo').hidden;
				// VBulletin is displayed only if BBCode menu is enabled
				if(enableVBulletinMenu){
	      	    	document.getElementById('context-bbcodextra-vbulletinmenu').hidden = document.getElementById('context-undo').hidden;
	    	        }
				else{
	      	       document.getElementById('context-bbcodextra-vbulletinmenu').hidden = true;
	    	        }				    
	    	 }else{
	      	    document.getElementById('context-bbcodextra-bbcode').hidden = true;
			}		

			if(enableHtmlMenu){
				document.getElementById('context-bbcodextra-html').hidden = document.getElementById('context-undo').hidden;;
	    	}else{
	      		document.getElementById('context-bbcodextra-html').hidden = true;
	    	}

			if(enableXhtmlMenu){
				document.getElementById('context-bbcodextra-xhtml').hidden = document.getElementById('context-undo').hidden;
			}else{
				document.getElementById('context-bbcodextra-xhtml').hidden = true;
	    	}

			if(enableCustomMenu){
				document.getElementById('context-bbcodextra-custom').hidden = document.getElementById('context-undo').hidden;;
	    	}else{
	      		document.getElementById('context-bbcodextra-custom').hidden = true;
	    	}
		},

		disableMenu: function (idPref) {		
			// Set idPref to false
			bbcodextraPrefs.setBoolPref("extensions.bbcodextra."+idPref,false);
		},

	    displayCustomMenu: function () {
			var availableCustomTags = bbcodextraPrefs.getIntPref('extensions.bbcodextra.customtags');
			var containerMenu = document.getElementById("context-bbcodextra-custom-container");

			while (containerMenu.hasChildNodes()) {
				containerMenu.removeChild(containerMenu.firstChild);
			}

			if (availableCustomTags > 0) {
				// Add custom tags  
				for (i=1; i<=availableCustomTags; i++) {
					var menuLabel = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+i+'.label'));
					var menuAction = unescape(bbcodextraPrefs.copyUnicharPref('extensions.bbcodextra.custom'+i+'.action'));

					var menuItem = document.createElement("menuitem");
					menuItem.setAttribute("label", menuLabel);
					menuItem.setAttribute("id", "bbcodextra-custom-item" + i);
					menuItem.setAttribute("index", i);
					menuItem.setAttribute("oncommand", "bbcodextra.bbcodextra('custom','"+escape(menuAction)+"');");
					containerMenu.appendChild(menuItem);
				}
			} else {			
				// No custom tags defined
				var i=2;
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", localizedStrings.getString("MENU_NO_CUSTOM_TAGS"));
				menuItem.setAttribute("id", "bbcodextra-custom-item-empty");
				menuItem.setAttribute("index", i);
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
			menuItem.setAttribute("oncommand", "bbcodextra.disableMenu('custommenu',null);");
			menuItem.setAttribute("index", ++i);
			containerMenu.appendChild(menuItem);

			menuItem = document.createElement("menuitem");
			menuItem.setAttribute("label", localizedStrings.getString("MENU_SETTINGS"));
			menuItem.setAttribute("class", "menuitem-iconic menu-iconic icon-bbcodextraPrefs");		
			menuItem.setAttribute("id", "&bbcodextra.settingsmenu;");
			menuItem.setAttribute("oncommand", "bbcodextra.showPreferences();");
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

		bbcodextra: function(myCommand,extraParam) { 	
				/*
				Code reference for clipboard
				http://www.expressnewsindia.com/site/jabalpur/8_4%20-%20Using%20the%20Clipboard.htm
				*/
				var widgetClipboard = Components.classes["@mozilla.org/widget/clipboard;1"].createInstance(Components.interfaces.nsIClipboard);
				if (!widgetClipboard){
					return false;
				}

				var widgetTransferable = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
				if (!widgetTransferable){
					return false;
				}		

				widgetTransferable.addDataFlavor("text/unicode");
				try{
					widgetClipboard.getData(widgetTransferable,widgetClipboard.kGlobalClipboard);	
				} catch(e) {
				}			

				// At this point widgetTransferable contains clipboard's content

				var strSelected = null;
				var strClipboard = new Object();
				var strLength = new Object();
				try{
					widgetTransferable.getTransferData("text/unicode",strClipboard,strLength); 

					if (strClipboard){
						strClipboard = strClipboard.value.QueryInterface(Components.interfaces.nsISupportsString);
					}
					if (strClipboard){
						var pastetext = strClipboard.data.substring(0,strLength.value / 2);
					}
				}catch (e){
					//alert("No text in the clipboard, please copy something first.");
				}

				var theBox = document.commandDispatcher.focusedElement;
				var oPosition = theBox.scrollTop;
				var oHeight = theBox.scrollHeight;


	    		// Get selected text and store it in strSelected
	      		var startPos = theBox.selectionStart;
	      		var endPos = theBox.selectionEnd;
	      		strSelected = theBox.value.substring(startPos, endPos);

	    		bbcodextra.insertAtCursorSetup(myCommand, strClipboard, strSelected, theBox, extraParam);
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
			      	if (author!=null) {
			      	 if (author=="") {
			      			bbcodextra.insertAtCursor("[quote]" + strClipboard + "[/quote]");
			    			} else {
					     		bbcodextra.insertAtCursor("[quote=\""+ author +"\"]" + strClipboard + "[/quote]");
			  				}
	         	 }
			    break;

	      		case "quote":
			        author = bbcodextra.promptWindow(strInsAuthor);
		   		    if (author!=null) {
				       if (author=="") {
	    			        bbcodextra.insertAtCursor("[quote]" + strSelected + "[/quote]");
	    					} else {
					     		bbcodextra.insertAtCursor("[quote=\""+ author +"\"]" + strSelected + "[/quote]");
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
		       		if (strPrompt!=null) {	bbcodextra.insertAtCursor("[url=" + strSelected + "]" + strPrompt + "[/url]"); };
	        	break;

	    	  	case "url":
	        		bbcodextra.insertAtCursor("[url]" + strClipboard + "[/url]");
	        	break;

	      		case "urlclip":
	        		strPrompt = null;
		       		strPrompt = bbcodextra.promptWindow(strInsLinkName);
			      	if (strPrompt!=null) { bbcodextra.insertAtCursor("[url=" + strClipboard + "]" + strPrompt + "[/url]"); }
	         	break;

			    case "urlselection":
	        		bbcodextra.insertAtCursor("[url=" + strClipboard + "]" + strSelected + "[/url]");
	        	break;

		  	    case "composeurl":			
				      composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
				      if (composeURLname!=null) {
						       composeURL = bbcodextra.promptWindow(strComposeURLStep2);
							     if (composeURL!=null) { bbcodextra.insertAtCursor("[url=" + composeURL + "]" + composeURLname + "[/url]");}
							   }  
	        	break;

	      		case "bold":
	        		bbcodextra.insertAtCursor("[b]" + strSelected + "[/b]");
	        	break;

	      		case "list":
	        		bbcodextra.insertAtCursor("[list]\n[*]" + bbcodextra.replace_CR(strSelected,"[*]*") + "\n[/list]");
	        	break;

			    case "listord":
	        		bbcodextra.insertAtCursor("[list=1]\n[*]" + bbcodextra.replace_CR(strSelected,"[*]*") + "\n[/list]");
	        	break;

		       	case "listalpha":
	        		bbcodextra.insertAtCursor("[list=a]\n[*]" + bbcodextra.replace_CR(strSelected,"[*]*") + "\n[/list]");
	        	break;

	      		case "listclip":       
	        		bbcodextra.insertAtCursor("[list]\n[*]" + bbcodextra.replace_CR(strClipboard,"[*]*") + "\n[/list]");
	        	break; 

		      	case "listclipord":
	        		bbcodextra.insertAtCursor("[list=1]\n[*]" + bbcodextra.replace_CR(strClipboard,"[*]*") + "\n[/list]");
	        	break;

			    case "listclipalpha":
	        		bbcodextra.insertAtCursor("[list=a]\n[*]" + bbcodextra.replace_CR(strClipboard,"[*]*") + "\n[/list]");
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
				      if (strPrompt!=null) { bbcodextra.insertAtCursor("[size=" + strPrompt + "]" + strSelected + "[/size]"); }
	        	break;

	      		case "color":
	        		bbcodextra.insertAtCursor("[color=" + extraParam + "]" + strSelected + "[/color]");
	        	break;

		     	//VBULLETIN SECTION

	      		case "vbulthread":
	        		strPrompt = null;
				    strPrompt = bbcodextra.promptWindow(strInsThreadNum);
				    if (strPrompt!=null) { bbcodextra.insertAtCursor("[thread=" + strPrompt + "]" + strSelected + "[/thread]"); }
	        	break;

			    case "vbulpost":
	        		strPrompt = null;
				    strPrompt = bbcodextra.promptWindow(strInsPostNum);        		
				    if (strPrompt!=null) { bbcodextra.insertAtCursor("[post=" + strPrompt + "]" + strSelected + "[/post]"); }
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

				//HTML SECTION	

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


				//XHTML SECTION

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

				//COMMON HTML/XHTML FUNCTIONS

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

			      case "xhtmlurl":
	        		bbcodextra.insertAtCursor("<a href=\""+strClipboard+"\">"+strClipboard +"</a>");
	        	break;

	      		case "xhtmlurlclip":
	        		strPrompt = null;
				    strPrompt = bbcodextra.promptWindow(strInsLinkName); 
				    if (strPrompt!=null) { bbcodextra.insertAtCursor("<a href=\""+strClipboard+"\">" + strPrompt +"</a>"); }
	        	break;

			    case "xhtmlurlselection":
	        		bbcodextra.insertAtCursor("<a href=\""+strClipboard+"\">" + strSelected + "</a>");
	        	break;

			    case "xhtmlurltagname":
	        		strPrompt = null;
				    strPrompt = bbcodextra.promptWindow(strInsLinkName); 
				    if (strPrompt!=null) { bbcodextra.insertAtCursor("<a href=\"" + strSelected + "\">" + strPrompt + "</a>"); }
	        	break;		

			    case "xhtmlcomposeurl":
		    	    composeURLname = bbcodextra.promptWindow(strComposeURLStep1);
	             	if (composeURLname!=null) { 
						    composeURL = bbcodextra.promptWindow(strComposeURLStep2);			
		    				if (composeURL!=null) { bbcodextra.insertAtCursor("<a href=\""+composeURL+"\">"+ composeURLname +"</a>"); }
					   }	
	        	break;

			    case "xhtmllist":
	        		bbcodextra.insertAtCursor("<ul>\n<li>" + bbcodextra.htmlreplace_CR(strSelected,"[*]*") + "</li>\n</ul>");
	        	break;

			    case "xhtmllistord":
	        		bbcodextra.insertAtCursor("<ol>\n<li>" + bbcodextra.htmlreplace_CR(strSelected,"[*]*") + "</li>\n</ol>");
	        	break;

			    case "xhtmllistalpha":
	        		bbcodextra.insertAtCursor("<ol type=a>\n<li>" + bbcodextra.htmlreplace_CR(strSelected,"[*]*") + "</li>\n</ol>");
	        	break;				

			    case "xhtmllistclip":
	        		bbcodextra.insertAtCursor("<ul>\n<li>" + bbcodextra.htmlreplace_CR(strClipboard,"[*]*") + "</li>\n</ul>");
	        	break;

			    case "xhtmllistordclip":
	        		bbcodextra.insertAtCursor("<ol>\n<li>" + bbcodextra.htmlreplace_CR(strClipboard,"[*]*") + "</li>\n</ol>");
	        	break;

			    case "xhtmllistalphaclip":
	        		bbcodextra.insertAtCursor("<ol type=a>\n<li>" + bbcodextra.htmlreplace_CR(strClipboard,"[*]*") + "</li>\n</ol>");
	        	break;	

	      		default : alert("No function selected");
	    		}//end switch		
		},


		insertAtCursor: function(aText) {
		/*
			Code reference: http://kb.mozillazine.org/index.phtml?title=Dev_:_Tips_:_Inserting_text_at_cursor
		*/
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
	    		}catch (e) {
	      			alert("Error: "+e);      			
	    		}
	  	}, 


	  	replace_CR: function(myText,replaceWith){
	  		// Code reference for line ending: http://www.jennifermadden.com/162/examples/stringEscape.html

	  		var OS;		

			while ( myText.length > 0 ){
				if (myText.charAt(0) == "\n") {
						myText=myText.substr(1,myText.length);
					}
				else { break; }
			}			

	  		myText = escape(myText);
	  		for(i=0; i<myText.length; i++){
	   			if(myText.indexOf("%0D%0A") > -1){
	   				//Windows encodes returns as \r\n hex
	   				myText=myText.replace("%0D%0A",replaceWith);     
	   				OS="win";
	   				}
	   				else if(myText.indexOf("%0A") > -1){
	   						//Unix encodes returns as \n hex
	   						myText = myText.replace("%0A",replaceWith);     
	   						OS="unix";
	   						}
	   						else if(myText.indexOf("%0D") > -1){
	   							//Machintosh encodes returns as \r hex
	   							myText = myText.replace("%0D",replaceWith);     
	   							OS="mac";
	   							}
	  		}

			// Improve readability of the resulting code
	  		for(i=0; i<myText.length; i++){
	   			if(OS=="win"){   
	   				myText=myText.replace("[*]*","%0D%0A[*]");               
	   				}
	   				else if(OS=="unix"){   
	   					myText=myText.replace("[*]*","%0A[*]");             
	   					}
	   					else if(OS=="mac"){
	   						myText=myText.replace("[*]*","%0D[*]");
	   						}
	  		}     

	  		myText = unescape(myText);		
			// Remove extra "\n[*]" if string comes from clipboard
			while ( myText.length > 0 ){
				if (myText.substr(0,4) == "\n[*]") {
						myText=myText.substr(4,myText.length);
					}
				else { break; }
			}

			// Remove empty lines from list
			while ( myText.length > 0 ){
				if (myText.substr(myText.length-3,myText.length+1) == "[*]") {
						myText=myText.substr(0,myText.length-4);
					}
				else { break; }		
			}	

			// Remove empty items
			while ( myText.length > 0 ){
				if (myText.indexOf("[*]\n") == -1) {
				    break; // no empty items
				  }  else {
					    // Copy string but not the "[*]\n"
					    myText = myText.substr(0,myText.indexOf("[*]\n")) + myText.substr(myText.indexOf("[*]\n")+4,myText.length);		  
				  	  }		
			}			
	  		return myText;
		},	


	  	htmlreplace_CR: function(myText,replaceWith){
			// See replace_CR function for comments
	  		var OS;		

			while ( myText.length > 0 ){
				if (myText.charAt(0) == "\n") {
						myText=myText.substr(1,myText.length);
					}
				else { break; }	
			}		

	  		myText = escape(myText);

	  		for(i=0; i<myText.length; i++){
	   			if(myText.indexOf("%0D%0A") > -1){
	   				//Windows encodes returns as \r\n hex
	   				myText=myText.replace("%0D%0A",replaceWith);     
	   				OS="win";
	   				}
	   				else if(myText.indexOf("%0A") > -1){
	   						//Unix encodes returns as \n hex
	   						myText = myText.replace("%0A",replaceWith);     
	   						OS="unix";
	   						}
	   						else if(myText.indexOf("%0D") > -1){
	   							//Machintosh encodes returns as \r hex
	   							myText = myText.replace("%0D",replaceWith);     
	   							OS="mac";
	   							}
	  		}

	  		for(i=0; i<myText.length; i++){
	   			if(OS=="win"){   
	   				myText=myText.replace("[*]*","</li>%0D%0A<li>");               
	   				}
	   				else if(OS=="unix"){   
	   					myText=myText.replace("[*]*","</li>%0A<li>");             
	   					}
	   					else if(OS=="mac"){
	   						myText=myText.replace("[*]*","</li>%0D<li>");
	   						}
	  		}     

	  		myText = unescape(myText);

			while ( myText.length > 0 ){
				if (myText.substr(0,10) == "</li>\n<li>") {
						myText=myText.substr(10,myText.length);
					}
				else { break; }
			}

			while ( myText.length > 0 ){
				if (myText.substr(myText.length-4,myText.length+1) == "<li>") {
						myText=myText.substr(0,myText.length-10);
					}			
				else { break; }		
			}			

			while ( myText.length > 0 ){
				if (myText.indexOf("<li></li>\n") == -1) {
				    break;
				  }  else {
					    myText = myText.substr(0,myText.indexOf("<li></li>\n")) + myText.substr(myText.indexOf("<li></li>\n")+10,myText.length);		  
				  	  }		
			}	

	  		return myText;
		}
	}    
} // if ("undefined" == typeof(bbcodextra))

window.addEventListener('load', bbcodextra.init, false); 	
window.addEventListener('unload', bbcodextra.quit, false); 	
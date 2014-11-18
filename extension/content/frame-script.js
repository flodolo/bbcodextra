var bbcodextraContent = {
    updateText: function (message) {
        var strSelected = null;
        var strContent = null;
        var textElement = content.document.activeElement;

        // Get selected text and element's content
        if (textElement.contentDocument) {
            // For contenteditable elements
            strSelected = textElement.contentDocument.getSelection().toString();
            strContent = textElement.contentDocument.activeElement.textContent;
        } else {
            // For input/text areas
            var startPos = textElement.selectionStart;
            var endPos = textElement.selectionEnd;
            strSelected = textElement.value.substring(startPos, endPos);
            strContent = textElement.value ? textElement.value : '';
        }

        var response = {
            command: message.data.command,
            extraParams: message.data.extraParams,
            selectedText: strSelected
        };

        var results = sendSyncMessage("bbcodextra:interpret-command", response);
        var elaboratedText = results[0];

        if (textElement.contentDocument) {
            // For contenteditable elements
            textElement.contentDocument.execCommand("insertText", false, elaboratedText);
        } else {
            // For input/text areas
            var oPosition = textElement.scrollTop;
            var oHeight = textElement.scrollHeight;

            var selectionEnd = textElement.selectionStart + elaboratedText.length;
            var beforeText = strContent.substring(0, textElement.selectionStart);
            var afterText = strContent.substring(textElement.selectionEnd, strContent.length);
            textElement.value = beforeText + elaboratedText + afterText;
            textElement.focus();
            textElement.setSelectionRange(selectionEnd, selectionEnd);

            var nHeight = textElement.scrollHeight - oHeight;
            textElement.scrollTop = oPosition + nHeight;
        }
    }
};

addMessageListener("bbcodextra:update-text", bbcodextraContent.updateText);

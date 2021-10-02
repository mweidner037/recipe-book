import { CText } from "@collabs/collabs";

export function connectTextInput(textState: CText, textIn: HTMLInputElement) {
  // Controller -> Model.
  textIn.addEventListener("beforeinput", (e) =>
    textInputHandler(textState, textIn, e)
  );
  // Model -> View.
  setupTextListeners(textState, textIn);
}

/**
 * Event handler for textIn beforeinput event.
 * Translates the event into a corresponding operation on
 * textState.
 */
function textInputHandler(
  textState: CText,
  textIn: HTMLInputElement,
  e: InputEvent
) {
  // Update the backing state when the text changes.
  // Instead of letting the DOM update the text field,
  // we update it ourselves, so that we can capture
  // the intent of the edits in textState.
  e.preventDefault();
  if (textIn.selectionStart === null || textIn.selectionEnd === null) {
    // Not sure if it this is possible, but we will skip
    // just in case.
    return;
  }
  if (e.inputType.startsWith("insert") && e.data !== null) {
    // Delete any selected text, then insert new text.
    textState.delete(
      textIn.selectionStart,
      textIn.selectionEnd - textIn.selectionStart
    );
    textState.insert(textIn.selectionStart, ...e.data);
  } else if (e.inputType.startsWith("delete")) {
    if (textIn.selectionEnd === textIn.selectionStart) {
      // Nothing is selected, delete next character.
      switch (e.inputType) {
        case "deleteContentForward":
          if (textIn.selectionStart < textState.length) {
            textState.delete(textIn.selectionStart);
          }
          break;
        case "deleteContentBackward":
          if (textIn.selectionStart > 0) {
            textState.delete(textIn.selectionStart - 1);
          }
          break;
      }
    } else {
      // Delete the selected text.
      textState.delete(
        textIn.selectionStart,
        textIn.selectionEnd - textIn.selectionStart
      );
    }
  }
}

/**
 * Listens on textState and propagates changes to textIn,
 * being careful to preserve the user's selection.
 */
function setupTextListeners(textState: CText, textIn: HTMLInputElement) {
  textState.on("Insert", (e) => {
    // Record the selection before updating textIn.value,
    // since doing so can mess with their values.
    const oldSelectionStart = textIn.selectionStart;
    const oldSelectionEnd = textIn.selectionEnd;

    textIn.value = textState.toString();
    textIn.selectionStart = oldSelectionStart;
    textIn.selectionEnd = oldSelectionEnd;

    if (e.meta.isLocal) {
      // Move the cursor to handle the local user's typing.
      if (oldSelectionStart !== null) {
        textIn.selectionStart = oldSelectionStart + e.count;
        textIn.selectionEnd = textIn.selectionStart;
      }
    } else {
      // If the insert is before a selection boundary, move
      // the boundary forward.
      if (
        oldSelectionStart !== null &&
        (e.startIndex < oldSelectionStart ||
          (e.startIndex === oldSelectionStart &&
            oldSelectionStart < oldSelectionEnd!))
      ) {
        textIn.selectionStart = oldSelectionStart + e.count;
      }
      if (oldSelectionEnd !== null && e.startIndex < oldSelectionEnd) {
        textIn.selectionEnd = oldSelectionEnd + e.count;
      }
    }
  });
  textState.on("Delete", (e) => {
    // Record the selection before updating textIn.value,
    // since doing so can mess with their values.
    const oldSelectionStart = textIn.selectionStart;
    const oldSelectionEnd = textIn.selectionEnd;

    textIn.value = textState.toString();
    textIn.selectionStart = oldSelectionStart;
    textIn.selectionEnd = oldSelectionEnd;

    if (e.meta.isLocal) {
      // Contract both cursors to the start of the deleted region.
      textIn.selectionStart = e.startIndex;
      textIn.selectionEnd = e.startIndex;
    } else {
      // If the delete is before or crosses a selection
      // boundary, move the boundary backward.
      if (oldSelectionStart !== null && e.startIndex < oldSelectionStart) {
        textIn.selectionStart = Math.max(
          e.startIndex,
          oldSelectionStart - e.count
        );
      }
      if (oldSelectionEnd !== null && e.startIndex < oldSelectionEnd) {
        textIn.selectionEnd = Math.max(e.startIndex, oldSelectionEnd - e.count);
      }
    }
  });
}

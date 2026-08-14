"use client";

// A TYPED VALUE CANNOT BE DRAGGED OUT OF ITS OWN CELL.
//
// Every numeric cell on this surface selects its whole value on focus, which is
// what makes overwriting a figure one keystroke. The cost is that the value is
// then sitting there selected, and a browser lets you pick up selected text
// with the mouse and drop it into any other field on the page. On a grid of
// near-identical columns that is a real hazard: the second half of a click that
// wandered a few pixels silently moves ריבית into מרווח, with no undo and
// nothing on screen to say it happened. Nobody ever means to do it.
//
// So text drags that start inside a field are cancelled at the source, and text
// arriving from outside the page is refused at the field. FILE drags are
// untouched — the credit-report drop is the point of this page (see Bay's
// window listeners, which claim every drop that carries files).

import { useEffect } from "react";

const FIELD = "input, textarea";

const inField = (t: EventTarget | null) => t instanceof Element && !!t.closest(FIELD);

const carriesFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

export function useNoFieldDrag() {
  useEffect(() => {
    // Cancelling dragstart is the whole fix for drags that begin here: the drag
    // never exists, so there is nothing to land anywhere.
    const onDragStart = (e: DragEvent) => {
      if (inField(e.target)) e.preventDefault();
    };

    // Text dragged in from another tab or app still has to be refused at the
    // field itself. A text control accepts such a drop by default, and
    // dropEffect = "none" during dragover is what withdraws that permission —
    // the cursor shows the refusal instead of promising an insertion that the
    // drop handler would then have to undo.
    const onDragOver = (e: DragEvent) => {
      if (carriesFile(e) || !inField(e.target)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    };

    const onDrop = (e: DragEvent) => {
      if (carriesFile(e) || !inField(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, []);
}

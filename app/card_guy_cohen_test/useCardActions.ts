"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { CARD_URL, buildVCard, person } from "./data";

const isApple = () =>
  typeof navigator !== "undefined" && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent);

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API is blocked outside secure contexts — fall back to a hidden field
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

export function useCardActions() {
  const saveContact = useCallback(() => {
    const vcard = buildVCard();
    const href = isApple()
      ? `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`
      : URL.createObjectURL(new Blob([vcard], { type: "text/vcard;charset=utf-8" }));

    const a = document.createElement("a");
    a.href = href;
    a.download = "guy-cohen.vcf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (!isApple()) setTimeout(() => URL.revokeObjectURL(href), 4000);

    toast.success("איש הקשר נשמר", { description: `${person.full} · ${person.phonePretty}` });
  }, []);

  const shareCard = useCallback(async () => {
    const payload = {
      title: `${person.full} · ${person.role}`,
      text: `${person.full}, ${person.role} — ${person.org}`,
      url: CARD_URL,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    if (await copyText(CARD_URL)) toast.success("הקישור לכרטיס הועתק");
    else toast.error("לא הצלחנו להעתיק את הקישור");
  }, []);

  const copyLink = useCallback(async () => {
    if (await copyText(CARD_URL)) toast.success("הקישור לכרטיס הועתק");
    else toast.error("לא הצלחנו להעתיק את הקישור");
  }, []);

  return { saveContact, shareCard, copyLink };
}

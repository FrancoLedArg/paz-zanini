"use client";

import { useState } from "react";

/** Copies the address in `#mail`; where the clipboard isn't available, selects it so the user can copy it. */
export function CopyMail() {
  const [label, setLabel] = useState("Copiar");

  const flash = (text: string) => {
    setLabel(text);
    setTimeout(() => setLabel("Copiar"), 1600);
  };

  const copy = async () => {
    const mail = document.getElementById("mail")!;
    try {
      await navigator.clipboard.writeText(mail.textContent ?? "");
      flash("Copiado");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(mail);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      flash("Seleccionado");
    }
  };

  return <button className="copy" type="button" onClick={copy}>{label}</button>;
}

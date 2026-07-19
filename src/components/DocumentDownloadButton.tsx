import React from "react";
import { Download } from "lucide-react";

type Props = {
  url?: string;
  name: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
};

export default function DocumentDownloadButton({
  url,
  name,
  label = "Download",
  iconOnly = false,
  className = "",
}: Props) {
  const available = Boolean(url && url !== "#");
  const content = (
    <>
      <Download className="h-3.5 w-3.5 shrink-0" />
      {!iconOnly && <span>{label}</span>}
    </>
  );
  const baseClass = `inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors ${
    iconOnly ? "p-1.5" : "px-3 py-1.5 text-[11px]"
  } ${className}`;

  if (!available) {
    return (
      <button
        type="button"
        disabled
        title="O arquivo original não está disponível para download."
        aria-label={`Download indisponível para ${name}`}
        className={`${baseClass} cursor-not-allowed opacity-40`}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={url}
      download={name}
      title={`Baixar ${name}`}
      aria-label={`Baixar ${name}`}
      onClick={(event) => event.stopPropagation()}
      className={`${baseClass} cursor-pointer`}
    >
      {content}
    </a>
  );
}

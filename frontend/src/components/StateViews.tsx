import type { ReactNode } from "react";

export function Loading({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box error" role="alert">
      <strong>Algo deu errado</strong>
      <p>{message}</p>
      {onRetry && (
        <button className="outline-button" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-box">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

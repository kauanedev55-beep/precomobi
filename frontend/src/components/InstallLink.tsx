import { Link, type LinkProps } from "react-router-dom";
import { usePwa } from "../pwa/PwaContext";

// The first tap opens the browser's installer when it is actually available.
// Safari and other unsupported contexts keep the honest help-page destination.
export function InstallLink({ onClick, ...props }: LinkProps) {
  const pwa = usePwa();
  return <Link {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (pwa.pending) { event.preventDefault(); return; }
    if (pwa.canInstall) { event.preventDefault(); void pwa.install(); }
  }} />;
}

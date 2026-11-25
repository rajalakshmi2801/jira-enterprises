/**
 * Jira Enterprises company logo. The file lives in /public/logo.jpg so it
 * can also be used by the favicon and the printable invoice.
 */
export const LOGO_SRC = "/logo.jpg";

export default function Logo({
  className = "",
  alt = "Jira Enterprises - Juice & Water Distribution",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`company-logo ${className}`}
      draggable={false}
    />
  );
}

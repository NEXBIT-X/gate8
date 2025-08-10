"use client";

import Link from "next/link";

const links = [
  { href: "/protected/dash", label: "Dash" },
  { href: "/protected/admin", label: "Admin" },
   { href: "/protected/debug", label: "Debug" },
  { href: "/protected/admin/create", label: "question creation" },
   { href: "/protected/admin/ai-question-import", label: "AI parser" },
];

export function TestLinks() {
  return (
    <nav
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: "0.5rem 0.75rem",
        fontSize: 12,
        background: "var(--accent, #eee)",
        borderBottom: "1px solid var(--border, #ccc)",
      }}
    >
      {links.map(l => (
        <Link
          key={l.href}
            href={l.href}
            style={{ textDecoration: "underline" }}
            prefetch={false}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export default function ProtectedPage() {
  return <TestLinks />;
}

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".public-site");
const require = createRequire(import.meta.url);
// Generate a static app from the canonical promotional page only.
// Management routes, server actions, database code and .env are never copied.
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "app"), { recursive: true });
await mkdir(path.join(output, "public"), { recursive: true });
for (const file of ["page.tsx", "party-experience.tsx", "experience-details.css"]) {
  await cp(path.join(root, "src/app/experiencia", file), path.join(output, "app", file));
}
await cp(path.join(root, "src/app/globals.css"), path.join(output, "app/globals.css"));
await cp(path.join(root, "postcss.config.mjs"), path.join(output, "postcss.config.mjs"));
const assets = [
  "brand/murray-logo-dark.png", "brand/murray-icon-32.png", "brand/murray-icon-180.png",
  "brand/murray-icon-192.png", "brand/murray-icon-512.png",
  "djs/micky.jpg", "djs/maicky.jpg", "djs/paddy.jpg", "djs/luis.jpg",
  "experience-video/hero-micky-party.png", "experience-video/generations-party-hd.png",
];
for (const asset of assets) {
  const target = path.join(output, "public", asset);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, "public", asset), target);
}
await writeFile(path.join(output, "app/layout.tsx"), `import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.murraydjs.com"),
  title: "Murray DJs — La noche empieza acá",
  description: "Dos generaciones haciendo de cada evento una noche para recordar. DJs, sonido e iluminación para fiestas en Buenos Aires.",
  alternates: { canonical: "/" },
  icons: { icon: "/brand/murray-icon-32.png", apple: "/brand/murray-icon-180.png" },
  openGraph: { type: "website", locale: "es_AR", siteName: "Murray DJs", url: "/", images: ["/experience-video/hero-micky-party.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
`);
await writeFile(path.join(output, "next.config.mjs"), 'export default { output: "export", images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true }, poweredByHeader: false };\n');
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
await writeFile(path.join(output, "package.json"), JSON.stringify({ name: "murray-public-site", private: true, dependencies: { next: pkg.dependencies.next, react: pkg.dependencies.react, "react-dom": pkg.dependencies["react-dom"] } }, null, 2));
await writeFile(path.join(output, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", plugins: [{ name: "next" }] }, include: ["next-env.d.ts", "app/**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2));
await writeFile(path.join(output, "public/robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://www.murraydjs.com/sitemap.xml\n");
await writeFile(path.join(output, "public/sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.murraydjs.com/</loc></url></urlset>\n');
// build:public runs the source ESLint check before generation; Next checks generated TypeScript.
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", output], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);

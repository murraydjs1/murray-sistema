import "./globals.css";
export const metadata = { title: "Murray DJs", description: "Gestión de eventos Murray DJs", icons: { icon: "/brand/murray-favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }

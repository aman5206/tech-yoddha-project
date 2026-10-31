import "./globals.css";
import { IBM_Plex_Sans } from "next/font/google";
import { AppProvider } from "../lib/store";
import Shell from "../components/Shell";

const font = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"] });
export const metadata = { title: "AeroGuard AI", description: "Turbofan engine health and remaining useful life" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}><AppProvider><Shell>{children}</Shell></AppProvider></body>
    </html>
  );
}

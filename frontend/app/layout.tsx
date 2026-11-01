import "./globals.css";
import { AppProvider } from "../lib/store";
import Shell from "../components/Shell";

export const metadata = {
  title: "AeroGuard AI — Aerospace Predictive Maintenance & Digital Twin",
  description: "Advanced 3D turbofan engine digital twin, AI predictive maintenance, and RUL analytics by Team Tech Yodhas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}

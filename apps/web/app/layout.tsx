import type { Metadata } from "next";
import { Archivo_Narrow, Courier_Prime, Libre_Caslon_Display, Libre_Caslon_Text } from "next/font/google";
import { Keys } from "@/components/keys";
import { Sala3D } from "@/components/sala-3d/sala-3d";
import "./globals.css";

const display = Libre_Caslon_Display({ weight: "400", subsets: ["latin"], variable: "--font-caslon-display" });
const text = Libre_Caslon_Text({ weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-caslon-text" });
const courier = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-courier" });
const narrow = Archivo_Narrow({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-archivo-narrow" });

export const metadata: Metadata = {
  title: { default: "Archivo Paz Zanini", template: "%s · Archivo Paz Zanini" },
  description: "Manuales para aprender estadística y ciencia de datos desde cero, junto con la producción académica y el expediente de Raúl E. Paz Zanini.",
};

// Runs before paint so a remembered theme never flashes the system one.
const theme = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={[display, text, courier, narrow].map((f) => f.variable).join(" ")} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body>
        {/* Around every page, not just the Sala, so the WebGL context survives navigation. */}
        <Sala3D>
          <div className="os">{children}</div>
        </Sala3D>
        <Keys />
      </body>
    </html>
  );
}

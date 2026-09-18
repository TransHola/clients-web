import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalNetworkErrorGuard } from "@/components/common/GlobalNetworkErrorGuard";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TRANSHOLA • Corporate & Group Charter",
  description: "Enterprise Transport Booking Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var rawCookies = document.cookie.split(';');
                var sbGroups = {};
                for (var i = 0; i < rawCookies.length; i++) {
                  var c = rawCookies[i].trim();
                  var eqIdx = c.indexOf('=');
                  if (eqIdx === -1) continue;
                  var cName = c.substring(0, eqIdx);
                  if (cName.indexOf('sb-') === 0) {
                    var base = cName.replace(/\.\d+$/, '');
                    if (!sbGroups[base]) sbGroups[base] = [];
                    sbGroups[base].push(cName);
                  }
                }
                var isProd = location.hostname.indexOf('transhola.com') !== -1;
                for (var b in sbGroups) {
                  var isDevHostCookie = isProd && (b.indexOf('localhost') !== -1 || b.indexOf('127') !== -1);
                  var chunks = sbGroups[b];
                  if (isDevHostCookie || chunks.length > 3) {
                    for (var k = 0; k < chunks.length; k++) {
                      var targetName = chunks[k];
                      if (isDevHostCookie || k >= 3) {
                        document.cookie = targetName + '=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                        document.cookie = targetName + '=; path=/; domain=' + location.hostname + '; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                        document.cookie = targetName + '=; path=/; domain=.transhola.com; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                      }
                    }
                  }
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body
        className={`${inter.variable} font-sans`}
      >
        <TooltipProvider>
          <GlobalNetworkErrorGuard />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}

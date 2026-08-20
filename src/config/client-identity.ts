/**
 * ==============================================================================
 * CLIENT IDENTITY CONFIGURATION
 * ==============================================================================
 * Konfigurasi utama identitas klien / web.
 * Untuk mengganti klien, cukup ubah nilai di file ini.
 * ==============================================================================
 */

export interface ClientIdentityConfig {
  /** Inisial / Nama singkat brand (misal: "OPS", "ETS") */
  shortName: string;

  /** Nama lengkap sistem / brand (misal: "Operations Tracking System") */
  fullName: string;

  /** Deskripsi / Tagline di samping atau di bawah logo */
  tagline: string[];

  /** Aset Logo */
  logo: {
    src: string;
    alt?: string;
    favicon?: string;
  };

  /** Tema & PWA */
  theme: {
    themeColor: string; // Warna status bar mobile / PWA
    primaryColor?: string;
  };
}

export const CLIENT_IDENTITY: ClientIdentityConfig = {
  shortName: "OPS",
  fullName: "Operations Tracking System",
  tagline: ["ELECTRICITY OPERATIONS", "SYSTEM"],
  logo: {
    src: "/ets-logo.png",
    alt: "OPS Logo",
    favicon: "/favicon.ico",
  },
  theme: {
    themeColor: "#09090b",
    primaryColor: "#10b981",
  },
};

/**
 * Utility untuk menyuntikkan <title>, <meta theme-color>, dan <link rel="icon">
 */
export function applyClientIdentityToDocument(config: ClientIdentityConfig = CLIENT_IDENTITY) {
  if (typeof document === "undefined") return;

  if (config.shortName && !document.title.includes(config.shortName)) {
    document.title = `${config.shortName} - ${config.fullName}`;
  }

  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute("content", config.theme.themeColor);

  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleMeta) {
    appleMeta = document.createElement("meta");
    appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    document.head.appendChild(appleMeta);
  }
  appleMeta.setAttribute("content", "black-translucent");

  if (config.logo.favicon) {
    let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.setAttribute("rel", "icon");
      document.head.appendChild(faviconLink);
    }
    faviconLink.setAttribute("href", config.logo.favicon);
  }
}

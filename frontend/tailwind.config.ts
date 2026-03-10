import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    green: "#00FFA3",
                    greenHover: "#00cc82",
                    blue: "#00B8FF",
                },
                surface: {
                    dark: "#0A0A0A",
                    card: "#141414",
                    glass: "rgba(255, 255, 255, 0.05)",
                    glassBorder: "rgba(255, 255, 255, 0.1)",
                },
                status: {
                    error: "#FF3B30",
                    warning: "#FFCC00",
                    success: "#34C759",
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-cyber": "linear-gradient(135deg, #00FFA3 0%, #00B8FF 100%)",
            },
            dropShadow: {
                "neon-green": "0 0 15px rgba(0, 255, 163, 0.4)",
                "neon-blue": "0 0 15px rgba(0, 184, 255, 0.4)",
            }
        },
    },
    plugins: [],
};
export default config;

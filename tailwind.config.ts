import type { Config } from "tailwindcss";
export default { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { boxShadow: { glow: "0 0 60px rgba(239,68,68,.25)" }, animation: { pulseSlow: "pulse 3s ease-in-out infinite" } } }, plugins: [] } satisfies Config;

import react from '@vitejs/plugin-react'

// vite.config.js
export default {
  base: '/dice-roller/', // replace with your actual GitHub repo name
  server: {
    open: true,
    sourcemap: true
  },
    define: {
      __BUILD_TIME__: JSON.stringify(
          new Date().toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
      )
    },
    plugins: [react()],
};

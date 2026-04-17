import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// ---------------------------------------------------------------------------
// Heartbeat watchdog — apaga el servidor si el browser se cierra
// ---------------------------------------------------------------------------
//
// Patrón: watchdog timer.
//   • Cada ping del browser llama arm(60s) → reinicia el countdown.
//   • Si pasan 60s sin ningún ping (pestaña cerrada) → process.exit(0).
//   • Al arrancar, arm(45s) da tiempo al browser para abrir.
//
// Por qué setTimeout y no setInterval:
//   setInterval corre independientemente del estado del sistema. El watchdog
//   timer se RESETEA en cada ping, así que la lógica es trivial y nunca falla.
//
// Seguridad: Vite + host:127.0.0.1 hacen que el puerto sea invisible fuera
// de esta máquina. Nadie en tu red puede conectarse.
// ---------------------------------------------------------------------------

function heartbeatPlugin(): Plugin {
  const TIMEOUT_MS = 60_000   // 60 s sin ping → apagado
  const GRACE_MS   = 45_000   // 45 s de gracia para que el browser abra

  let timer: ReturnType<typeof setTimeout> | null = null

  /** Arma (o rearma) el watchdog. Si expira sin ser reseteado → shutdown. */
  function arm(ms: number) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      console.log('\n[BassTheory] Sin actividad — apagando servidor.\n')
      process.exit(0)
    }, ms)
  }

  return {
    name: 'heartbeat',
    apply: 'serve',
    configureServer(server) {
      // Arrancar watchdog de gracia — el browser tiene 45 s para conectarse
      arm(GRACE_MS)

      // Cada ping del browser rearma el timer a 60 s
      server.middlewares.use('/__heartbeat', (_req, res) => {
        arm(TIMEOUT_MS)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('ok')
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Botón de apagado manual (⏻ en la app)
// ---------------------------------------------------------------------------
function shutdownPlugin(): Plugin {
  return {
    name: 'shutdown',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shutdown', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('ok')
        setTimeout(() => process.exit(0), 300)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), heartbeatPlugin(), shutdownPlugin()],
  server: {
    host: '127.0.0.1',  // nunca accesible desde la red, solo localhost
    port: 5173,
  },
})

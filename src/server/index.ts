import { handleOpen, handleClose, handleMessage } from './ws';

const ORIGIN = process.env.ORIGIN || 'http://localhost:22222';
const PORT = parseInt(process.env.PORT || '22222', 10);


let svelteHandler: ((req: Request) => Promise<Response>) | null = null;

async function loadSvelteKit() {
    try {
        const { getHandler } = await import('../../build/handler.js');
        const { fetch } = getHandler();
        svelteHandler = fetch;
        console.log('SvelteKit handler loaded');
    } catch (e) {
        console.log('SvelteKit handler not available (run `bun run build` first for production)');
    }
}

loadSvelteKit();

const server = Bun.serve({
    port: PORT,

    async fetch(req, server) {
        const url = new URL(req.url);


        if (url.pathname === '/ws') {
            const success = server.upgrade(req, {
                data: { playerId: null, roomCode: null }
            });
            if (success) return undefined as any;
            return new Response('WebSocket upgrade failed', { status: 500 });
        }


        if (svelteHandler) {
            return svelteHandler(req);
        }

        return new Response('Server running. Build SvelteKit first for the UI.', { status: 200 });
    },

    websocket: {
        open(ws) {
            handleOpen(ws);
        },
        message(ws, message) {
            handleMessage(ws, typeof message === 'string' ? message : new TextDecoder().decode(message));
        },
        close(ws) {
            handleClose(ws);
        }
    }
});

console.log(`🦴 Poetry for Neanderthals server running on port ${PORT}`);
console.log(`   Origin: ${ORIGIN}`);

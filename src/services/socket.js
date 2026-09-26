import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

// The backend serves both the REST API (at .../api) and the socket.io
// endpoint (at its origin), so strip the "/api" suffix to get the socket URL.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket;

// Lazily creates a single shared socket connection, joining the room for the
// logged-in user's company so real-time alerts stay scoped to that company.
export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, { autoConnect: true });

  socket.on('connect', () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    // Rooms are keyed by the company's real ID, not its display name — two
    // companies can't collide the way they could with a name string.
    if (user?.company) {
      socket.emit('join-company', user.company, user._id);
    }
  });

  return socket;
}

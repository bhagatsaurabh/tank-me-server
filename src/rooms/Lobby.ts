import { LobbyRoom } from 'colyseus';
import { auth } from '../config/firebase';

export class Lobby extends LobbyRoom {
  async onAuth(_client: any, options: { accessToken: string }) {
    return await auth.verifyIdToken(options.accessToken);
  }
}

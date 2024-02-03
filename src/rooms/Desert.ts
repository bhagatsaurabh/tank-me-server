import { Room, Client } from "@colyseus/core";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";

import { Player, RoomState } from "./schema/RoomState";
import { auth } from "../config/firebase";

export class Desert extends Room<RoomState> {
  maxClients = 2;

  onCreate(options: any) {
    this.setState(new RoomState());

    this.onMessage("updatePosition", (client, message) => {
      if (this.state.status === "matching") return;

      const player = this.state.players.get(client.sessionId);
      player.x = message.x;
      player.y = message.y;
      player.z = message.z;
    });

    console.log("room", this.roomId, "created!");
  }

  async onAuth(_client: any, options: { accessToken: string }) {
    return await auth.verifyIdToken(options.accessToken);
  }

  onJoin(client: Client, options: any, authData: DecodedIdToken) {
    const player = new Player();
    player.uid = authData.uid;
    const FLOOR_SIZE = 500;
    player.x = -(FLOOR_SIZE / 2) + Math.random() * FLOOR_SIZE;
    player.y = -1;
    player.z = -(FLOOR_SIZE / 2) + Math.random() * FLOOR_SIZE;

    this.state.players.set(client.sessionId, player);
    if (this.state.players.size === this.maxClients) {
      this.state.status = "ready";
    }
    console.log(client.sessionId, "joined!");
  }

  onLeave(client: Client, consented: boolean) {
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId);
      console.log(client.sessionId, "left!");
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}

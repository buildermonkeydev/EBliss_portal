import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { PrismaService } from '../prisma/prisma.service';
import WebSocket from 'ws';
import * as https from 'https';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'console',
})
export class ConsoleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private proxmoxConnections: Map<string, WebSocket> = new Map();

  constructor(
    private proxmoxService: ProxmoxService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    const userId = client.handshake.auth?.userId;
    const token = client.handshake.auth?.token;
    
    console.log('Extracted userId:', userId);
    console.log('Extracted token exists:', !!token);
    
    if (!userId || !token) {
      console.log(`Client ${client.id} missing auth data - disconnecting`);
      client.emit('error', 'Unauthorized: Missing authentication');
      client.disconnect();
      return;
    }
    
    client.data.userId = userId;
    client.data.token = token;
    
    console.log(`Client ${client.id} authenticated with userId: ${userId}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const connection = this.proxmoxConnections.get(client.id);
    if (connection) {
      connection.close();
      this.proxmoxConnections.delete(client.id);
    }
  }

@SubscribeMessage('connect-vm')
async handleConnectVM(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { vmid: number },
) {
  try {
    const userId = client.data.userId;
    if (!userId) { client.emit('error', 'Unauthorized'); return; }

    const vm = await this.prisma.vM.findFirst({
      where: { proxmox_vmid: data.vmid, user_id: parseInt(userId) },
      include: { node: true },
    });
    if (!vm) { client.emit('error', 'VM not found or access denied'); return; }

    const nodeIp = vm.node.ip_address || this.getNodeIp(vm.node.hostname);
    const nodeName = vm.node.hostname;
    const authHeader = `PVEAPIToken=${vm.node.api_token_id}=${vm.node.api_token_secret}`;

    // POST vncproxy with websocket=1 — this is the only WS-compatible endpoint for QEMU
    const vncProxy = await this.proxmoxService.getVNCProxy(nodeName, data.vmid);
    console.log('vncProxy result:', vncProxy);

    // vncwebsocket — correct endpoint for QEMU VMs
    const wsUrl =
      `wss://${nodeIp}:8006/api2/json/nodes/${nodeName}/qemu/${data.vmid}/vncwebsocket` +
      `?port=${vncProxy.port}&vncticket=${encodeURIComponent(vncProxy.ticket)}`;

    console.log(`Connecting to VNC WebSocket: ${wsUrl}`);

    const proxmoxWs = new WebSocket(wsUrl, 'binary', {
      rejectUnauthorized: false,
      handshakeTimeout: 30000,
      headers: { Authorization: authHeader },
    });

    proxmoxWs.on('open', () => {
      console.log(`VNC WebSocket open for VM ${data.vmid}`);
      client.emit('connected');
    });

    proxmoxWs.on('message', (message: Buffer) => {
      // Forward raw VNC binary to frontend — noVNC handles protocol parsing
      client.emit('data', message);
    });

    proxmoxWs.on('error', (error) => {
      console.error(`VNC WS error:`, error.message);
      client.emit('error', `WebSocket error: ${error.message}`);
    });

    proxmoxWs.on('close', (code, reason) => {
      console.log(`VNC disconnected. Code: ${code}`);
      client.emit('disconnected');
    });

    this.proxmoxConnections.set(client.id, proxmoxWs);

  } catch (error) {
    console.error('Failed to connect:', error);
    client.emit('error', error.message || 'Failed to connect');
  }
}

@SubscribeMessage('command')
handleCommand(
  @ConnectedSocket() client: Socket,
  @MessageBody() command: string,
) {
  const connection = this.proxmoxConnections.get(client.id);
  if (connection && connection.readyState === WebSocket.OPEN) {
    // Proxmox term protocol: prefix stdin with "0:"
    connection.send('0:' + command);
  }
}



  private getNodeIp(hostname: string): string {
    const ipMap: Record<string, string> = {
      'host02-yta': '151.158.114.130',
    };
    return ipMap[hostname] || hostname;
  }
}
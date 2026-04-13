import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import WebSocket from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';

interface PendingMessage {
  data: WebSocket.RawData;
  isBinary: boolean;
}

@Injectable()
export class VncProxyService {
  private wss: WebSocket.Server;
  private pairs = new Map<WebSocket, WebSocket>(); // browser ↔ proxmox

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private proxmox: ProxmoxService,
  ) {}

  attach(httpServer: HttpServer) {
    this.wss = new WebSocket.Server({ 
      server: httpServer, 
      path: '/vnc-proxy',
      handleProtocols: (protocols) => {
        // Accept whatever noVNC requests ('binary' typically)
        return protocols.values().next().value || false;
      }
    });

    this.wss.on('connection', (browserWs: WebSocket, req: IncomingMessage) => {
      this.handleConnection(browserWs, req).catch((err) => {
        console.error('[VNC Proxy] Connection failed:', err.message);
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.close(1011, err.message);
        }
      });
    });

    console.log('[VNC Proxy] Attached at /vnc-proxy');
  }

  private async handleConnection(browserWs: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url!, 'http://localhost');
    const vmid = parseInt(url.searchParams.get('vmid') ?? '0');
    const token = url.searchParams.get('token');

    if (!token || !vmid) {
      browserWs.close(1008, 'Missing vmid or token');
      return;
    }

    // Verify JWT
    let userId: number;
    try {
      const payload = this.jwt.verify(token);
      userId = parseInt(payload.sub);
    } catch {
      browserWs.close(1008, 'Invalid or expired token');
      return;
    }

    // Verify VM ownership
    const vm = await this.prisma.vM.findFirst({
      where: { proxmox_vmid: vmid, user_id: userId },
      include: { node: true },
    });
    if (!vm) {
      browserWs.close(1008, 'VM not found or access denied');
      return;
    }

    // Get fresh VNC ticket from Proxmox
    const vncProxy = await this.proxmox.getVNCProxy(vm.node.hostname, vmid);
    const nodeIp = vm.node.ip_address || this.resolveNodeIp(vm.node.hostname);
    const authHeader = `PVEAPIToken=${vm.node.api_token_id}=${vm.node.api_token_secret}`;

    // Correct Proxmox vncwebsocket URL
    const proxmoxWsUrl =
      `wss://${nodeIp}:8006/api2/json/nodes/${vm.node.hostname}/qemu/${vmid}/vncwebsocket` +
      `?port=${vncProxy.port}&vncticket=${encodeURIComponent(vncProxy.ticket)}`;

    console.log(`[VNC Proxy] VM ${vmid}: connecting to Proxmox at ${proxmoxWsUrl}`);

    const proxmoxWs = new WebSocket(proxmoxWsUrl, {
      rejectUnauthorized: false,
      headers: { Authorization: authHeader },
    });

    // Buffer messages from browser until Proxmox is ready
    const pendingMessages: PendingMessage[] = [];

    // Browser → Proxmox (raw binary passthrough with buffering)
    browserWs.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      if (proxmoxWs.readyState === WebSocket.OPEN) {
        proxmoxWs.send(data, { binary: isBinary });
      } else {
        pendingMessages.push({ data, isBinary });
      }
    });

    proxmoxWs.on('open', () => {
      console.log(`[VNC Proxy] VM ${vmid}: Proxmox WebSocket opened`);
      this.pairs.set(browserWs, proxmoxWs);
      
      // Send all pending messages
      for (const msg of pendingMessages) {
        proxmoxWs.send(msg.data, { binary: msg.isBinary });
      }
      pendingMessages.length = 0;
    });

    // Proxmox → Browser (raw binary passthrough)
    proxmoxWs.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(data, { binary: isBinary });
      }
    });

    proxmoxWs.on('error', (err) => {
      console.error(`[VNC Proxy] VM ${vmid} Proxmox error:`, err.message);
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.close(1011, err.message);
      }
    });

    proxmoxWs.on('close', (code, reason) => {
      console.log(`[VNC Proxy] VM ${vmid}: Proxmox closed (${code})`);
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.close();
      }
      this.pairs.delete(browserWs);
    });

    browserWs.on('close', () => {
      console.log(`[VNC Proxy] VM ${vmid}: browser disconnected`);
      if (proxmoxWs.readyState === WebSocket.OPEN) {
        proxmoxWs.close();
      }
      this.pairs.delete(browserWs);
    });

    browserWs.on('error', (err) => {
      console.error(`[VNC Proxy] VM ${vmid} browser error:`, err.message);
      if (proxmoxWs.readyState === WebSocket.OPEN) {
        proxmoxWs.close();
      }
    });
  }

  private resolveNodeIp(hostname: string): string {
    const map: Record<string, string> = {
      'host02-yta': '151.158.114.130',
    };
    return map[hostname] || hostname;
  }
}
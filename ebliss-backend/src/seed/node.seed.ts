import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as https from 'https';

const prisma = new PrismaClient();

async function restoreNodes() {
  try {
    console.log('Starting node restoration...');
    
    const host = process.env.PROXMOX_HOST;
    const port = process.env.PROXMOX_PORT;
    const tokenId = process.env.PROXMOX_TOKEN_ID;
    const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;
    
    const client = axios.create({
      baseURL: `https://${host}:${port}/api2/json`,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'Authorization': `PVEAPIToken=${tokenId}=${tokenSecret}`,
      },
    });
    
    const response = await client.get('/nodes');
    const nodes = response.data.data;
    
    // Get or create POP
    let pop = await prisma.pop.findFirst();
    if (!pop) {
      pop = await prisma.pop.create({
        data: {
          name: 'Default POP',
          city: 'Mumbai',
          country: 'IN',
          active: true
        }
      });
      console.log('Created default POP');
    }
    
    for (const node of nodes) {
      const existingNode = await prisma.node.findFirst({
        where: { hostname: node.node }
      });
      
      if (!existingNode) {
        await prisma.node.create({
          data: {
            hostname: node.node,
            pop_id: pop.id,
            api_url: `https://${node.node}:8006`,
            api_token_id: tokenId || '',
            api_token_secret: tokenSecret || '',
            max_vcpu: node.maxcpu || 64,
            max_ram_gb: (node.maxmem || 0) / 1024 / 1024 / 1024,
            max_storage_gb: (node.maxdisk || 0) / 1024 / 1024 / 1024,
            status: 'active',
            ip_address: node.ip || 'unknown'
          }
        });
        console.log(`Restored node: ${node.node}`);
      } else {
        console.log(`Node already exists: ${node.node}`);
      }
    }
    
    console.log('Node restoration completed!');
  } catch (error) {
    console.error('Error restoring nodes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreNodes();
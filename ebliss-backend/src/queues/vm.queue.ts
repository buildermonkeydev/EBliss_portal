import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('vm-queue')
@Injectable()
export class VMQueue extends WorkerHost {
  private readonly logger = new Logger(VMQueue.name);

  constructor(
    private prisma: PrismaService,
    private proxmoxService: ProxmoxService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    switch (job.name) {
      case 'start-vm':
        return this.startVM(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async startVM(data: { vmId: number; nodeId: number; vmid: number }) {
  this.logger.log(`Starting VM ${data.vmId} on node ${data.nodeId}`);

  try {
    const node = await this.prisma.node.findUnique({
      where: { id: data.nodeId },
    });

    if (!node) {
      throw new Error('Node not found');
    }

    //  Start VM in Proxmox
    await this.proxmoxService.startVM(node.hostname, data.vmid);

    //  Update VM status
    await this.prisma.vM.update({
      where: { id: data.vmId },
      data: { status: 'running' },
    });

    this.eventEmitter.emit('vm.created', {
      vmId: data.vmId,
      vmid: data.vmid,
    });

    this.logger.log(`VM ${data.vmId} started successfully`);
  } catch (error) {
    this.logger.error(`Failed to start VM ${data.vmId}: ${error.message}`);

    await this.prisma.vM.update({
      where: { id: data.vmId },
      data: { status: 'failed' },
    });
  }
}
}
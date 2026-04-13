import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Pop } from './pop.entity';
import { VM } from './vm.entity';

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pop_id: number;

  @Column()
  hostname: string;

  @Column()
  api_url: string;

  @Column()
  api_token: string;

  @Column()
  max_vcpu: number;

  @Column()
  max_ram_gb: number;

  @Column({ default: 'active' })
  status: string;

  @ManyToOne(() => Pop, pop => pop.nodes)
  @JoinColumn({ name: 'pop_id' })
  pop: Pop;

  @OneToMany(() => VM, vm => vm.node)
  vms: VM[];
}
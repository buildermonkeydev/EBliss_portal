import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Node } from './node.entity';
import { IPAddress } from './ip-address.entity';

@Entity('pops')
export class Pop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Node, node => node.pop)
  nodes: Node[];

  @OneToMany(() => IPAddress, ip => ip.pop)
  ip_addresses: IPAddress[];
}